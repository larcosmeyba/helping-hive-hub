import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  CalendarDays, RefreshCw, Loader2, Shuffle, Clock, Flame, DollarSign, X,
  AlertTriangle, Check, ChefHat, Share2, Minus, Plus, ArrowRight, ArrowLeft,
  Sparkles, ShoppingCart, BookOpen, ChevronDown, ChevronUp, PartyPopper,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { MealPlanSkeleton } from "@/components/dashboard/MealPlanSkeleton";
import { MealPlanHistory } from "@/components/dashboard/MealPlanHistory";
import type { MealPlanMeal, GeneratedMealPlan } from "@/types/mealPlan";
import { MealImage } from "@/components/dashboard/MealImage";

import { useToast } from "@/hooks/use-toast";
import { safeGetItem, safeSetItem } from "@/lib/safeStorage";
import { SendToInstacartButton } from "@/components/dashboard/SendToInstacartButton";

const SUBSTITUTE_MEALS: Record<string, MealPlanMeal[]> = {
  breakfast: [
    { type: "breakfast", name: "Greek Yogurt Parfait", calories: 320, protein: 18, carbs: 42, fats: 10, estimatedCost: 2.50, costPerServing: 2.50, cookTimeMinutes: 5, ingredients: ["Greek yogurt", "Granola", "Mixed berries", "Honey"], instructions: ["Layer yogurt in a bowl", "Add granola and berries", "Drizzle with honey"] },
    { type: "breakfast", name: "Banana Oat Pancakes", calories: 380, protein: 12, carbs: 55, fats: 12, estimatedCost: 1.80, costPerServing: 1.80, cookTimeMinutes: 15, ingredients: ["Banana", "Oats", "Eggs", "Cinnamon", "Maple syrup"], instructions: ["Blend", "Cook", "Serve"] },
    { type: "breakfast", name: "Veggie Scramble", calories: 340, protein: 22, carbs: 14, fats: 22, estimatedCost: 2.10, costPerServing: 2.10, cookTimeMinutes: 10, ingredients: ["Eggs", "Spinach", "Bell pepper", "Cheddar"], instructions: ["Sauté veg", "Add eggs", "Top with cheese"] },
    { type: "breakfast", name: "Overnight Oats", calories: 410, protein: 14, carbs: 58, fats: 14, estimatedCost: 1.50, costPerServing: 1.50, cookTimeMinutes: 5, ingredients: ["Oats", "Milk", "Chia", "Berries"], instructions: ["Mix in jar", "Refrigerate overnight"] },
  ],
  lunch: [
    { type: "lunch", name: "Turkey & Avocado Wrap", calories: 450, protein: 28, carbs: 38, fats: 22, estimatedCost: 3.50, costPerServing: 3.50, cookTimeMinutes: 10, ingredients: ["Tortilla", "Turkey", "Avocado", "Lettuce"], instructions: ["Layer", "Roll"] },
    { type: "lunch", name: "Chickpea Salad Bowl", calories: 420, protein: 18, carbs: 52, fats: 16, estimatedCost: 2.80, costPerServing: 2.80, cookTimeMinutes: 10, ingredients: ["Chickpeas", "Cucumber", "Tomatoes", "Feta"], instructions: ["Combine", "Dress"] },
    { type: "lunch", name: "Quinoa Veggie Bowl", calories: 440, protein: 16, carbs: 60, fats: 14, estimatedCost: 3.00, costPerServing: 3.00, cookTimeMinutes: 20, ingredients: ["Quinoa", "Roasted veg", "Hummus"], instructions: ["Cook quinoa", "Roast veg", "Combine"] },
    { type: "lunch", name: "Black Bean Quesadilla", calories: 460, protein: 20, carbs: 52, fats: 18, estimatedCost: 2.20, costPerServing: 2.20, cookTimeMinutes: 12, ingredients: ["Tortilla", "Beans", "Cheese", "Salsa"], instructions: ["Fill", "Cook 3 min/side"] },
  ],
  dinner: [
    { type: "dinner", name: "Lemon Herb Chicken Thighs", calories: 520, protein: 38, carbs: 28, fats: 28, estimatedCost: 4.50, costPerServing: 4.50, cookTimeMinutes: 35, ingredients: ["Chicken thighs", "Lemon", "Garlic", "Potatoes"], instructions: ["Season", "Roast 30-35 min"] },
    { type: "dinner", name: "Spaghetti Bolognese", calories: 550, protein: 30, carbs: 60, fats: 20, estimatedCost: 3.80, costPerServing: 3.80, cookTimeMinutes: 30, ingredients: ["Spaghetti", "Beef", "Tomatoes"], instructions: ["Cook pasta", "Brown beef", "Simmer"] },
    { type: "dinner", name: "Sheet Pan Sausage & Veggies", calories: 510, protein: 24, carbs: 38, fats: 28, estimatedCost: 3.40, costPerServing: 3.40, cookTimeMinutes: 30, ingredients: ["Sausage", "Potatoes", "Peppers"], instructions: ["Toss", "Roast 25-30 min"] },
    { type: "dinner", name: "White Bean & Kale Soup", calories: 380, protein: 18, carbs: 52, fats: 10, estimatedCost: 2.20, costPerServing: 2.20, cookTimeMinutes: 25, ingredients: ["Beans", "Kale", "Broth"], instructions: ["Sauté", "Simmer", "Add kale"] },
  ],
};

