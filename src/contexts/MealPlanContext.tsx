import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { GeneratedMealPlan } from "@/types/mealPlan";

export interface MealPlanHistoryEntry {
  id: string;
  weekStart: string;
  createdAt: string;
  totalEstimatedCost: number | null;
  plan: GeneratedMealPlan;
}

type GenerationStage = "idle" | "preparing" | "generating" | "saving" | "done";

interface MealPlanContextType {
  mealPlan: GeneratedMealPlan | null;
  setMealPlan: (plan: GeneratedMealPlan | null) => void;
  loading: boolean;
  generating: boolean;
  generationStage: GenerationStage;
  generate: () => Promise<void>;
  history: MealPlanHistoryEntry[];
  historyLoading: boolean;
  loadHistory: () => Promise<void>;
}

const MealPlanContext = createContext<MealPlanContextType | undefined>(undefined);

const STORAGE_KEY = "hive_meal_plan";

export function MealPlanProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mealPlan, setMealPlan] = useState<GeneratedMealPlan | null>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generationStage, setGenerationStage] = useState<GenerationStage>("idle");
  const [history, setHistory] = useState<MealPlanHistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Persist to localStorage for quick reloads
  useEffect(() => {
    if (mealPlan) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mealPlan));
    }
  }, [mealPlan]);

  // Load saved meal plan from database on mount
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
          if (savedPlan?.weeklyPlan) {
            setMealPlan(savedPlan);
          }
        }
      } catch (err) {
        console.error("Failed to load saved meal plan:", err);
      } finally {
        setLoading(false);
      }
    };

    loadSavedPlan();
  }, [user]);

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
            }))
        );
      }
    } catch (err) {
      console.error("Failed to load meal plan history:", err);
    } finally {
      setHistoryLoading(false);
    }
  }, [user]);

  const generate = useCallback(async () => {
    if (!user) return;
    setGenerating(true);
    setGenerationStage("preparing");
    try {
      // Brief delay so "preparing" is visible
      await new Promise(r => setTimeout(r, 300));
      setGenerationStage("generating");
      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        method: "POST",
        body: {},
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setGenerationStage("saving");
      setMealPlan(data as GeneratedMealPlan);
      setGenerationStage("done");
      toast({ title: "Meal plan generated!", description: "Your personalized weekly plan is ready." });
      loadHistory();
      // In-app notification
      supabase.from("notifications").insert({
        user_id: user.id,
        type: "meal_plan_ready",
        title: "Your weekly meal plan is ready",
        body: "Tap to view your meals and grocery list.",
        link: "/dashboard/meal-plan",
      }).then(() => {});
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to generate meal plan", variant: "destructive" });
    } finally {
      setGenerating(false);
      setTimeout(() => setGenerationStage("idle"), 500);
    }
  }, [user, toast, loadHistory]);

  return (
    <MealPlanContext.Provider value={{ mealPlan, setMealPlan, loading, generating, generationStage, generate, history, historyLoading, loadHistory }}>
      {children}
    </MealPlanContext.Provider>
  );
}

export function useMealPlan() {
  const ctx = useContext(MealPlanContext);
  if (!ctx) throw new Error("useMealPlan must be inside MealPlanProvider");
  return ctx;
}
