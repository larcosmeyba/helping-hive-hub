import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { CalendarDays, DollarSign, ShoppingCart, Loader2, Sparkles, Refrigerator, Target, PiggyBank, Zap, Flame, ChefHat, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EditableProfileFields } from "@/components/dashboard/EditableProfileFields";
import { MealCard } from "@/components/dashboard/MealCard";
import { RecipeCategoryTiles } from "@/components/dashboard/RecipeCategoryTiles";
import { FreeForeverBadge } from "@/components/dashboard/TierBadge";
import { SnapTracker } from "@/components/dashboard/SnapTracker";
import { useIsMobile } from "@/hooks/use-mobile";
import type { MealPlanMeal } from "@/types/mealPlan";

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
  const { user, profile: authProfile } = useAuth();
  const { mealPlan, generating, generate } = useMealPlan();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const [selectedMeal, setSelectedMeal] = useState<MealPlanMeal | null>(null);

  const profile = authProfile;

  // Redirect to onboarding if not completed (only on fresh fetch, not cache)
  useEffect(() => {
    if (profile && profile.questionnaire_completed === false) {
      navigate("/questionnaire", { replace: true });
    }
  }, [profile?.questionnaire_completed, navigate]);

  const budget = profile?.weekly_budget ?? 75;
  const estimatedCost = mealPlan?.totalEstimatedCost ?? 0;
  const pantrySavings = mealPlan?.pantrySavings ?? 0;
  const saved = budget - estimatedCost;
  const monthlySavedRate = saved > 0 ? saved * 4 : 0;
  const costPerMeal = mealPlan?.costPerMeal ?? 0;
  // First name only for greeting (Fix 2.2)
  const firstName = profile?.display_name?.trim().split(/\s+/)[0] ?? "there";
  const now = new Date();
  const hour = now.getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const dateLabel = now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  const todayDayName = now.toLocaleDateString(undefined, { weekday: "long" });
  // Budget Fit: how well the plan fits within the user's weekly budget (0-100)
  const budgetFit = mealPlan && budget > 0
    ? Math.max(0, Math.min(100, Math.round(((budget - Math.max(0, estimatedCost - pantrySavings)) / budget) * 100 + 50)))
    : 0;
  const isFreeForever = profile?.tier === "free_forever";

  // Today's meals + "Up next" based on time of day
  const todayPlan = useMemo(() => {
    if (!mealPlan) return null;
    return (
      mealPlan.weeklyPlan.find((d) => d.day.toLowerCase() === todayDayName.toLowerCase()) ??
      mealPlan.weeklyPlan[0]
    );
  }, [mealPlan, todayDayName]);

  const upNextIndex = useMemo(() => {
    if (!todayPlan) return -1;
    // Heuristic: breakfast before 10, lunch before 15, otherwise dinner
    const targetType = hour < 10 ? "breakfast" : hour < 15 ? "lunch" : "dinner";
    const idx = todayPlan.meals.findIndex((m) => m.type?.toLowerCase().includes(targetType));
    return idx >= 0 ? idx : 0;
  }, [todayPlan, hour]);

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
            Welcome back, {firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Meals that fit your budget. At the store you already shop at.</p>
          {isFreeForever && <div className="mt-2"><FreeForeverBadge /></div>}
        </div>

        <EditableProfileFields
          zipCode={profile?.zip_code ?? null}
          weeklyBudget={profile?.weekly_budget ?? null}
          householdSize={profile?.household_size ?? null}
          onUpdate={refreshProfile}
        />
      </div>

      {/* Stats Grid — all 6 uniform */}
      <motion.div
        className={`grid gap-3 ${isMobile ? "grid-cols-3" : "grid-cols-6"}`}
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      >
        {[
          { label: "Budget", value: `$${budget}`, icon: Target, color: "text-primary", sub: null as string | null },
          { label: "Est. Cost", value: `$${estimatedCost.toFixed(0)}`, icon: ShoppingCart, color: "text-accent", sub: null },
          {
            label: "Saved",
            value: `$${saved > 0 ? saved.toFixed(0) : "0"}`,
            icon: PiggyBank,
            color: "text-accent",
            sub: saved > 0 ? `~$${monthlySavedRate.toFixed(0)}/mo` : null,
          },
          { label: "Cost/Meal", value: `$${costPerMeal.toFixed(2)}`, icon: DollarSign, color: "text-primary", sub: null },
          { label: "Budget Fit", value: mealPlan ? `${budgetFit}%` : "—", icon: Zap, color: "text-primary", sub: null },
          { label: "Pantry Items", value: `${pantryItems ?? 0}`, icon: Refrigerator, color: "text-accent", sub: null },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            className={cardClass}
            style={cardShadow}
            variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }}
          >
            <div className="flex items-center gap-1 mb-1">
              <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
              <span className="text-[10px] md:text-xs text-muted-foreground truncate">{stat.label}</span>
            </div>
            <p className="text-lg md:text-xl font-bold text-foreground">{stat.value}</p>
            {stat.sub && (
              <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{stat.sub}</p>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Secondary Regenerate action (Fix 2.3 — demoted from top) */}
      {mealPlan && (
        <div className="flex justify-end -mt-1">
          <motion.div whileTap={{ scale: 0.98 }} transition={{ duration: 0.12 }}>
            <Button
              onClick={generate}
              disabled={generating}
              variant="outline"
              size="sm"
              className="border-accent/40 text-accent hover:bg-accent/10 rounded-lg text-xs font-semibold"
            >
              {generating ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-3.5 h-3.5 mr-1.5" /> Regenerate Plan</>
              )}
            </Button>
          </motion.div>
        </div>
      )}

      {mealPlan?.costOfLivingMultiplier && mealPlan.costOfLivingMultiplier !== 1 && (
        <p className="text-[11px] md:text-xs text-muted-foreground flex items-center gap-1.5 -mt-1">
          <Target className="w-3 h-3 text-primary" />
          Prices adjusted for your region{mealPlan.regionLabel ? ` · ${mealPlan.regionLabel}` : ""}
        </p>
      )}

      {(profile?.snap_status || profile?.food_assistance_status === "snap") && (
        <SnapTracker />
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
                      <MealCard key={`${day.day}-${i}`} meal={meal} compact onClick={() => setSelectedMeal(meal)} />
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
                    <MealCard key={`${day.day}-${i}`} meal={meal} compact onClick={() => setSelectedMeal(meal)} />
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

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedMeal} onOpenChange={() => setSelectedMeal(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedMeal && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-primary" /> {selectedMeal.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1">
                    <Flame className="w-3 h-3" /> {selectedMeal.calories} cal
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-muted rounded-lg p-2"><p className="font-bold text-foreground">{selectedMeal.protein}g</p><p className="text-muted-foreground">Protein</p></div>
                  <div className="bg-muted rounded-lg p-2"><p className="font-bold text-foreground">{selectedMeal.carbs}g</p><p className="text-muted-foreground">Carbs</p></div>
                  <div className="bg-muted rounded-lg p-2"><p className="font-bold text-foreground">{selectedMeal.fats}g</p><p className="text-muted-foreground">Fats</p></div>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Ingredients</h4>
                  <ul className="space-y-1">
                    {selectedMeal.ingredients.map((ing, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" /> {ing}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Instructions</h4>
                  <ol className="space-y-2">
                    {selectedMeal.instructions.map((step, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex gap-3">
                        <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <RecipeCategoryTiles />
    </div>
  );
}
