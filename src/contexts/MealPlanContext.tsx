import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { GeneratedMealPlan } from "@/types/mealPlan";
import type { Database } from "@/integrations/supabase/types";
import { trackEvent } from "@/lib/analytics";
import { phIsFeatureEnabled } from "@/lib/posthog";

export interface MealPlanHistoryEntry {
  id: string;
  weekStart: string;
  createdAt: string;
  totalEstimatedCost: number | null;
  plan: GeneratedMealPlan;
}

type GenerationStage = "idle" | "preparing" | "generating" | "saving" | "done";
type GenerationJobRow = Database["public"]["Tables"]["meal_plan_generation_jobs"]["Row"];

interface GenerationStatus {
  jobId: string | null;
  currentStep: string | null;
  completedSteps: string[];
  statusMessage: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  fallbackUsed: boolean;
}

interface MealPlanContextType {
  mealPlan: GeneratedMealPlan | null;
  setMealPlan: (plan: GeneratedMealPlan | null) => void;
  loading: boolean;
  generating: boolean;
  generationStage: GenerationStage;
  generationStatus: GenerationStatus;
  generate: (opts?: { pricingMode?: "kroger" | "estimated" }) => Promise<void>;
  history: MealPlanHistoryEntry[];
  historyLoading: boolean;
  loadHistory: () => Promise<void>;
}

const MealPlanContext = createContext<MealPlanContextType | undefined>(undefined);
const STORAGE_KEY = "hive_meal_plan";

const EMPTY_GENERATION_STATUS: GenerationStatus = {
  jobId: null,
  currentStep: null,
  completedSteps: [],
  statusMessage: null,
  errorCode: null,
  errorMessage: null,
  fallbackUsed: false,
};

function normalizeGenerationStage(stage: string | null | undefined): GenerationStage {
  if (stage === "preparing" || stage === "generating" || stage === "saving" || stage === "done") return stage;
  return "preparing";
}

