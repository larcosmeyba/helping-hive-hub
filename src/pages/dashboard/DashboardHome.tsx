import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { CalendarDays, DollarSign, ShoppingCart, TrendingDown, Utensils, Loader2, Sparkles, Refrigerator } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { EditableProfileFields } from "@/components/dashboard/EditableProfileFields";
import { MealCard } from "@/components/dashboard/MealCard";
import { ExtraRecipes } from "@/components/dashboard/ExtraRecipes";
import { CookFromFridge } from "@/components/dashboard/CookFromFridge";

export default function DashboardHome() {
  const { user } = useAuth();
  const { mealPlan, generating, generate } = useMealPlan();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user!.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const budget = profile?.weekly_budget ?? 75;
  const estimatedCost = mealPlan?.totalEstimatedCost ?? 0;
  const pantrySavings = mealPlan?.pantrySavings ?? 0;
  const costPerMeal = mealPlan?.costPerMeal ?? 0;

  const refreshProfile = () => queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });

  return (
    <div className="max-w-6xl mx-auto space-y-5 md:space-y-8">
      {/* Welcome + Editable Fields */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="font-display text-xl md:text-3xl font-bold text-foreground">
              Welcome back, {profile?.display_name ?? "there"} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">Your weekly meal plan overview</p>
          </div>
          <Button
            onClick={generate}
            disabled={generating}
            className="bg-gradient-honey text-primary-foreground hover:opacity-90 w-full sm:w-auto"
            size="sm"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> {mealPlan ? "Regenerate Plan" : "Generate Meal Plan"}</>
            )}
          </Button>
        </div>
        <EditableProfileFields
          zipCode={profile?.zip_code ?? null}
          weeklyBudget={profile?.weekly_budget ?? null}
          onUpdate={refreshProfile}
        />
      </div>

      {/* Quick Fridge Access Tab */}
      <Link
        to="/dashboard/pantry"
        className="flex items-center gap-3 bg-gradient-to-r from-accent/10 to-primary/10 border border-accent/20 rounded-xl p-3 md:p-4 hover:border-accent/40 transition-all group"
      >
        <div className="bg-accent/15 rounded-lg p-2 group-hover:bg-accent/25 transition-colors">
          <Refrigerator className="w-5 h-5 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">Add groceries you have in your fridge</p>
          <p className="text-xs text-muted-foreground">Track what's in stock, low, or out — your AI plans use this</p>
        </div>
        <span className="text-xs text-accent font-medium shrink-0">Open →</span>
      </Link>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        {[
          { label: "Weekly Budget", value: `$${budget}`, icon: DollarSign, color: "text-primary" },
          { label: "Estimated Cost", value: `$${estimatedCost.toFixed(2)}`, icon: ShoppingCart, color: "text-accent" },
          { label: "Pantry Savings", value: `$${pantrySavings.toFixed(2)}`, icon: TrendingDown, color: "text-accent" },
          { label: "Cost per Meal", value: `$${costPerMeal.toFixed(2)}`, icon: Utensils, color: "text-primary" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-3 md:p-4 shadow-card">
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon className={`w-3.5 h-3.5 md:w-4 md:h-4 ${stat.color}`} />
              <span className="text-[10px] md:text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-lg md:text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* This Week's Meals */}
      {!mealPlan ? (
        <div className="bg-card rounded-2xl border border-border p-8 md:p-12 text-center shadow-card">
          <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-primary mx-auto mb-3" />
          <h2 className="font-display text-lg md:text-xl font-semibold text-foreground mb-2">No Meal Plan Yet</h2>
          <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
            Tap "Generate Meal Plan" to create your personalized weekly plan based on your budget and preferences.
          </p>
          <Button onClick={generate} disabled={generating} className="bg-gradient-honey text-primary-foreground hover:opacity-90 w-full sm:w-auto">
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Meal Plan</>}
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-base md:text-xl font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="w-4 h-4 md:w-5 md:h-5 text-primary" /> This Week's Meals
            </h2>
            <Link to="/dashboard/meal-plan" className="text-xs md:text-sm text-primary hover:underline font-medium">View Full Plan →</Link>
          </div>
          {mealPlan.weeklyPlan.map((day) => (
            <div key={day.day} className="mb-4 md:mb-6">
              <h3 className="text-xs md:text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] md:text-xs font-bold">{day.day}</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 md:gap-3">
                {day.meals.map((meal, i) => (
                  <MealCard key={`${day.day}-${i}`} meal={meal} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cook From Your Fridge */}
      <CookFromFridge />

      {/* Extra Recipes */}
      <ExtraRecipes />

    </div>
  );
}
