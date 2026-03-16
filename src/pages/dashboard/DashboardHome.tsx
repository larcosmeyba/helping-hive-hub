import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { CalendarDays, DollarSign, ShoppingCart, Package, TrendingDown, Utensils, Loader2, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export default function DashboardHome() {
  const { user } = useAuth();
  const { mealPlan, generating, generate } = useMealPlan();

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

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Welcome back, {profile?.display_name ?? "there"} 👋
          </h1>
          <p className="text-muted-foreground mt-1">Here's your weekly meal plan overview</p>
        </div>
        <Button
          onClick={generate}
          disabled={generating}
          className="bg-gradient-honey text-primary-foreground hover:opacity-90"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" /> {mealPlan ? "Regenerate Plan" : "Generate Meal Plan"}</>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Weekly Budget", value: `$${budget}`, icon: DollarSign, color: "text-primary" },
          { label: "Estimated Cost", value: `$${estimatedCost.toFixed(2)}`, icon: ShoppingCart, color: "text-accent" },
          { label: "Pantry Savings", value: `$${pantrySavings.toFixed(2)}`, icon: TrendingDown, color: "text-accent" },
          { label: "Cost per Meal", value: `$${costPerMeal.toFixed(2)}`, icon: Utensils, color: "text-primary" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Weekly Meal Plan */}
      {!mealPlan ? (
        <div className="bg-card rounded-2xl border border-border p-12 text-center shadow-card">
          <Sparkles className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="font-display text-xl font-semibold text-foreground mb-2">No Meal Plan Yet</h2>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Click "Generate Meal Plan" to create your personalized weekly plan based on your budget, household size, and preferences.
          </p>
          <Button onClick={generate} disabled={generating} className="bg-gradient-honey text-primary-foreground hover:opacity-90">
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Meal Plan</>}
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> This Week's Meals
            </h2>
            <Link to="/dashboard/meal-plan" className="text-sm text-primary hover:underline font-medium">View Full Plan →</Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {mealPlan.weeklyPlan.map((day) => (
              <div key={day.day} className="bg-card rounded-xl border border-border p-3 shadow-card">
                <h3 className="text-sm font-semibold text-foreground mb-2">{day.day}</h3>
                <div className="space-y-1.5">
                  {day.meals.map((meal, i) => (
                    <div key={i} className="text-xs">
                      <p className="text-foreground font-medium truncate">{meal.name}</p>
                      <p className="text-muted-foreground">{meal.calories} cal</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/dashboard/grocery-list" className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-elevated transition-shadow group">
          <ShoppingCart className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold text-foreground">Grocery List</h3>
          <p className="text-sm text-muted-foreground">View & print your shopping list</p>
        </Link>
        <Link to="/dashboard/pantry" className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-elevated transition-shadow group">
          <Package className="w-6 h-6 text-accent mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold text-foreground">Pantry</h3>
          <p className="text-sm text-muted-foreground">Track what you already have</p>
        </Link>
        <Link to="/dashboard/recipes" className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-elevated transition-shadow group">
          <Utensils className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold text-foreground">Recipes</h3>
          <p className="text-sm text-muted-foreground">Browse budget-friendly meals</p>
        </Link>
      </div>
    </div>
  );
}