export function MealPlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mealPlan, setMealPlan] = useState<GeneratedMealPlan | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<GenerationStage>("idle");
  const [generationStatus, setGenerationStatus] = useState<GenerationStatus>(EMPTY_GENERATION_STATUS);
  const [history, setHistory] = useState<MealPlanHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!mealPlan) return;
    if (generationStatus.fallbackUsed) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(mealPlan));
  }, [mealPlan, generationStatus.fallbackUsed]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadSavedPlan = async () => {
      try {
        const { data, error } = await supabase
          .from("meal_plans")
          .select("plan_data")
          .eq("user_id", user.id)
          .eq("status", "active")
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!error && data?.plan_data) {
          const savedPlan = data.plan_data as unknown as GeneratedMealPlan;
          if (savedPlan?.weeklyPlan) setMealPlan(savedPlan);
        }
      } catch (err) {
        console.error("Failed to load saved meal plan:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSavedPlan();
  }, [user]);

  const applyGenerationJob = useCallback((job: GenerationJobRow | null) => {
    if (!job) return;
    setGenerationStage(normalizeGenerationStage(job.current_stage));
    setGenerationStatus({
      jobId: job.id,
      currentStep: job.current_step,
      completedSteps: job.completed_steps ?? [],
      statusMessage: job.status_message,
      errorCode: job.error_code,
      errorMessage: job.error_message,
      fallbackUsed: job.fallback_used,
    });
  }, []);

  const fetchLatestGenerationJob = useCallback(async (startedAfter?: string) => {
    if (!user) return null;
    const baseQuery = supabase
      .from("meal_plan_generation_jobs")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1);

    const result = startedAfter
      ? await baseQuery.gte("started_at", startedAfter).maybeSingle()
      : await baseQuery.maybeSingle();

    if (result.error) throw result.error;
    if (result.data) applyGenerationJob(result.data);
    return result.data;
  }, [applyGenerationJob, user]);

  const loadHistory = useCallback(async () => {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from("meal_plans")
        .select("id, week_start, created_at, total_estimated_cost, plan_data")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(12);

      if (!error && data) {
        setHistory(
          data
            .filter((row) => row.plan_data)
            .map((row) => ({
              id: row.id,
              weekStart: row.week_start,
              createdAt: row.created_at,
              totalEstimatedCost: row.total_estimated_cost,
              plan: row.plan_data as unknown as GeneratedMealPlan,
            })),
        );
      }
    } catch (err) {
      console.error("Failed to load meal plan history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  const generate = useCallback(async (opts?: { pricingMode?: "kroger" | "estimated" }) => {
    if (!user) return;

    const startedAt = new Date().toISOString();
    let latestJob: GenerationJobRow | null = null;
    let pollHandle: ReturnType<typeof setInterval> | null = null;
    let stopped = false;
    let generationFailed = false;

    const stopPolling = () => {
      stopped = true;
      if (pollHandle) clearInterval(pollHandle);
      pollHandle = null;
    };

    const pollJob = async () => {
      if (stopped) return latestJob;
      try {
        latestJob = await fetchLatestGenerationJob(startedAt);
        if (latestJob?.status && latestJob.status !== "processing" && latestJob.status !== "queued") {
          stopPolling();
        }
      } catch (err) {
        console.warn("[MealPlan] generation job polling failed", err);
      }
      return latestJob;
    };

    setGenerating(true);
    setGenerationStage("preparing");
    setGenerationStatus(EMPTY_GENERATION_STATUS);

    const algorithmVersion = phIsFeatureEnabled("new-meal-plan-algorithm") === true ? "algo_v2" : "hybrid_v1";
    void trackEvent("meal_plan_generation_started", {
      pricingMode: opts?.pricingMode ?? null,
      algorithmVersion,
      algorithm_version: algorithmVersion,
    });

    try {
      await pollJob();
      pollHandle = setInterval(() => {
        void pollJob();
      }, 1200);

      const body: Record<string, unknown> = {
        algorithmVersion,
        overrides: { algorithmVersion },
      };
      if (opts?.pricingMode) body.pricingMode = opts.pricingMode;
      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        method: "POST",
        body,
      });

      await pollJob();

      if (error) {
        // Friendly handling of the 3/hour rate limit on this very expensive
        // endpoint (each call runs OpenAI + live Kroger product searches).
        const ctx: any = (error as any).context;
        let rateLimitedMsg: string | null = null;
        try {
          const status = ctx?.status ?? (error as any).status;
          if (status === 429) {
            const body = typeof ctx?.body === "string" ? JSON.parse(ctx.body) : ctx?.body;
            rateLimitedMsg = body?.message
              ?? "You've reached the limit of 3 meal-plan generations per hour. Please try again soon.";
          }
        } catch { /* ignore parse errors */ }
        if (rateLimitedMsg) {
          toast({
            title: "Regeneration limit reached",
            description: rateLimitedMsg,
            variant: "destructive",
          });
          setGenerationStage("idle");
          setGenerationStatus((prev) => ({
            ...prev,
            errorCode: "rate_limited",
            errorMessage: rateLimitedMsg!,
            statusMessage: rateLimitedMsg!,
          }));
          void trackEvent("meal_plan_generation_failed", { reason: "rate_limited", algorithmVersion });
          return;
        }
        throw new Error(latestJob?.error_message || error.message);
      }
      // Validation gates: server returns 200 with a structured error rather
      // than saving a plan that fails budget or kid-friendly checks.
      const errCode = (data as any)?.error_code;
      if (data && (data as any).ok === false && (errCode === "budget_unfit" || errCode === "kid_friendly_unfit")) {
        const defaultMsg = errCode === "kid_friendly_unfit"
          ? "We couldn't find enough kid-friendly meals for your family this week. Try broadening your dietary preferences or increasing your budget."
          : "We couldn't build a meal plan within your budget yet. Try increasing your budget, reducing meal variety, or using more pantry items.";
        const msg = (data as any).error || defaultMsg;
        const title = errCode === "kid_friendly_unfit" ? "Not enough kid-friendly meals" : "Budget too tight";
        toast({ title, description: msg, variant: "destructive" });
        setGenerationStage("idle");
        setGenerationStatus((prev) => ({
          ...prev,
          errorCode: errCode,
          errorMessage: msg,
          statusMessage: msg,
        }));
        void trackEvent("meal_plan_generation_failed", { reason: errCode, algorithmVersion });
        return;
      }
      if (data?.error) {
        throw new Error(data.error);
      }
      if (!data || typeof data !== "object" || !Array.isArray((data as any).weeklyPlan)) {
        throw new Error("Meal plan response was incomplete. Please try again.");
      }

      setMealPlan(data as GeneratedMealPlan);
      setGenerationStage("done");
      setGenerationStatus((prev) => ({
        ...prev,
        fallbackUsed: Boolean((data as any).fallback),
        errorCode: (data as any).error_code ?? prev.errorCode,
        errorMessage: (data as any).error_message ?? prev.errorMessage,
        statusMessage: (data as any).fallback ? "Showing fallback meal plan" : "Your meal plan is ready",
      }));
      // Phase A (Part N): emit the new PostHog events using server-returned
      // event_data. All events carry algorithm_version. trackEvent honors
      // analytics opt-out and falls back gracefully when no event_data.
      const ed = (data as any).event_data ?? null;
      const meta: Record<string, any> = {
        pricingMode: opts?.pricingMode ?? null,
        algorithmVersion,
        algorithm_version: algorithmVersion,
        fallbackUsed: Boolean((data as any).fallback),
        itemCount: Array.isArray((data as any).groceryList) ? (data as any).groceryList.length : null,
      };
      void trackEvent("meal_plan_generated", meta);
      void trackEvent("meal_plan_generated_successfully", meta);
      if (ed) {
        void trackEvent("recipe_candidates_filtered", {
          algorithm_version: algorithmVersion,
          ...ed.candidates_filtered,
        });
        if (ed.kroger_match) {
          void trackEvent("kroger_price_match_completed", {
            algorithm_version: algorithmVersion,
            ...ed.kroger_match,
          });
        }
        if (ed.swaps_made && ed.swaps_made > 0) {
          void trackEvent("meal_plan_over_budget_corrected", {
            algorithm_version: algorithmVersion,
            swaps: ed.swaps_made,
            delivered_total: ed.budget?.delivered_total,
            weekly: ed.budget?.weekly,
          });
        }
        void trackEvent("grocery_list_generated", {
          algorithm_version: algorithmVersion,
          items: ed.grocery_items,
          pantry_utilization_pct: ed.pantry_utilization_pct,
        });
        void trackEvent("meal_plan_validation_passed", {
          algorithm_version: algorithmVersion,
        });
      }

      if ((data as any).fallback) {
        toast({
          title: "Showing fallback meal plan",
          description: (data as any).notice || "We loaded a sample plan so you are not stuck.",
        });
      } else {
        toast({ title: "Meal plan generated!", description: "Your personalized weekly plan is ready." });
        loadHistory();
        supabase.from("notifications").insert({
          user_id: user.id,
          type: "meal_plan_ready",
          title: "Your weekly meal plan is ready",
          body: "Tap to view your meals and grocery list.",
          link: "/dashboard/meal-plan",
        }).then(({ error: notifErr }) => {
          if (notifErr) console.warn("[MealPlan] notification insert failed", notifErr);
        });
      }
    } catch (err: any) {
      generationFailed = true;
      await pollJob();
      setGenerationStatus((prev) => ({
        ...prev,
        errorCode: latestJob?.error_code ?? prev.errorCode,
        errorMessage: latestJob?.error_message ?? err?.message ?? "Failed to generate meal plan",
        statusMessage: latestJob?.status_message ?? prev.statusMessage,
      }));
      toast({
        title: "Meal plan generation failed",
        description: latestJob?.error_message ?? err?.message ?? "Failed to generate meal plan",
        variant: "destructive",
      });
      void trackEvent("meal_plan_generation_failed", {
        reason: latestJob?.error_code ?? "error",
        algorithmVersion,
      });
      setGenerationStage(latestJob ? normalizeGenerationStage(latestJob.current_stage) : "idle");
    } finally {
      stopPolling();
      setGenerating(false);
      setTimeout(() => {
        if (!generationFailed) {
          setGenerationStage((prev) => (prev === "done" ? prev : "idle"));
        }
      }, 1200);
    }
  }, [fetchLatestGenerationJob, loadHistory, toast, user]);

  return (
    <MealPlanContext.Provider
      value={{
        mealPlan,
        setMealPlan,
        loading,
        generating,
        generationStage,
        generationStatus,
        generate,
        history,
        historyLoading,
        loadHistory,
      }}
    >
      {children}
    </MealPlanContext.Provider>
  );
}

export function useMealPlan() {
  const ctx = useContext(MealPlanContext);
  if (!ctx) throw new Error("useMealPlan must be inside MealPlanProvider");
  return ctx;
}
