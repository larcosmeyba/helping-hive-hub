import { useState, useEffect } from "react";
import { CalendarDays, RefreshCw, Loader2, Shuffle, Clock, Flame, DollarSign, X, Undo2, AlertTriangle, Tag, Check, ChefHat, Share2, Minus, Plus, ArrowRight, ArrowLeft } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { MealPlanSkeleton } from "@/components/dashboard/MealPlanSkeleton";
import { MealPlanHistory } from "@/components/dashboard/MealPlanHistory";
import type { MealPlanMeal, GeneratedMealPlan } from "@/types/mealPlan";
import { getMealImage, PLACEHOLDER_IMAGE } from "@/utils/mealImages";
import { useOpenFoodFacts } from "@/hooks/useOpenFoodFacts";
import { useToast } from "@/hooks/use-toast";

const SUBSTITUTE_MEALS: Record<string, MealPlanMeal[]> = {
  breakfast: [
    { type: "breakfast", name: "Greek Yogurt Parfait", calories: 320, protein: 18, carbs: 42, fats: 10, estimatedCost: 2.50, costPerServing: 2.50, cookTimeMinutes: 5, ingredients: ["Greek yogurt", "Granola", "Mixed berries", "Honey"], instructions: ["Layer yogurt in a bowl", "Add granola and berries", "Drizzle with honey"] },
    { type: "breakfast", name: "Banana Oat Pancakes", calories: 380, protein: 12, carbs: 55, fats: 12, estimatedCost: 1.80, costPerServing: 1.80, cookTimeMinutes: 15, ingredients: ["Banana", "Oats", "Eggs", "Cinnamon", "Maple syrup"], instructions: ["Blend banana, oats, eggs, and cinnamon", "Pour batter onto heated pan", "Cook 2-3 min per side", "Serve with maple syrup"] },
    { type: "breakfast", name: "Veggie Scramble", calories: 340, protein: 22, carbs: 14, fats: 22, estimatedCost: 2.10, costPerServing: 2.10, cookTimeMinutes: 10, ingredients: ["Eggs", "Spinach", "Bell pepper", "Cheddar", "Olive oil"], instructions: ["Sauté veggies in oil 3 min", "Whisk eggs and pour over", "Stir until set", "Top with cheese"] },
    { type: "breakfast", name: "Peanut Butter Toast & Banana", calories: 360, protein: 12, carbs: 50, fats: 14, estimatedCost: 1.20, costPerServing: 1.20, cookTimeMinutes: 5, ingredients: ["Whole wheat bread", "Peanut butter", "Banana", "Cinnamon"], instructions: ["Toast bread", "Spread peanut butter", "Top with banana slices and cinnamon"] },
    { type: "breakfast", name: "Overnight Oats", calories: 410, protein: 14, carbs: 58, fats: 14, estimatedCost: 1.50, costPerServing: 1.50, cookTimeMinutes: 5, ingredients: ["Rolled oats", "Milk", "Chia seeds", "Honey", "Berries"], instructions: ["Mix oats, milk, chia, honey in jar", "Refrigerate overnight", "Top with berries before serving"] },
  ],
  lunch: [
    { type: "lunch", name: "Turkey & Avocado Wrap", calories: 450, protein: 28, carbs: 38, fats: 22, estimatedCost: 3.50, costPerServing: 3.50, cookTimeMinutes: 10, ingredients: ["Tortilla", "Turkey deli", "Avocado", "Lettuce", "Tomato"], instructions: ["Lay out tortilla", "Layer ingredients", "Roll tightly"] },
    { type: "lunch", name: "Chickpea Salad Bowl", calories: 420, protein: 18, carbs: 52, fats: 16, estimatedCost: 2.80, costPerServing: 2.80, cookTimeMinutes: 10, ingredients: ["Chickpeas", "Cucumber", "Cherry tomatoes", "Feta", "Lemon vinaigrette"], instructions: ["Combine all ingredients", "Toss with vinaigrette"] },
    { type: "lunch", name: "Tuna Melt", calories: 480, protein: 30, carbs: 36, fats: 22, estimatedCost: 2.40, costPerServing: 2.40, cookTimeMinutes: 12, ingredients: ["Tuna", "Mayo", "Cheddar", "Whole wheat bread", "Pickle"], instructions: ["Mix tuna and mayo", "Top bread with tuna and cheese", "Toast until golden"] },
    { type: "lunch", name: "Quinoa Veggie Bowl", calories: 440, protein: 16, carbs: 60, fats: 14, estimatedCost: 3.00, costPerServing: 3.00, cookTimeMinutes: 20, ingredients: ["Quinoa", "Roasted vegetables", "Hummus", "Lemon", "Olive oil"], instructions: ["Cook quinoa per package", "Roast vegetables 15 min", "Combine and dress"] },
    { type: "lunch", name: "Black Bean Quesadilla", calories: 460, protein: 20, carbs: 52, fats: 18, estimatedCost: 2.20, costPerServing: 2.20, cookTimeMinutes: 12, ingredients: ["Tortilla", "Black beans", "Cheddar", "Salsa", "Cilantro"], instructions: ["Mash beans and spread on tortilla", "Top with cheese and fold", "Cook 3 min per side"] },
  ],
  dinner: [
    { type: "dinner", name: "Lemon Herb Chicken Thighs", calories: 520, protein: 38, carbs: 28, fats: 28, estimatedCost: 4.50, costPerServing: 4.50, cookTimeMinutes: 35, ingredients: ["Chicken thighs", "Lemon", "Garlic", "Rosemary", "Potatoes"], instructions: ["Preheat oven to 425°F", "Season chicken", "Roast 30-35 minutes"] },
    { type: "dinner", name: "Spaghetti Bolognese", calories: 550, protein: 30, carbs: 60, fats: 20, estimatedCost: 3.80, costPerServing: 3.80, cookTimeMinutes: 30, ingredients: ["Spaghetti", "Ground beef", "Crushed tomatoes", "Italian seasoning"], instructions: ["Cook pasta", "Brown beef", "Add tomatoes", "Simmer 15 min"] },
    { type: "dinner", name: "Sheet Pan Sausage & Veggies", calories: 510, protein: 24, carbs: 38, fats: 28, estimatedCost: 3.40, costPerServing: 3.40, cookTimeMinutes: 30, ingredients: ["Smoked sausage", "Potatoes", "Bell peppers", "Onion", "Olive oil"], instructions: ["Preheat 425°F", "Toss everything with oil and seasonings", "Roast 25-30 min"] },
    { type: "dinner", name: "Beef & Broccoli Stir Fry", calories: 480, protein: 32, carbs: 36, fats: 22, estimatedCost: 4.20, costPerServing: 4.20, cookTimeMinutes: 20, ingredients: ["Sirloin", "Broccoli", "Soy sauce", "Garlic", "Rice"], instructions: ["Cook rice", "Sear beef 3 min", "Add broccoli and sauce", "Toss and serve"] },
    { type: "dinner", name: "White Bean & Kale Soup", calories: 380, protein: 18, carbs: 52, fats: 10, estimatedCost: 2.20, costPerServing: 2.20, cookTimeMinutes: 25, ingredients: ["White beans", "Kale", "Onion", "Garlic", "Vegetable broth"], instructions: ["Sauté onion and garlic", "Add broth and beans", "Simmer 15 min", "Stir in kale"] },
    { type: "dinner", name: "Baked Salmon with Rice", calories: 540, protein: 36, carbs: 42, fats: 22, estimatedCost: 5.20, costPerServing: 5.20, cookTimeMinutes: 25, ingredients: ["Salmon fillet", "Rice", "Lemon", "Asparagus", "Olive oil"], instructions: ["Preheat 400°F", "Cook rice", "Bake salmon 12-15 min", "Serve with asparagus"] },
  ],
};

