import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { CheckCircle2, Loader2 } from "lucide-react";

const STAGES: Array<{ key: string; label: string }> = [
  { key: "preparing", label: "Reviewing your profile & pantry" },
  { key: "generating", label: "Building your weekly meal plan" },
  { key: "saving", label: "Pricing your grocery list" },
  { key: "done", label: "Finalizing your plan" },
];

const ORDER = ["preparing", "generating", "saving", "done"];

export default function MealPlanGeneratingPage() {
  const navigate = useNavigate();
  const { generationStage, generationStatus, mealPlan, generating } = useMealPlan();

  useEffect(() => {
    // If user lands here without an active generation and no plan, send to setup
    if (!generating && generationStage === "idle" && !mealPlan) {
      navigate("/dashboard/meal-plan/setup", { replace: true });
    }
  }, [generating, generationStage, mealPlan, navigate]);

  useEffect(() => {
    if (generationStage === "done" && mealPlan) {
      const t = setTimeout(() => navigate("/dashboard/meal-plan/why", { replace: true }), 500);
      return () => clearTimeout(t);
    }
  }, [generationStage, mealPlan, navigate]);

  useEffect(() => {
    if (!generating && generationStage === "idle" && generationStatus.errorMessage && !mealPlan) {
      navigate("/dashboard/meal-plan/setup", { replace: true });
    }
  }, [generationStage, generationStatus.errorMessage, generating, mealPlan, navigate]);

  const activeIdx = Math.max(0, ORDER.indexOf(generationStage));
  const failureMessage = !generating && generationStage !== "done" ? generationStatus.errorMessage : null;

  return (
    <div className="w-full max-w-3xl mx-auto -mx-4 px-4 pb-6 min-h-full bg-white flex flex-col">
      <div className="flex-1 flex flex-col items-center justify-center text-center pt-12">
        <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mb-6">
          <Loader2 className="w-10 h-10 text-primary animate-spin" />
        </div>
        <h1 className="text-[22px] font-extrabold text-foreground mb-2">Building your weekly meal plan…</h1>
        <p className="text-[14px] text-muted-foreground max-w-xs mb-8">
          We're matching meals to your budget, pantry, and preferences.
        </p>

        <div className="w-full max-w-sm space-y-3">
          {STAGES.map((s, i) => {
            const done = i < activeIdx || generationStage === "done";
            const active = i === activeIdx && !done;
            return (
              <div
                key={s.key}
                className={`flex items-center gap-3 bg-card rounded-xl p-3 border ${
                  active ? "border-primary" : "border-border"
                }`}
              >
                {done ? (
                  <CheckCircle2 className="w-5 h-5 text-accent shrink-0" />
                ) : active ? (
                  <Loader2 className="w-5 h-5 text-primary animate-spin shrink-0" />
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-border shrink-0" />
                )}
                <span className={`text-[14px] ${done ? "text-foreground" : active ? "text-foreground font-semibold" : "text-muted-foreground"}`}>
                  {s.label}
                </span>
              </div>
            );
          })}

          {generationStatus.currentStep && (
            <p className="text-[12px] text-muted-foreground pt-2">{generationStatus.currentStep}</p>
          )}

          {failureMessage && (
            <div className="rounded-xl border border-destructive bg-card px-4 py-3 text-left">
              <p className="text-[13px] font-semibold text-destructive">Meal plan generation failed</p>
              <p className="text-[12px] text-destructive mt-1">{failureMessage}</p>
            </div>
          )}

          {generationStatus.fallbackUsed && (
            <div className="rounded-xl border border-primary/40 bg-card px-4 py-3 text-left">
              <p className="text-[13px] font-semibold text-foreground">Showing fallback meal plan</p>
              <p className="text-[12px] text-muted-foreground mt-1">We loaded a sample plan so you’re not stuck while the full generator retries next time.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
