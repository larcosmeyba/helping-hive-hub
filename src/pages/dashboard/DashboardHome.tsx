import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { CalendarDays, DollarSign, ShoppingCart, Loader2, Sparkles, Refrigerator, Target, PiggyBank, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { EditableProfileFields } from "@/components/dashboard/EditableProfileFields";
import { MealCard } from "@/components/dashboard/MealCard";
import { RecipeCategoryTiles } from "@/components/dashboard/RecipeCategoryTiles";
import { useIsMobile } from "@/hooks/use-mobile";

/* Circular progress ring */
function GroceryScoreRing({ score }: { score: number }) {
  const size = 64;
  const stroke = 5;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const offset = circ - (score / 100) * circ;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(var(--muted))" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-sm font-bold text-primary">{score}%</span>
    </div>
  );
}

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
  const saved = budget - estimatedCost;
  const costPerMeal = mealPlan?.costPerMeal ?? 0;
  const groceryScore = mealPlan ? Math.min(99, Math.round(70 + (pantrySavings / budget) * 30)) : 0;

  const { data: pantryItems } = useQuery({
    queryKey: ["pantry_count", user?.id],
    queryFn: async () => {
      const { count } = await supabase
        .from("pantry_items")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .eq("is_out_of_stock", false);
      return count ?? 0;
    },
    enabled: !!user,
  });

  const refreshProfile = () => queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });

  const cardClass = "bg-card rounded-2xl border border-border p-3 md:p-4 min-h-[72px] flex flex-col justify-between";
  const cardShadow = { boxShadow: "0px 6px 16px rgba(0,0,0,0.04)" };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-4 md:space-y-6 overflow-x-hidden">
      {/* Welcome */}
      <div className="space-y-3">
        <div>
          <h1 className="font-display text-xl md:text-3xl font-bold text-foreground leading-tight">
            Welcome back, {profile?.display_name ?? "there"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Your weekly meal plan overview</p>
        </div>

        <EditableProfileFields
          zipCode={profile?.zip_code ?? null}
          weeklyBudget={profile?.weekly_budget ?? null}
          onUpdate={refreshProfile}
        />

        <motion.div whileTap={{ scale: 0.98 }} transition={{ duration: 0.12 }}>
          <Button
            onClick={generate}
            disabled={generating}
            className="bg-gradient-honey text-primary-foreground hover:opacity-90 w-full md:w-auto h-14 md:h-10 text-sm md:text-sm font-semibold rounded-xl shadow-soft"
          >
            {generating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> {mealPlan ? "Regenerate Plan" : "Generate Plan"}</>
            )}
          </Button>
        </motion.div>
      </div>

      {/* Budget Stats */}
      <motion.div
        className={`grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-4"}`}
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
      >
        {[
          { label: "Budget", value: `$${budget}`, icon: Target, color: "text-primary" },
          { label: "Est. Cost", value: `$${estimatedCost.toFixed(0)}`, icon: ShoppingCart, color: "text-accent" },
          { label: "Saved", value: `$${saved > 0 ? saved.toFixed(0) : "0"}`, icon: PiggyBank, color: "text-accent" },
          { label: "Cost/Meal", value: `$${costPerMeal.toFixed(2)}`, icon: DollarSign, color: "text-primary" },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            className={cardClass}
            style={cardShadow}
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <stat.icon className={`w-4 h-4 md:w-5 md:h-5 ${stat.color}`} />
              <span className="text-xs md:text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-xl md:text-2xl font-bold text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Smart Insights Row */}
      {mealPlan && (
        <div className={`grid gap-3 ${isMobile ? "grid-cols-2" : "grid-cols-3"}`}>
          {/* Grocery Score with ring */}
          <div className={cardClass} style={cardShadow}>
            <div className="flex items-center gap-1.5 mb-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-xs text-muted-foreground">Grocery Score</span>
            </div>
            <div className="flex justify-center">
              <GroceryScoreRing score={groceryScore} />
            </div>
          </div>

          {/* Pantry Utilization */}
          <div className={cardClass} style={cardShadow}>
            <div className="flex items-center gap-1.5 mb-1">
              <Refrigerator className="w-4 h-4 text-accent" />
              <span className="text-xs text-muted-foreground">Pantry Items</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{pantryItems ?? 0}</p>
            <p className="text-[10px] text-muted-foreground">in stock</p>
          </div>
        </div>
      )}

      {/* This Week's Meals */}
      {!mealPlan ? (
        <div className={cardClass + " p-6 md:p-12 text-center"} style={cardShadow}>
          <Sparkles className="w-10 h-10 md:w-12 md:h-12 text-primary mx-auto mb-3" />
          <h2 className="font-display text-lg md:text-xl font-semibold text-foreground mb-1">No Meal Plan Yet</h2>
          <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
            Tap "Generate Plan" to create your personalized weekly plan.
          </p>
          <motion.div whileTap={{ scale: 0.98 }} transition={{ duration: 0.12 }}>
            <Button onClick={generate} disabled={generating} className="bg-gradient-honey text-primary-foreground hover:opacity-90 h-14 text-sm rounded-xl shadow-soft px-6">
              {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Plan</>}
            </Button>
          </motion.div>
        </div>
      ) : (
        <div>
          <div className="flex items-center justify-between mb-3 mt-6">
            <h2 className="font-display text-lg md:text-xl font-semibold text-foreground flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> This Week's Meals
            </h2>
            <Link to="/dashboard/meal-plan" className="text-sm text-primary hover:underline font-medium">Full Plan →</Link>
          </div>
          {isMobile ? (
            <div className="space-y-4">
              {mealPlan.weeklyPlan.slice(0, 3).map((day) => (
                <div key={day.day}>
                  <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                    <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold">{day.day}</span>
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {day.meals.map((meal, i) => (
                      <MealCard key={`${day.day}-${i}`} meal={meal} compact />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            mealPlan.weeklyPlan.slice(0, 2).map((day) => (
              <div key={day.day} className="mb-6">
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-1.5">
                  <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs font-bold">{day.day}</span>
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {day.meals.map((meal, i) => (
                    <MealCard key={`${day.day}-${i}`} meal={meal} compact />
                  ))}
                </div>
              </div>
            ))
          )}
          <Link
            to="/dashboard/meal-plan"
            className="inline-flex items-center justify-center w-full md:w-auto bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl h-11 md:h-auto md:py-2 md:px-4 text-sm font-semibold text-primary transition-colors"
          >
            View Full Plan →
          </Link>
        </div>
      )}

      <RecipeCategoryTiles />
    </div>
  );
}