export default function MealPlanPage() {
  const { mealPlan, setMealPlan, loading, generating, generationStage, generate } = useMealPlan();
  const { toast } = useToast();
  const [selectedMeal, setSelectedMeal] = useState<MealPlanMeal | null>(null);
  const [substituteOpen, setSubstituteOpen] = useState<{ dayIndex: number; mealIndex: number } | null>(null);
  const [swappedMeals, setSwappedMeals] = useState<Record<string, MealPlanMeal>>({});
  const [previousPlan, setPreviousPlan] = useState<GeneratedMealPlan | null>(null);
  const [prioritizeSales, setPrioritizeSales] = useState(() => localStorage.getItem("prioritize_sales") === "true");
  const [cookedMeals, setCookedMeals] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("cooked_meals");
      return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch { return new Set(); }
  });
  const [servings, setServings] = useState(1);
  const [cookingMode, setCookingMode] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const { products: offProducts, fetchProducts: fetchOffProducts } = useOpenFoodFacts();

  useEffect(() => {
    localStorage.setItem("prioritize_sales", String(prioritizeSales));
  }, [prioritizeSales]);

  useEffect(() => {
    localStorage.setItem("cooked_meals", JSON.stringify([...cookedMeals]));
  }, [cookedMeals]);

  useEffect(() => {
    if (!mealPlan?.weeklyPlan?.length) return;
    const names = Array.from(
      new Set(mealPlan.weeklyPlan.flatMap((d) => d.meals.map((m) => m.name)))
    );
    if (names.length) fetchOffProducts(names);
  }, [mealPlan, fetchOffProducts]);

  // Reset modal state when meal changes
  useEffect(() => {
    if (selectedMeal) {
      setServings(1);
      setCheckedIngredients(new Set());
      setCurrentStep(0);
      setCookingMode(false);
    }
  }, [selectedMeal]);

  const enrich = (meal: MealPlanMeal): MealPlanMeal => {
    const off = offProducts[meal.name.toLowerCase()];
    if (!off) return meal;
    return {
      ...meal,
      calories: off.calories != null ? Math.round(off.calories) : meal.calories,
      protein: off.protein != null ? Math.round(off.protein) : meal.protein,
      carbs: off.carbs != null ? Math.round(off.carbs) : meal.carbs,
      fats: off.fat != null ? Math.round(off.fat) : meal.fats,
    };
  };

  const getMeal = (dayIndex: number, mealIndex: number, original: MealPlanMeal) => {
    return enrich(swappedMeals[`${dayIndex}-${mealIndex}`] || original);
  };

  const handleSwap = (dayIndex: number, mealIndex: number, newMeal: MealPlanMeal) => {
    setSwappedMeals((prev) => ({ ...prev, [`${dayIndex}-${mealIndex}`]: newMeal }));
    setSubstituteOpen(null);
  };

  const handleShuffleDay = (dayIndex: number) => {
    if (!mealPlan) return;
    const day = mealPlan.weeklyPlan[dayIndex];
    const updates: Record<string, MealPlanMeal> = {};
    day.meals.forEach((m, mealIndex) => {
      const pool = SUBSTITUTE_MEALS[m.type] || SUBSTITUTE_MEALS.dinner;
      const random = pool[Math.floor(Math.random() * pool.length)];
      updates[`${dayIndex}-${mealIndex}`] = random;
    });
    setSwappedMeals((prev) => ({ ...prev, ...updates }));
    toast({ title: `${day.day} shuffled`, description: "Meals replaced from alternates." });
  };

  const toggleCooked = (key: string) => {
    setCookedMeals((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
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
      if (navigator.share) {
        await navigator.share({ title: selectedMeal.name, text });
      } else {
        await navigator.clipboard.writeText(text);
        toast({ title: "Copied to clipboard", description: "Recipe copied — paste anywhere." });
      }
    } catch {
      // user cancelled
    }
  };

  const getSwapCostImpact = () => {
    if (!mealPlan) return 0;
    let diff = 0;
    for (const [key, newMeal] of Object.entries(swappedMeals)) {
      const [dayIdx, mealIdx] = key.split("-").map(Number);
      const originalMeal = mealPlan.weeklyPlan[dayIdx]?.meals[mealIdx];
      if (originalMeal) {
        diff += (newMeal.estimatedCost || 0) - (originalMeal.estimatedCost || 0);
      }
    }
    return diff;
  };

  const handleRegenerate = async () => {
    if (mealPlan) setPreviousPlan(mealPlan);
    setSwappedMeals({});
    await generate();
  };

  const handleRestorePrevious = () => {
    if (previousPlan) {
      setMealPlan(previousPlan);
      setPreviousPlan(null);
    }
  };

  if (loading || (generating && !mealPlan)) return <MealPlanSkeleton stage={generating ? generationStage : "idle"} />;

  if (!mealPlan) {
    return (
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="bg-gradient-to-b from-primary/5 to-transparent border border-primary/15 rounded-3xl p-8 md:p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CalendarDays className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Let's plan your week</h1>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            We'll build a 6-day meal plan and grocery list tuned to your budget, household size, and home store. Takes about 15 seconds.
          </p>
          <Button onClick={generate} disabled={generating} className="bg-gradient-honey text-primary-foreground hover:opacity-90 h-12 px-6 rounded-xl">
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : "Generate Meal Plan"}
          </Button>
          <p className="text-[11px] text-muted-foreground mt-4">
            Sunday is your rest day. Update preferences in <span className="text-foreground font-medium">Settings</span> anytime.
          </p>
        </div>
        <MealPlanHistory />
      </div>
    );
  }

  const weeklyTotal = mealPlan.totalEstimatedCost ?? 0;
  const dailyAvg = weeklyTotal / 7;
  const totalMeals = mealPlan.weeklyPlan.reduce((n, d) => n + d.meals.length, 0);
  const cookedCount = mealPlan.weeklyPlan.reduce(
    (n, d, di) => n + d.meals.filter((_, mi) => cookedMeals.has(`${di}-${mi}`)).length,
    0
  );

  return (
    <div className="max-w-6xl mx-auto space-y-5 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-lg md:text-2xl font-bold text-foreground flex items-center gap-2">
          <CalendarDays className="w-5 h-5 md:w-6 md:h-6 text-primary" /> Weekly Meal Plan
        </h1>

        {/* Weekly cost display + cooked progress */}
        <div className="flex items-center gap-4 mt-2 flex-wrap">
          <div>
            <p className="text-xs text-muted-foreground">Weekly Total</p>
            <p className="text-lg font-bold text-primary">${weeklyTotal.toFixed(2)}</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-xs text-muted-foreground">Daily Average</p>
            <p className="text-lg font-bold text-foreground">${dailyAvg.toFixed(2)}</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-xs text-muted-foreground">Meals</p>
            <p className="text-lg font-bold text-foreground">{totalMeals}</p>
          </div>
          <div className="w-px h-8 bg-border" />
          <div>
            <p className="text-xs text-muted-foreground">Cooked</p>
            <p className="text-lg font-bold text-accent">{cookedCount}/{totalMeals}</p>
          </div>
        </div>
      </div>

      {/* Swap Cost Impact Banner */}
      {Object.keys(swappedMeals).length > 0 && (() => {
        const impact = getSwapCostImpact();
        return (
          <div className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium ${impact > 0 ? 'bg-destructive/10 text-destructive' : impact < 0 ? 'bg-accent/10 text-accent' : 'bg-muted text-muted-foreground'}`}>
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              {impact > 0
                ? `Swaps add +$${impact.toFixed(2)} to grocery cost`
                : impact < 0
                  ? `Swaps save $${Math.abs(impact).toFixed(2)} on grocery cost`
                  : "Swaps have no cost impact"}
            </span>
          </div>
        );
      })()}

      {/* Prioritize sales toggle */}
      <div className="flex items-center justify-between bg-accent/5 border border-accent/20 rounded-xl px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Tag className="w-4 h-4 text-accent shrink-0" />
          <div className="min-w-0">
            <Label htmlFor="prioritize-sales" className="text-sm font-semibold text-foreground cursor-pointer">Prioritize sales</Label>
            <p className="text-[11px] text-muted-foreground">Bias next plan toward items on sale at your store</p>
          </div>
        </div>
        <Switch id="prioritize-sales" checked={prioritizeSales} onCheckedChange={setPrioritizeSales} />
      </div>

      {/* Regenerate + Restore buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleRegenerate}
          disabled={generating}
          variant="outline"
          className="flex-1 h-12 text-sm font-semibold rounded-xl"
        >
          {generating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {generationStage === "preparing" ? "Preparing…" : generationStage === "generating" ? "AI generating…" : generationStage === "saving" ? "Saving…" : "Regenerating…"}
            </>
          ) : (
            <><RefreshCw className="w-4 h-4 mr-2" /> Regenerate Meal Plan</>
          )}
        </Button>
        {previousPlan && (
          <Button
            onClick={handleRestorePrevious}
            variant="outline"
            className="h-12 text-sm font-semibold rounded-xl px-4"
          >
            <Undo2 className="w-4 h-4 mr-1.5" /> Restore Previous
          </Button>
        )}
      </div>

      <AnimatePresence>
      {mealPlan.weeklyPlan.map((day, dayIndex) => (
        <motion.div
          key={day.day}
          className="space-y-2 md:space-y-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: dayIndex * 0.06 }}
        >
          <div className="flex items-center justify-between">
            <h2 className="font-display text-sm md:text-lg font-semibold text-foreground flex items-center gap-1.5">
              <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs md:text-sm font-bold">{day.day}</span>
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleShuffleDay(dayIndex)}
              className="text-xs text-muted-foreground hover:text-primary h-7 px-2"
            >
              <Shuffle className="w-3 h-3 mr-1" /> Shuffle day
            </Button>
          </div>
          <div
            className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-1 px-1 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:pb-0 md:mx-0 md:px-0"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {day.meals.map((originalMeal, mealIndex) => {
              const meal = getMeal(dayIndex, mealIndex, originalMeal);
              const cookedKey = `${dayIndex}-${mealIndex}`;
              const isCooked = cookedMeals.has(cookedKey);
              return (
                <div key={`${day.day}-${mealIndex}`} className="snap-start shrink-0 w-[155px] md:w-auto md:shrink">
                  <button
                    onClick={() => setSelectedMeal(meal)}
                    className={`bg-card rounded-2xl border shadow-card overflow-hidden w-[155px] h-[120px] md:w-full md:h-auto text-left hover:shadow-elevated transition-all group relative ${isCooked ? 'border-accent/40 opacity-75' : 'border-border'}`}
                  >
                    {isCooked && (
                      <div className="absolute top-1 right-1 z-10 w-5 h-5 rounded-full bg-accent flex items-center justify-center shadow-md">
                        <Check className="w-3 h-3 text-accent-foreground" strokeWidth={3} />
                      </div>
                    )}
                    <div className="relative h-[70px] md:h-24 overflow-hidden">
                      <img
                        src={getMealImage(meal.name)}
                        alt={meal.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                       onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                      />
                      <div className="absolute top-1 left-1">
                        <span className="bg-primary/90 text-primary-foreground text-[8px] md:text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase">{meal.type}</span>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                        <p className="text-white text-[9px] md:text-sm font-semibold line-clamp-2 leading-tight">{meal.name}</p>
                      </div>
                    </div>
                    <div className="p-1.5 md:p-3 flex items-center gap-2 text-[9px] md:text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Flame className="w-2.5 h-2.5 text-primary" />{meal.calories} cal</span>
                      {meal.costPerServing != null ? (
                        <span className="flex items-center gap-0.5 text-primary font-medium">
                          <DollarSign className="w-2 h-2" />{meal.costPerServing.toFixed(2)}/srv
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </div>
                  </button>
                  {/* Swap + Cooked buttons */}
                  <div className="flex gap-1 mt-1 md:mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-[9px] h-7 px-1 md:text-xs md:h-8 md:px-2 rounded-lg"
                      onClick={() => setSubstituteOpen({ dayIndex, mealIndex })}
                    >
                      <Shuffle className="w-2.5 h-2.5 mr-0.5 md:w-3 md:h-3" /> Swap
                    </Button>
                    <Button
                      variant={isCooked ? "default" : "outline"}
                      size="sm"
                      className={`text-[9px] h-7 px-2 md:text-xs md:h-8 md:px-2 rounded-lg ${isCooked ? 'bg-accent text-accent-foreground hover:bg-accent/90' : ''}`}
                      onClick={() => toggleCooked(cookedKey)}
                      aria-label={isCooked ? "Mark as not cooked" : "Mark as cooked"}
                    >
                      <Check className="w-2.5 h-2.5 md:w-3 md:h-3" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      ))}
      </AnimatePresence>

      {/* Full Recipe Dialog with cooking mode */}
      <Dialog open={!!selectedMeal} onOpenChange={() => setSelectedMeal(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedMeal && (
            <>
              <button
                onClick={() => setSelectedMeal(null)}
                className="absolute top-3 right-3 z-10 w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>

              {!cookingMode && (
                <div className="rounded-xl overflow-hidden -mx-2 -mt-2 mb-3">
                  <img
                    src={getMealImage(selectedMeal.name)}
                    alt={selectedMeal.name}
                    className="w-full h-48 object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = PLACEHOLDER_IMAGE; }}
                  />
                </div>
              )}

              <DialogHeader>
                <DialogTitle className="font-display text-xl pr-12">{selectedMeal.name}</DialogTitle>
              </DialogHeader>

              {cookingMode ? (
                <div className="space-y-4">
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wide text-primary font-semibold mb-2">
                      Step {currentStep + 1} of {selectedMeal.instructions.length}
                    </p>
                    <p className="text-base text-foreground leading-relaxed">
                      {selectedMeal.instructions[currentStep]}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1 h-11 rounded-xl"
                      onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                      disabled={currentStep === 0}
                    >
                      <ArrowLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    {currentStep < selectedMeal.instructions.length - 1 ? (
                      <Button
                        className="flex-1 h-11 rounded-xl bg-gradient-honey text-primary-foreground"
                        onClick={() => setCurrentStep((s) => s + 1)}
                      >
                        Next <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    ) : (
                      <Button
                        className="flex-1 h-11 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90"
                        onClick={() => {
                          setCookingMode(false);
                          toast({ title: "Recipe complete!", description: "Mark this meal as cooked from the card." });
                        }}
                      >
                        <Check className="w-4 h-4 mr-1" /> Finish
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    className="w-full text-xs text-muted-foreground"
                    onClick={() => setCookingMode(false)}
                  >
                    Exit cooking mode
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-2 text-sm">
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1">
                      <Flame className="w-3 h-3" /> {selectedMeal.calories} cal
                    </span>
                    <span className="bg-muted px-3 py-1 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {selectedMeal.cookTimeMinutes} min
                    </span>
                    {selectedMeal.costPerServing != null && (
                      <span className="bg-accent/10 text-accent px-3 py-1 rounded-full flex items-center gap-1 font-semibold">
                        <DollarSign className="w-3 h-3" /> ${(selectedMeal.costPerServing * servings).toFixed(2)}{servings > 1 ? ` total` : '/serving'}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-muted rounded-lg p-2"><p className="font-bold text-foreground">{selectedMeal.protein * servings}g</p><p className="text-muted-foreground">Protein</p></div>
                    <div className="bg-muted rounded-lg p-2"><p className="font-bold text-foreground">{selectedMeal.carbs * servings}g</p><p className="text-muted-foreground">Carbs</p></div>
                    <div className="bg-muted rounded-lg p-2"><p className="font-bold text-foreground">{selectedMeal.fats * servings}g</p><p className="text-muted-foreground">Fats</p></div>
                  </div>

                  {/* Servings adjuster */}
                  <div className="flex items-center justify-between bg-muted/50 rounded-xl px-3 py-2">
                    <span className="text-sm font-medium text-foreground">Servings</span>
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setServings((s) => Math.max(1, s - 1))}
                        disabled={servings <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="font-bold text-foreground w-6 text-center">{servings}</span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8 rounded-full"
                        onClick={() => setServings((s) => Math.min(12, s + 1))}
                        disabled={servings >= 12}
                      >
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
                              <button
                                onClick={() => toggleIngredient(i)}
                                className={`w-full flex items-center gap-2 text-sm text-left transition-colors ${checked ? 'text-muted-foreground line-through' : 'text-foreground'}`}
                              >
                                <span className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${checked ? 'bg-accent border-accent' : 'border-border'}`}>
                                  {checked && <Check className="w-3 h-3 text-accent-foreground" strokeWidth={3} />}
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
                            <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Action row */}
                  <div className="flex gap-2 pt-2 sticky bottom-0 bg-background pb-1">
                    {selectedMeal.instructions?.length > 0 && (
                      <Button
                        className="flex-1 h-11 rounded-xl bg-gradient-honey text-primary-foreground hover:opacity-90"
                        onClick={() => { setCookingMode(true); setCurrentStep(0); }}
                      >
                        <ChefHat className="w-4 h-4 mr-1.5" /> Start Cooking
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-11 w-11 rounded-xl shrink-0"
                      onClick={handleShare}
                      aria-label="Share recipe"
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Substitute Meal Dialog */}
      <Dialog open={!!substituteOpen} onOpenChange={() => setSubstituteOpen(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl flex items-center gap-2">
              <Shuffle className="w-5 h-5 text-primary" /> Swap Meal
            </DialogTitle>
          </DialogHeader>
          {substituteOpen && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Choose an alternative:</p>
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
                      className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-card transition-all"
                    >
                      <h4 className="font-semibold text-foreground">{alt.name}</h4>
                      <div className="flex gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> {alt.calories} cal</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {alt.cookTimeMinutes}m</span>
                        <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> ${alt.estimatedCost.toFixed(2)}</span>
                        {costDiff !== 0 && (
                          <span className={`font-semibold ${costDiff > 0 ? 'text-destructive' : 'text-accent'}`}>
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

      <MealPlanHistory />
    </div>
  );
}
