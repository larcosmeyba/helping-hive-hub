import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { GeneratedMealPlan } from "@/types/mealPlan";

export function useMealEngine() {
  const [loading, setLoading] = useState(false);
  const [mealPlan, setMealPlan] = useState<GeneratedMealPlan | null>(null);
  const { toast } = useToast();

  const generate = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        method: "POST",
        body: {},
      });

      if (error) {
        throw new Error(error.message || "Failed to generate meal plan");
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      setMealPlan(data as GeneratedMealPlan);
      toast({ title: "Meal plan generated!", description: "Your personalized weekly plan is ready." });
      return data as GeneratedMealPlan;
    } catch (err: any) {
      const msg = err?.message || "Failed to generate meal plan";
      toast({ title: "Error", description: msg, variant: "destructive" });
      throw err;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return { generate, loading, mealPlan, setMealPlan };
}
