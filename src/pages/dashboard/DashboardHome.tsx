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
import { useIsMobile } from "@/hooks/use-mobile";

export default function DashboardHome() {
  const { user } = useAuth();
  const { mealPlan, generating, generate } = useMealPlan();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();

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
    <div className="w-full max-w-6xl mx-auto space-y-5 md:space-y-6 overflow-x-hidden">
      {/* Welcome */}
      <div className="space-y-3">
        <div>
          <h1 className="font-display text-xl md:text-3xl font-bold text-foreground leading-tight">
            Welcome back, {profile?.display_name ?? "there"} 👋
          </h1>
          <p className="text-sm md:text-sm text-muted-foreground mt-1">Your weekly meal plan overview</p>
        </div>

        <EditableProfileFields
          zipCode={profile?.zip_code ?? null}
          weeklyBudget={profile?.weekly_budget ?? null}
          onUpdate={refreshProfile}
        />

        <Button
          onClick={generate}
          disabled={generating}
          className="bg-gradient-honey text-primary-foreground hover:opacity-90 w-full md:w-auto h-12 md:h-10 text-sm md:text-sm font-semibold rounded-xl shadow-soft"
        >
          {generating ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
          ) : (
            <><Sparkles className="w-4 h-4 mr-2" /> {mealPlan ? "Regenerate Plan" : "Generate Plan"}</>
          )}
        </Button>
      </div>

      {/* Stats Grid — 2x2 on mobile, 4 cols on desktop */}
      <div className={`grid gap-3 md:gap-4 ${isMobile ? 'grid-cols-2' : 'grid-cols-4'}`}>
        {[
          { label: "Budget", value: `$${budget}`, icon: DollarSign, color: "text-primary" },
          { label: "Est. Cost", value: `$${estimatedCost.toFixed(0)}`, icon: ShoppingCart, color: "text-accent" },
          { label: "Savings", value: `$${pantrySavings.toFixed(0)}`, icon: TrendingDown, color: "text-accent" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-2xl border border-border p-3 md:p-4 shadow-card min-h-[80px] flex flex-col justify-between">
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon className={`w-4 h-4 md:w-5 md:h-5 ${stat.color}`} />
              <span className="text-xs md:text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}

        <Link
          to="/dashboard/pantry"
          className="group bg-gradient-to-br from-accent/10 to-primary/10 rounded-2xl border border-accent/20 p-3 md:p-4 shadow-card hover:shadow-elevated hover:border-accent/40 transition-all duration-300 min-h-[80px] flex flex-col justify-between"
        >
          <div className="flex items-center gap-1.5 mb-1">
            <Refrigerator className="w-4 h-4 md:w-5 md:h-5 text-accent" />
            <span className="text-xs md:text-sm text-muted-foreground">My Fridge</span>
          </div>
          <p className="text-base md:text-lg font-bold text-foreground">Add Items</p>
        </Link>
      </div>

      {/* This Week's Meals */}
      {!mealPlan ? (
        <div className="bg-card rounded-2xl border border-border p-6 md:p-12 text-center shadow-card">
          <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-primary mx-auto mb-3" />
          <h2 className="font-display text-lg md:text-xl font-semibold text-foreground mb-1">No Meal Plan Yet</h2>
          <p className="text-sm md:text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Tap "Generate Plan" to create your personalized weekly plan.
          </p>
          <Button onClick={generate} disabled={generating} className="bg-gradient-honey text-primary-foreground hover:opacity-90 h-12 text-sm rounded-xl shadow-soft px-6">
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Plan</>}
          </Button>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-display text-lg md:text-xl font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> This Week's Meals
            </h2>
            <Link to="/dashboard/meal-plan" className="text-sm md:text-sm text-primary hover:underline font-medium">Full Plan →</Link>
          </div>
          {mealPlan.weeklyPlan.slice(0, 2).map((day) => (
            <div key={day.day} className="mb-4 md:mb-6">
              <h3 className="text-sm md:text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold">{day.day}</span>
              </h3>
              {isMobile ? (
                <div className="space-y-3">
                  {day.meals.map((meal, i) => (
                    <MealCard key={`${day.day}-${i}`} meal={meal} />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  {day.meals.map((meal, i) => (
                    <MealCard key={`${day.day}-${i}`} meal={meal} compact />
                  ))}
                </div>
              )}
            </div>
          ))}
          <Link
            to="/dashboard/meal-plan"
            className="inline-flex items-center justify-center w-full md:w-auto bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl h-11 md:h-auto md:py-2 md:px-4 text-sm font-semibold text-primary transition-colors"
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