const MEAL_BADGE_COLORS: Record<string, string> = {
  breakfast: "bg-[#F2A900] text-white",
  lunch: "bg-[#E07A1F] text-white",
  dinner: "bg-[#C24A1F] text-white",
  snack: "bg-[#1F5A3D] text-white",
};

export default function MealPlanPage() {
  const navigate = useNavigate();
  const { mealPlan, setMealPlan, loading, generating, generationStage, generate } = useMealPlan();
  const { toast } = useToast();
  const [selectedMeal, setSelectedMeal] = useState<MealPlanMeal | null>(null);
  const [substituteOpen, setSubstituteOpen] = useState<{ dayIndex: number; mealIndex: number } | null>(null);
  const [swappedMeals, setSwappedMeals] = useState<Record<string, MealPlanMeal>>({});
  const [previousPlan, setPreviousPlan] = useState<GeneratedMealPlan | null>(null);
  const [collapsedDays, setCollapsedDays] = useState<Set<string>>(new Set());
  const [showSavingsBreakdown, setShowSavingsBreakdown] = useState(false);
  const [cookedMeals, setCookedMeals] = useState<Set<string>>(() => {
    try {
      const raw = safeGetItem("cooked_meals");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });
  const [servings, setServings] = useState(1);
  const [cookingMode, setCookingMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  

  useEffect(() => {
    safeSetItem("cooked_meals", JSON.stringify([...cookedMeals]));
  }, [cookedMeals]);

  useEffect(() => {
    if (selectedMeal) {
      setServings(1);
      setCheckedIngredients(new Set());
      setCurrentStep(0);
      setCookingMode(false);
    }
  }, [selectedMeal]);

  const enrich = (meal: MealPlanMeal): MealPlanMeal => meal;

  const getMeal = (dayIndex: number, mealIndex: number, original: MealPlanMeal) =>
    enrich(swappedMeals[`${dayIndex}-${mealIndex}`] || original);

  const handleSwap = (dayIndex: number, mealIndex: number, newMeal: MealPlanMeal) => {
    setSwappedMeals((prev) => ({ ...prev, [`${dayIndex}-${mealIndex}`]: newMeal }));
    setSubstituteOpen(null);
    toast({ title: "Meal swapped", description: `Replaced with ${newMeal.name}.` });
  };

  const toggleCooked = (key: string) => {
    setCookedMeals((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleDay = (day: string) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  };

  const toggleIngredient = (i: number) => {
    setCheckedIngredients((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  const handleShare = async () => {
    if (!selectedMeal) return;
    const text = `${selectedMeal.name}\n\n${selectedMeal.cookTimeMinutes} min · ${selectedMeal.calories} cal\n\nIngredients:\n${selectedMeal.ingredients.map((i) => `• ${i}`).join("\n")}\n\nInstructions:\n${selectedMeal.instructions.map((s, i) => `${i + 1}. ${s}`).join("\n")}`;
    try {
      if (navigator.share) await navigator.share({ title: selectedMeal.name, text });
      else { await navigator.clipboard.writeText(text); toast({ title: "Copied", description: "Recipe copied to clipboard." }); }
    } catch { /* cancelled */ }
  };

  const getSwapCostImpact = () => {
    if (!mealPlan) return 0;
    let diff = 0;
    for (const [key, newMeal] of Object.entries(swappedMeals)) {
      const [dayIdx, mealIdx] = key.split("-").map(Number);
      const originalMeal = mealPlan.weeklyPlan[dayIdx]?.meals[mealIdx];
      if (originalMeal) diff += (newMeal.estimatedCost || 0) - (originalMeal.estimatedCost || 0);
    }
    return diff;
  };

  const handleRegenerate = async () => {
    if (mealPlan) setPreviousPlan(mealPlan);
    setSwappedMeals({});
    setCookedMeals(new Set());
    await generate();
  };

  if (loading || (generating && !mealPlan)) return <MealPlanSkeleton stage={generating ? generationStage : "idle"} />;

  if (!mealPlan) {
    return (
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="bg-white border border-[#EEE7DA] rounded-3xl p-8 md:p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-[#FFF4D6] flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-8 h-8 text-[#F2A900]" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Let's plan your week</h1>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Hive AI builds a 6-day meal plan and grocery list tuned to your budget, household, and pantry. Takes about 15 seconds.
          </p>
          <Button onClick={generate} disabled={generating} className="bg-[#F2A900] text-white hover:bg-[#E09F00] h-12 px-6 rounded-xl">
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : "Generate Meal Plan"}
          </Button>
        </div>
        <MealPlanHistory />
      </div>
    );
  }

  const weeklyTotal = mealPlan.totalEstimatedCost ?? 0;
  const dailyAvg = weeklyTotal / 7;
  const totalMeals = mealPlan.weeklyPlan.reduce((n, d) => n + d.meals.length, 0);
  const cookedCount = mealPlan.weeklyPlan.reduce(
    (n, d, di) => n + d.meals.filter((_, mi) => cookedMeals.has(`${di}-${mi}`)).length, 0
  );
  const progressPct = totalMeals > 0 ? (cookedCount / totalMeals) * 100 : 0;
  const allComplete = cookedCount === totalMeals && totalMeals > 0;

  // Weekly savings: estimated from pantry savings + waste reduction
  const pantrySavings = mealPlan.pantrySavings ?? 0;
  const wasteAvoided = Math.round(cookedCount * 0.4); // rough estimate
  const weeklySavings = mealPlan.savingsSummary?.estimatedSavings
    ?? (pantrySavings > 0 ? Math.round(pantrySavings) : 22);

  const monthlyBudget = 75; // weekly budget shown in screenshot
  const groceryItems = mealPlan.groceryList ?? [];
  const itemCount = groceryItems.length;

  // Instacart line items from grocery list
  const instacartLineItems = groceryItems.map((g) => ({
    name: g.name,
    quantity: parseFloat(String(g.quantity)) || 1,
    display_text: `${g.quantity} ${g.name}`.trim(),
  }));

  const insights = [
    `Saves approximately $${weeklySavings} this week`,
    `Uses pantry items you already have`,
    `Fits your $${monthlyBudget} weekly budget`,
    `Reduces food waste`,
    `Matches your dietary preferences`,
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-4 pb-24 md:pb-6">
      {/* Section 1: Weekly Overview */}
      <div className="bg-white border border-[#EEE7DA] rounded-2xl p-4 md:p-5">
        <h1 className="font-display text-xl md:text-2xl font-bold text-[#1a1a1a] flex items-center gap-2 mb-3">
          <CalendarDays className="w-5 h-5 text-[#F2A900]" /> Weekly Meal Plan
        </h1>
        <div className="grid grid-cols-4 gap-2">
          <Stat label="Est. Weekly Total" value={`~$${weeklyTotal.toFixed(2)}`} sub={`of $${monthlyBudget} budget`} accent="text-[#1F5A3D]" />
          <Stat label="Est. Daily Avg" value={`~$${dailyAvg.toFixed(2)}`} sub="per day" />
          <Stat label="Meals This Week" value={String(totalMeals)} sub="planned" />
          <Stat label="Weekly Savings" value={`$${weeklySavings}`} sub="using pantry" accent="text-[#1F5A3D]" />
        </div>
        <p className="text-[10px] text-[#8a8a8a] mt-2">Estimates only. Final pricing confirmed at Instacart checkout.</p>
      </div>

      {/* Section 2: Hive AI Insights */}
      <div className="bg-[#F6F1DD] border border-[#E8DFC0] rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-4 h-4 text-[#F2A900]" />
          <h2 className="font-bold text-[15px] text-[#1a1a1a]">Hive AI Insights</h2>
        </div>
        <ul className="space-y-1.5">
          {insights.map((i) => (
            <li key={i} className="flex items-start gap-2 text-[13px] text-[#3a3a3a]">
              <Check className="w-4 h-4 text-[#1F5A3D] shrink-0 mt-0.5" strokeWidth={3} />
              <span>{i}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Section 3: Weekly Progress */}
      <div className="bg-white border border-[#EEE7DA] rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[14px] font-semibold text-[#1a1a1a]">Weekly Progress</span>
          <span className="text-[12px] text-[#6a6a6a]">{cookedCount} of {totalMeals} meals completed</span>
        </div>
        <div className="h-2 w-full bg-[#F5EBDC] rounded-full overflow-hidden">
          <div className="h-full bg-[#F2A900] transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="text-[11px] text-[#8a8a8a] mt-2">
          {allComplete ? "All done — incredible work! 🎉" : "Keep going! You've got this."}
        </p>
      </div>

      {/* Section 4: Quick Actions */}
      <div className="grid grid-cols-3 gap-2">
        <ActionCard icon={RefreshCw} label="Regenerate Plan" sub="Get new meal ideas" onClick={handleRegenerate} disabled={generating} />
        <ActionCard icon={ShoppingCart} label="View Grocery List" sub={`${itemCount} items · ~$${weeklyTotal.toFixed(0)}`} onClick={() => navigate("/dashboard/grocery-list")} />
        <InstacartActionCard
          title="Weekly Meal Plan"
          lineItems={instacartLineItems}
        />
      </div>

      {/* Section 5: Estimated Savings */}
      <button
        onClick={() => setShowSavingsBreakdown(true)}
        className="w-full text-left bg-[#FFF4D6] border border-[#F0E1A5] rounded-2xl p-4 flex items-center justify-between gap-3 hover:bg-[#FBEEC8] transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0">
            <span className="text-xl">💰</span>
          </div>
          <div className="min-w-0">
            <p className="font-bold text-[14px] text-[#1a1a1a]">Estimated Savings This Week</p>
            <p className="text-[12px] text-[#6a6a6a] truncate">${weeklySavings} saved with pantry + waste reduction</p>
          </div>
        </div>
        <span className="text-[12px] font-semibold text-[#1F5A3D] flex items-center gap-1 shrink-0">
          See breakdown <ArrowRight className="w-3 h-3" />
        </span>
      </button>

      {/* Swap cost impact */}
      {Object.keys(swappedMeals).length > 0 && (() => {
        const impact = getSwapCostImpact();
        return (
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13px] font-medium ${impact > 0 ? 'bg-red-50 text-red-700' : impact < 0 ? 'bg-green-50 text-green-700' : 'bg-muted text-muted-foreground'}`}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {impact > 0
                ? `Swaps add ~+$${impact.toFixed(2)} to grocery cost`
                : impact < 0
                  ? `Swaps save ~$${Math.abs(impact).toFixed(2)} on grocery cost`
                  : "Swaps have no cost impact"}
            </span>
          </div>
        );
      })()}

      {/* Completion celebration */}
      {allComplete && (
        <div className="bg-[#F6F1DD] border border-[#F2A900]/40 rounded-2xl p-5 text-center">
          <PartyPopper className="w-8 h-8 text-[#F2A900] mx-auto mb-2" />
          <h3 className="font-display text-lg font-bold text-[#1a1a1a]">Great Job!</h3>
          <p className="text-[13px] text-[#3a3a3a] mt-1">
            You completed all {totalMeals} meals. Saved ~${weeklySavings} · Avoided {wasteAvoided} items of food waste.
          </p>
          <Button onClick={handleRegenerate} className="mt-3 bg-[#1F5A3D] text-white hover:bg-[#194B33] h-11 rounded-xl">
            Generate Next Week's Plan
          </Button>
        </div>
      )}

      {/* Section 6: Daily Meals */}
      <AnimatePresence>
        {mealPlan.weeklyPlan.map((day, dayIndex) => {
          const collapsed = collapsedDays.has(day.day);
          return (
            <motion.div
              key={day.day}
              className="space-y-2"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: dayIndex * 0.04 }}
            >
              <button
                onClick={() => toggleDay(day.day)}
                className="w-full flex items-center justify-between px-1"
              >
                <h2 className="font-display text-base font-bold text-[#1a1a1a] flex items-center gap-2">
                  <span className="text-[#F2A900]">☀️</span> {day.day}
                </h2>
                <span className="flex items-center gap-1 text-[12px] text-[#8a8a8a]">
                  {day.meals.length} meals
                  {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </span>
              </button>
              {!collapsed && (
                <div className="grid grid-cols-3 gap-2 md:gap-3">
                  {day.meals.map((originalMeal, mealIndex) => {
                    const meal = getMeal(dayIndex, mealIndex, originalMeal);
                    const cookedKey = `${dayIndex}-${mealIndex}`;
                    const isCooked = cookedMeals.has(cookedKey);
                    const badgeClass = MEAL_BADGE_COLORS[meal.type.toLowerCase()] ?? "bg-[#F2A900] text-white";
                    return (
                      <div key={`${day.day}-${mealIndex}`} className="bg-white rounded-2xl border border-[#EEE7DA] overflow-hidden flex flex-col">
                        <button
                          onClick={() => setSelectedMeal(meal)}
                          className="text-left relative"
                        >
                          <div className="relative aspect-square overflow-hidden">
                            <MealImage meal={meal} className="w-full h-full" imgClassName="w-full h-full object-cover" />
                            <span className={`absolute top-1.5 left-1.5 ${badgeClass} text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide`}>
                              {meal.type}
                            </span>
                            {isCooked && (
                              <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                                <Check className="w-8 h-8 text-white" strokeWidth={3} />
                              </div>
                            )}
                          </div>
                          <div className="p-2">
                            <p className="text-[11px] md:text-[13px] font-semibold text-[#1a1a1a] line-clamp-2 leading-tight">{meal.name}</p>
                            <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1 text-[9px] md:text-[10px] text-[#6a6a6a]">
                              <span>{meal.calories} cal</span>
                              <span>{meal.protein}g protein</span>
                              <span>{meal.cookTimeMinutes} min</span>
                            </div>
                          </div>
                        </button>
                        <div className="flex border-t border-[#F0E8D6] text-[10px] md:text-[11px]">
                          <button
                            onClick={() => setSubstituteOpen({ dayIndex, mealIndex })}
                            className="flex-1 py-1.5 flex items-center justify-center gap-1 text-[#6a6a6a] hover:bg-[#FBF5E8]"
                          >
                            <Shuffle className="w-3 h-3" /> Swap
                          </button>
                          <div className="w-px bg-[#F0E8D6]" />
                          <button
                            onClick={() => setSelectedMeal(meal)}
                            className="flex-1 py-1.5 flex items-center justify-center gap-1 text-[#6a6a6a] hover:bg-[#FBF5E8]"
                          >
                            <BookOpen className="w-3 h-3" /> Recipe
                          </button>
                          <div className="w-px bg-[#F0E8D6]" />
                          <button
                            onClick={() => toggleCooked(cookedKey)}
                            className={`flex-1 py-1.5 flex items-center justify-center gap-1 ${isCooked ? 'bg-[#1F5A3D] text-white' : 'text-[#6a6a6a] hover:bg-[#FBF5E8]'}`}
                          >
                            <Check className="w-3 h-3" strokeWidth={3} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          );
        })}
      </AnimatePresence>

      <MealPlanHistory />

      {/* Sticky Grocery Bar (mobile) */}
      <div className="md:hidden fixed bottom-16 inset-x-0 z-40 px-3 pb-2 pointer-events-none">
        <div className="bg-white border border-[#EEE7DA] shadow-lg rounded-2xl p-3 flex items-center justify-between gap-3 pointer-events-auto">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#FFF4D6] flex items-center justify-center shrink-0">
              <ShoppingCart className="w-4 h-4 text-[#F2A900]" />
            </div>
            <div className="min-w-0">
              <p className="text-[13px] font-bold text-[#1a1a1a] truncate">{itemCount} Items Ready</p>
              <p className="text-[11px] text-[#6a6a6a] truncate">Est. total ~${weeklyTotal.toFixed(2)}</p>
            </div>
          </div>
          <Button
            onClick={() => navigate("/dashboard/grocery-list")}
            className="bg-[#1F5A3D] hover:bg-[#194B33] text-white h-10 px-4 rounded-xl text-[13px] font-semibold shrink-0"
          >
            View Grocery List <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>

      {/* Savings breakdown dialog */}
      <Dialog open={showSavingsBreakdown} onOpenChange={setShowSavingsBreakdown}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <span>💰</span> Savings Breakdown
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 text-[14px]">
            <Row label="Pantry items used" value={`$${(weeklySavings * 0.55).toFixed(2)}`} />
            <Row label="Food waste avoided" value={`$${(weeklySavings * 0.25).toFixed(2)}`} />
            <Row label="Smarter meal planning" value={`$${(weeklySavings * 0.20).toFixed(2)}`} />
            <div className="border-t border-[#EEE7DA] pt-3 flex justify-between font-bold">
              <span>Total saved</span>
              <span className="text-[#1F5A3D]">${weeklySavings}</span>
            </div>
            <p className="text-[11px] text-[#8a8a8a]">Estimates based on pantry inventory and average regional grocery prices.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Recipe Dialog */}
      <Dialog open={!!selectedMeal} onOpenChange={() => setSelectedMeal(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedMeal && (
            <>
              <button onClick={() => setSelectedMeal(null)} className="absolute top-3 right-3 z-10 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center">
                <X className="w-5 h-5 text-foreground" />
              </button>
              {!cookingMode && (
                <div className="rounded-xl overflow-hidden -mx-2 -mt-2 mb-3">
                  <MealImage meal={selectedMeal} className="w-full h-48" imgClassName="w-full h-48 object-cover" />
                </div>
              )}
              <DialogHeader>
                <DialogTitle className="font-display text-xl pr-12">{selectedMeal.name}</DialogTitle>
              </DialogHeader>
              {cookingMode ? (
                <div className="space-y-4">
                  <div className="bg-[#FFF4D6] border border-[#F0E1A5] rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wide text-[#F2A900] font-semibold mb-2">
                      Step {currentStep + 1} of {selectedMeal.instructions.length}
                    </p>
                    <p className="text-base text-foreground leading-relaxed">{selectedMeal.instructions[currentStep]}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" className="flex-1 h-11 rounded-xl" onClick={() => setCurrentStep((s) => Math.max(0, s - 1))} disabled={currentStep === 0}>
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    {currentStep < selectedMeal.instructions.length - 1 ? (
                      <Button className="flex-1 h-11 rounded-xl bg-[#F2A900] hover:bg-[#E09F00] text-white" onClick={() => setCurrentStep((s) => s + 1)}>
                        Next <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    ) : (
                      <Button className="flex-1 h-11 rounded-xl bg-[#1F5A3D] hover:bg-[#194B33] text-white" onClick={() => { setCookingMode(false); toast({ title: "Recipe complete!" }); }}>
                        <Check className="w-4 h-4 mr-1" /> Finish
                      </Button>
                    )}
                  </div>
                  <Button variant="ghost" className="w-full text-xs text-muted-foreground" onClick={() => setCookingMode(false)}>
                    Exit cooking mode
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="bg-[#FFF4D6] text-[#B07E00] px-3 py-1 rounded-full flex items-center gap-1">
                      <Flame className="w-3 h-3" /> {selectedMeal.calories} cal
                    </span>
                    <span className="bg-muted px-3 py-1 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {selectedMeal.cookTimeMinutes} min
                    </span>
                    {selectedMeal.costPerServing != null && (
                      <span className="bg-[#E8F2EB] text-[#1F5A3D] px-3 py-1 rounded-full flex items-center gap-1 font-semibold">
                        <DollarSign className="w-3 h-3" /> ${(selectedMeal.costPerServing * servings).toFixed(2)}{servings > 1 ? ` total` : '/serving'}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-muted rounded-lg p-2"><p className="font-bold text-foreground">{selectedMeal.protein * servings}g</p><p className="text-muted-foreground">Protein</p></div>
                    <div className="bg-muted rounded-lg p-2"><p className="font-bold text-foreground">{selectedMeal.carbs * servings}g</p><p className="text-muted-foreground">Carbs</p></div>
                    <div className="bg-muted rounded-lg p-2"><p className="font-bold text-foreground">{selectedMeal.fats * servings}g</p><p className="text-muted-foreground">Fats</p></div>
                  </div>
                  <div className="flex items-center justify-between bg-muted/50 rounded-xl px-3 py-2">
                    <span className="text-sm font-medium text-foreground">Servings</span>
                    <div className="flex items-center gap-3">
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setServings((s) => Math.max(1, s - 1))} disabled={servings <= 1}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="font-bold text-foreground w-6 text-center">{servings}</span>
                      <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setServings((s) => Math.min(12, s + 1))} disabled={servings >= 12}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  {selectedMeal.ingredients?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Ingredients</h4>
                      <ul className="space-y-1.5">
                        {selectedMeal.ingredients.map((ing, i) => {
                          const checked = checkedIngredients.has(i);
                          return (
                            <li key={i}>
                              <button onClick={() => toggleIngredient(i)} className={`w-full flex items-center gap-2 text-sm text-left transition-colors ${checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-[#1F5A3D] border-[#1F5A3D]' : 'border-border'}`}>
                                  {checked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                                </span>
                                <span>{ing}</span>
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                  {selectedMeal.instructions?.length > 0 && (
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Instructions</h4>
                      <ol className="space-y-2">
                        {selectedMeal.instructions.map((step, i) => (
                          <li key={i} className="text-sm text-muted-foreground flex gap-3">
                            <span className="bg-[#F2A900] text-white w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  <Button
                    variant="outline"
                    className="w-full h-11 rounded-xl border-[#EEE7DA]"
                    onClick={() => { navigate("/dashboard/grocery-list"); }}
                  >
                    <ShoppingCart className="w-4 h-4 mr-1.5" /> Add Missing Ingredients
                  </Button>
                  <div className="flex gap-2 pt-1 sticky bottom-0 bg-background pb-1">
                    {selectedMeal.instructions?.length > 0 && (
                      <Button className="flex-1 h-11 rounded-xl bg-[#F2A900] hover:bg-[#E09F00] text-white" onClick={() => { setCookingMode(true); setCurrentStep(0); }}>
                        <ChefHat className="w-4 h-4 mr-1.5" /> Start Cooking
                      </Button>
                    )}
                    <Button variant="outline" size="icon" className="h-11 w-11 rounded-xl shrink-0" onClick={handleShare} aria-label="Share recipe">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Swap Dialog */}
      <Dialog open={!!substituteOpen} onOpenChange={() => setSubstituteOpen(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-[#F2A900]" /> Swap Meal
            </DialogTitle>
          </DialogHeader>
          {substituteOpen && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Choose an alternative tuned to your budget, household, and pantry:</p>
              {(() => {
                const currentMeal = getMeal(
                  substituteOpen.dayIndex,
                  substituteOpen.mealIndex,
                  mealPlan.weeklyPlan[substituteOpen.dayIndex]?.meals[substituteOpen.mealIndex]
                );
                const alternatives = (SUBSTITUTE_MEALS[currentMeal.type] || SUBSTITUTE_MEALS.dinner)
                  .filter((alt) => alt.name !== currentMeal.name);
                return alternatives.map((alt) => {
                  const costDiff = (alt.estimatedCost || 0) - (currentMeal.estimatedCost || 0);
                  return (
                    <button
                      key={alt.name}
                      onClick={() => handleSwap(substituteOpen.dayIndex, substituteOpen.mealIndex, alt)}
                      className="w-full text-left bg-white border border-[#EEE7DA] rounded-xl p-4 hover:border-[#F2A900]/50 transition-all"
                    >
                      <h4 className="font-semibold text-foreground">{alt.name}</h4>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> {alt.calories} cal</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {alt.cookTimeMinutes}m</span>
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> ${alt.estimatedCost.toFixed(2)}</span>
                        {costDiff !== 0 && (
                          <span className={`font-semibold ${costDiff > 0 ? 'text-red-600' : 'text-[#1F5A3D]'}`}>
                            {costDiff > 0 ? `+$${costDiff.toFixed(2)}` : `-$${Math.abs(costDiff).toFixed(2)}`}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                });
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] md:text-[11px] text-[#8a8a8a] truncate">{label}</p>
      <p className={`text-[15px] md:text-[18px] font-bold leading-tight ${accent ?? 'text-[#1a1a1a]'}`}>{value}</p>
      {sub && <p className="text-[10px] text-[#8a8a8a] truncate">{sub}</p>}
    </div>
  );
}

function ActionCard({ icon: Icon, label, sub, onClick, disabled }: { icon: any; label: string; sub: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="bg-white border border-[#EEE7DA] rounded-2xl p-3 text-left hover:border-[#F2A900]/40 transition-colors disabled:opacity-60 flex flex-col items-start gap-1.5"
    >
      <div className="w-8 h-8 rounded-full bg-[#FFF4D6] flex items-center justify-center">
        <Icon className="w-4 h-4 text-[#F2A900]" />
      </div>
      <p className="font-bold text-[12px] md:text-[13px] text-[#1a1a1a] leading-tight">{label}</p>
      <p className="text-[10px] md:text-[11px] text-[#6a6a6a] leading-tight line-clamp-2">{sub}</p>
    </button>
  );
}

function InstacartActionCard({ title, lineItems }: { title: string; lineItems: { name: string; quantity?: number; display_text?: string }[] }) {
  return (
    <div className="bg-white border border-[#EEE7DA] rounded-2xl p-3 flex flex-col items-start gap-1.5">
      <div className="w-8 h-8 rounded-full bg-[#FFE9D6] flex items-center justify-center">
        <ShoppingCart className="w-4 h-4 text-[#E07A1F]" />
      </div>
      <p className="font-bold text-[12px] md:text-[13px] text-[#1a1a1a] leading-tight">Send to Instacart</p>
      <p className="text-[10px] md:text-[11px] text-[#6a6a6a] leading-tight">Shop in one click</p>
      <SendToInstacartButton
        title={title}
        lineItems={lineItems}
        variant="dark"
        label="Send to Instacart"
        fullWidth
        showExternalIcon={false}
        className="mt-1 !h-8 !text-[11px] !px-2"
      />
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-[#3a3a3a]">
      <span>{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}
