import React, { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { GeneratedMealPlan } from "@/types/mealPlan";

interface MealPlanContextType {
  mealPlan: GeneratedMealPlan | null;
  loading: boolean;
  generating: boolean;
  generate: () => Promise<void>;
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
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);

  // Persist to localStorage for quick reloads
  useEffect(() => {
    if (mealPlan) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(mealPlan));
    }
  }, [mealPlan]);

  const generate = useCallback(async () => {
    if (!user) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-meal-plan", {
        method: "POST",
        body: {},
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setMealPlan(data as GeneratedMealPlan);
      toast({ title: "Meal plan generated!", description: "Your personalized weekly plan is ready." });
    } catch (err: any) {
      toast({ title: "Error", description: err?.message || "Failed to generate meal plan", variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  }, [user, toast]);

  return (
    <MealPlanContext.Provider value={{ mealPlan, loading, generating, generate }}>
      {children}
    </MealPlanContext.Provider>
  );
}

export function useMealPlan() {
  const ctx = useContext(MealPlanContext);
  if (!ctx) throw new Error("useMealPlan must be inside MealPlanProvider");
  return ctx;
}
