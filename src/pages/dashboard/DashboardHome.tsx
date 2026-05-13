import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { SummaryCards } from "@/components/dashboard/home/SummaryCards";
import { YourHubGrid } from "@/components/dashboard/home/YourHubGrid";
import { WeeklyProgress } from "@/components/dashboard/home/WeeklyProgress";
import { SnapTracker } from "@/components/dashboard/SnapTracker";

export default function DashboardHome() {
  const { profile } = useAuth();
  const { mealPlan } = useMealPlan();
  const navigate = useNavigate();

  useEffect(() => {
    if (profile && profile.questionnaire_completed === false) {
      navigate("/questionnaire", { replace: true });
    }
  }, [profile?.questionnaire_completed, navigate, profile]);

  const firstName = profile?.display_name?.trim().split(/\s+/)[0] ?? "there";
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const budget = profile?.weekly_budget ?? 75;
  const spent = mealPlan?.totalEstimatedCost ?? 0;
  const saved = Math.max(0, budget - spent);
  const mealsCount = mealPlan?.weeklyPlan.reduce((acc, d) => acc + d.meals.length, 0) ?? 0;
  const costPerMeal = mealPlan?.costPerMeal ?? 0;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5 pb-6">
      {/* Greeting */}
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground leading-tight">
          {greeting}, {firstName} <span aria-hidden>👋</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Meals that fit your budget. At the store you already shop at.
        </p>
      </div>

      {/* 4 Summary cards */}
      <SummaryCards
        zip={profile?.zip_code ?? ""}
        city={(profile?.city as string | undefined) ?? undefined}
        budget={budget}
        household={profile?.household_size ?? 1}
        saved={saved}
      />

      {/* Your Hub */}
      <YourHubGrid />

      {/* Weekly Progress */}
      <WeeklyProgress budget={budget} spent={spent} mealsCooked={mealsCount} costPerMeal={costPerMeal} />

      {/* SNAP tracker (kept for SNAP users) */}
      {(profile?.snap_status || profile?.food_assistance_status === "snap") && <SnapTracker />}
    </div>
  );
}
