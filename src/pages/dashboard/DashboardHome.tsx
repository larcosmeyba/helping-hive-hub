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
    <div className="max-w-6xl mx-auto space-y-3 md:space-y-6 overflow-x-hidden px-2 md:px-0">
      {/* Welcome */}
      <div className="space-y-1.5">
        <div>
          <h1 className="font-display text-base md:text-3xl font-bold text-foreground leading-tight">
            Welcome back, {profile?.display_name ?? "there"} 👋
          </h1>
          <p className="text-[10px] md:text-sm text-muted-foreground">Your weekly meal plan overview</p>
        </div>

        <EditableProfileFields
          zipCode={profile?.zip_code ?? null}
          weeklyBudget={profile?.weekly_budget ?? null}
          onUpdate={refreshProfile}
        />

        <Button
          onClick={generate}
          disabled={generating}
          className="bg-gradient-honey text-primary-foreground hover:opacity-90 h-7 text-[10px] px-3 md:text-sm md:h-9 md:px-4 w-full max-w-[260px] md:w-auto md:max-w-none"
        >
          {generating ? (
            <><Loader2 className="w-3 h-3 mr-1 animate-spin md:w-3.5 md:h-3.5" /> Generating...</>
          ) : (
            <><Sparkles className="w-3 h-3 mr-1 md:w-3.5 md:h-3.5" /> {mealPlan ? "Regenerate Plan" : "Generate Plan"}</>
          )}
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-0.5 md:gap-4 max-w-[280px] md:max-w-none">
        {[
          { label: "Budget", value: `$${budget}`, icon: DollarSign, color: "text-primary" },
          { label: "Cost", value: `$${estimatedCost.toFixed(0)}`, icon: ShoppingCart, color: "text-accent" },
          { label: "Savings", value: `$${pantrySavings.toFixed(0)}`, icon: TrendingDown, color: "text-accent" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded border border-border p-0.5 md:p-4 shadow-card">
            <div className="flex items-center gap-0.5">
              <stat.icon className={`w-1.5 h-1.5 md:w-4 md:h-4 ${stat.color}`} />
              <span className="text-[6px] md:text-xs text-muted-foreground truncate">{stat.label}</span>
            </div>
            <p className="text-[8px] md:text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}

        <Link
          to="/dashboard/pantry"
          className="group overflow-hidden bg-gradient-to-br from-accent/10 to-primary/10 rounded border border-accent/20 p-0.5 md:p-4 shadow-card hover:shadow-lg hover:border-accent/40 transition-all duration-300"
        >
          <div className="flex items-center gap-0.5">
            <Refrigerator className="w-1.5 h-1.5 md:w-4 md:h-4 text-accent" />
            <span className="text-[6px] md:text-xs text-muted-foreground truncate">Fridge</span>
          </div>
          <p className="text-[7px] md:text-base font-bold text-foreground leading-tight">Add</p>
          <span className="text-[5px] md:text-[10px] text-accent font-medium">Tap →</span>
        </Link>
      </div>

      {/* This Week's Meals */}
      {!mealPlan ? (
        <div className="bg-card rounded-lg border border-border p-2.5 md:p-12 text-center shadow-card">
          <Sparkles className="w-5 h-5 md:w-12 md:h-12 text-primary mx-auto mb-1" />
          <h2 className="font-display text-xs md:text-xl font-semibold text-foreground mb-0.5">No Meal Plan Yet</h2>
          <p className="text-[9px] md:text-sm text-muted-foreground mb-2 max-w-md mx-auto">
            Tap "Generate Plan" to create your personalized weekly plan.
          </p>
          <Button onClick={generate} disabled={generating} className="bg-gradient-honey text-primary-foreground hover:opacity-90 w-auto h-6 text-[9px] px-2.5 md:text-sm md:h-9 md:px-4">
            {generating ? <><Loader2 className="w-2.5 h-2.5 mr-1 animate-spin" /> Generating...</> : <><Sparkles className="w-2.5 h-2.5 mr-1" /> Generate Plan</>}
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-[10px] md:text-xl font-semibold text-foreground flex items-center gap-0.5">
              <CalendarDays className="w-3 h-3 text-primary" /> This Week's Meals
            </h2>
            <Link to="/dashboard/meal-plan" className="text-[8px] md:text-sm text-primary hover:underline font-medium">Full Plan →</Link>
          </div>
          {mealPlan.weeklyPlan.slice(0, 2).map((day) => (
            <div key={day.day} className="mb-1.5 md:mb-6">
              <h3 className="text-[8px] md:text-sm font-semibold text-foreground mb-0.5 flex items-center gap-0.5">
                <span className="bg-primary/10 text-primary px-1 py-px rounded-full text-[7px] md:text-xs font-bold">{day.day}</span>
              </h3>
              <div
                className="flex gap-1.5 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-0.5 -mx-1 px-1 md:grid md:grid-cols-3 md:gap-3 md:overflow-visible md:pb-0 md:mx-0 md:px-0"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {day.meals.map((meal, i) => (
                  <div key={`${day.day}-${i}`} className="snap-start shrink-0 w-[110px] md:w-auto md:shrink">
                    <MealCard meal={meal} compact />
                  </div>
                ))}
              </div>
            </div>
          ))}
          <Link
            to="/dashboard/meal-plan"
            className="inline-block bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded py-0.5 px-2 text-[7px] md:text-sm font-semibold text-primary transition-colors"
          >
            View Full Plan →
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
