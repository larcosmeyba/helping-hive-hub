import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { CalendarDays, DollarSign, ShoppingCart, TrendingDown, Loader2, Sparkles, Refrigerator } from "lucide-react";
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

  const refreshProfile = () => queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });

  return (
    <div className="max-w-6xl mx-auto space-y-3 md:space-y-6">
      {/* Welcome */}
      <div className="space-y-2">
        <div>
          <h1 className="font-display text-lg md:text-3xl font-bold text-foreground leading-tight">
            Welcome back, {profile?.display_name ?? "there"} 👋
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground">Your weekly meal plan overview</p>
        </div>

        <EditableProfileFields
          zipCode={profile?.zip_code ?? null}
          weeklyBudget={profile?.weekly_budget ?? null}
          onUpdate={refreshProfile}
        />

        <Button
          onClick={generate}
          disabled={generating}
          className="bg-gradient-honey text-primary-foreground hover:opacity-90 w-full sm:w-auto h-9 text-xs md:text-sm"
        >
          {generating ? (
            <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> {mealPlan ? "Regenerate Plan" : "Generate Meal Plan"}</>
          )}
        </Button>
      </div>

      {/* Stats Grid — 4 compact cards */}
      <div className="grid grid-cols-4 gap-1.5 md:gap-4">
        {[
          { label: "Budget", value: `$${budget}`, icon: DollarSign, color: "text-primary" },
          { label: "Est. Cost", value: `$${estimatedCost.toFixed(0)}`, icon: ShoppingCart, color: "text-accent" },
          { label: "Savings", value: `$${pantrySavings.toFixed(0)}`, icon: TrendingDown, color: "text-accent" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-lg border border-border p-2 md:p-4 shadow-card">
            <div className="flex items-center gap-1 mb-0.5">
              <stat.icon className={`w-3 h-3 md:w-4 md:h-4 ${stat.color}`} />
              <span className="text-[9px] md:text-xs text-muted-foreground truncate">{stat.label}</span>
            </div>
            <p className="text-sm md:text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}

        {/* Fridge card */}
        <Link
          to="/dashboard/pantry"
          className="group relative overflow-hidden bg-gradient-to-br from-accent/10 to-primary/10 rounded-lg border border-accent/20 p-2 md:p-4 shadow-card hover:shadow-lg hover:border-accent/40 transition-all duration-300"
        >
          <div className="flex items-center gap-1 mb-0.5">
            <Refrigerator className="w-3 h-3 md:w-4 md:h-4 text-accent" />
            <span className="text-[9px] md:text-xs text-muted-foreground truncate">Fridge</span>
          </div>
          <p className="text-[11px] md:text-base font-bold text-foreground leading-tight">Add Items</p>
          <span className="text-[8px] md:text-[10px] text-accent font-medium">Tap →</span>
        </Link>
      </div>

      {/* This Week's Meals */}
      {!mealPlan ? (
        <div className="bg-card rounded-xl border border-border p-6 md:p-12 text-center shadow-card">
          <Sparkles className="w-8 h-8 md:w-12 md:h-12 text-primary mx-auto mb-2" />
          <h2 className="font-display text-base md:text-xl font-semibold text-foreground mb-1.5">No Meal Plan Yet</h2>
          <p className="text-xs md:text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Tap "Generate Meal Plan" to create your personalized weekly plan.
          </p>
          <Button onClick={generate} disabled={generating} className="bg-gradient-honey text-primary-foreground hover:opacity-90 w-full sm:w-auto h-9 text-xs">
            {generating ? <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Generating...</> : <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Generate Meal Plan</>}
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display text-sm md:text-xl font-semibold text-foreground flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-primary" /> This Week's Meals
            </h2>
            <Link to="/dashboard/meal-plan" className="text-[10px] md:text-sm text-primary hover:underline font-medium">Full Plan →</Link>
          </div>
          {mealPlan.weeklyPlan.slice(0, 2).map((day) => (
            <div key={day.day} className="mb-3 md:mb-6">
              <h3 className="text-[10px] md:text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1.5">
                <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded-full text-[9px] md:text-xs font-bold">{day.day}</span>
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-1.5 md:gap-3">
                {day.meals.map((meal, i) => (
                  <MealCard key={`${day.day}-${i}`} meal={meal} compact />
                ))}
              </div>
            </div>
          ))}
          <Link
            to="/dashboard/meal-plan"
            className="block text-center bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-lg py-2.5 text-xs md:text-sm font-semibold text-primary transition-colors"
          >
            View Full Plan — {mealPlan.weeklyPlan.length - 2} more days →
          </Link>
        </div>
      )}

      {/* Fridge Chef */}
      <CookFromFridge />

      {/* Extra Recipes */}
      <ExtraRecipes />
    </div>
  );
}
