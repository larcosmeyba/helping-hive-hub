import { useState } from "react";
import { CalendarDays, RefreshCw, Loader2, Shuffle, Clock, Flame, DollarSign, ChevronDown, ChevronUp, X, Undo2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { MealPlanSkeleton } from "@/components/dashboard/MealPlanSkeleton";
import { MealPlanHistory } from "@/components/dashboard/MealPlanHistory";
import type { MealPlanMeal, GeneratedMealPlan } from "@/types/mealPlan";

const SUBSTITUTE_MEALS: Record<string, MealPlanMeal[]> = {
  breakfast: [
    { type: "breakfast", name: "Greek Yogurt Parfait", calories: 320, protein: 18, carbs: 42, fats: 10, estimatedCost: 2.50, cookTimeMinutes: 5, ingredients: ["Greek yogurt", "Granola", "Mixed berries", "Honey"], instructions: ["Layer yogurt in a bowl", "Add granola and berries", "Drizzle with honey"] },
    { type: "breakfast", name: "Banana Oat Pancakes", calories: 380, protein: 12, carbs: 55, fats: 12, estimatedCost: 1.80, cookTimeMinutes: 15, ingredients: ["Banana", "Oats", "Eggs", "Cinnamon", "Maple syrup"], instructions: ["Blend banana, oats, eggs, and cinnamon", "Pour batter onto heated pan", "Cook 2-3 min per side", "Serve with maple syrup"] },
  ],
  lunch: [
    { type: "lunch", name: "Turkey & Avocado Wrap", calories: 450, protein: 28, carbs: 38, fats: 22, estimatedCost: 3.50, cookTimeMinutes: 10, ingredients: ["Tortilla", "Turkey deli", "Avocado", "Lettuce", "Tomato"], instructions: ["Lay out tortilla", "Layer ingredients", "Roll tightly"] },
    { type: "lunch", name: "Chickpea Salad Bowl", calories: 420, protein: 18, carbs: 52, fats: 16, estimatedCost: 2.80, cookTimeMinutes: 10, ingredients: ["Chickpeas", "Cucumber", "Cherry tomatoes", "Feta", "Lemon vinaigrette"], instructions: ["Combine all ingredients", "Toss with vinaigrette"] },
  ],
  dinner: [
    { type: "dinner", name: "Lemon Herb Chicken Thighs", calories: 520, protein: 38, carbs: 28, fats: 28, estimatedCost: 4.50, cookTimeMinutes: 35, ingredients: ["Chicken thighs", "Lemon", "Garlic", "Rosemary", "Potatoes"], instructions: ["Preheat oven to 425°F", "Season chicken", "Roast 30-35 minutes"] },
    { type: "dinner", name: "Spaghetti Bolognese", calories: 550, protein: 30, carbs: 60, fats: 20, estimatedCost: 3.80, cookTimeMinutes: 30, ingredients: ["Spaghetti", "Ground beef", "Crushed tomatoes", "Italian seasoning"], instructions: ["Cook pasta", "Brown beef", "Add tomatoes", "Simmer 15 min"] },
  ],
};

// Expanded meal image map for accurate recipe photos
const MEAL_IMAGES: Record<string, string> = {
  // Specific dishes (multi-word first for priority)
  "yogurt parfait": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop",
  parfait: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400&h=300&fit=crop",
  pancake: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop",
  waffle: "https://images.unsplash.com/photo-1562376552-0d160a2f238d?w=400&h=300&fit=crop",
  "french toast": "https://images.unsplash.com/photo-1484723091739-30a097e8f929?w=400&h=300&fit=crop",
  burrito: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=300&fit=crop",
  wrap: "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=300&fit=crop",
  quesadilla: "https://images.unsplash.com/photo-1618040996337-56904b7850b9?w=400&h=300&fit=crop",
  chili: "https://images.unsplash.com/photo-1455619452474-d2be8b1e70cd?w=400&h=300&fit=crop",
  curry: "https://images.unsplash.com/photo-1565557623262-b51c2513a641?w=400&h=300&fit=crop",
  "fried rice": "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop",
  "stir fry": "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop",
  casserole: "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&h=300&fit=crop",
  lasagna: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=400&h=300&fit=crop",
  pizza: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&h=300&fit=crop",
  burger: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
  meatball: "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400&h=300&fit=crop",
  meatloaf: "https://images.unsplash.com/photo-1544025162-d76694265947?w=400&h=300&fit=crop",
  "mac and cheese": "https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?w=400&h=300&fit=crop",
  macaroni: "https://images.unsplash.com/photo-1543339494-b4cd4f7ba686?w=400&h=300&fit=crop",
  ramen: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop",
  noodle: "https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=300&fit=crop",
  "roast potato": "https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=400&h=300&fit=crop",
  "potato wedge": "https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=400&h=300&fit=crop",
  "baked potato": "https://images.unsplash.com/photo-1568569350062-ebfa3cb195df?w=400&h=300&fit=crop",
  "mashed potato": "https://images.unsplash.com/photo-1568569350062-ebfa3cb195df?w=400&h=300&fit=crop",
  fajita: "https://images.unsplash.com/photo-1534352956036-cd81e27dd615?w=400&h=300&fit=crop",
  enchilada: "https://images.unsplash.com/photo-1534352956036-cd81e27dd615?w=400&h=300&fit=crop",
  "grilled cheese": "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop",
  "overnight oat": "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&h=300&fit=crop",
  porridge: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&h=300&fit=crop",
  shakshuka: "https://images.unsplash.com/photo-1590412200988-a436970781fa?w=400&h=300&fit=crop",
  frittata: "https://images.unsplash.com/photo-1590412200988-a436970781fa?w=400&h=300&fit=crop",
  omelet: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop",
  omelette: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop",
  bolognese: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop",
  "chicken thigh": "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop",
  "chicken breast": "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop",
  "grilled chicken": "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop",
  "roast chicken": "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop",
  "chicken soup": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop",
  "lemon herb": "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop",
  "black bean": "https://images.unsplash.com/photo-1511690743698-d9d18f7e20f1?w=400&h=300&fit=crop",
  "peanut butter": "https://images.unsplash.com/photo-1598511726623-d2e9996892f0?w=400&h=300&fit=crop",
  "banana oat": "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=400&h=300&fit=crop",
  "chickpea salad": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop",
  "turkey wrap": "https://images.unsplash.com/photo-1626700051175-6818013e1d4f?w=400&h=300&fit=crop",
  "rice bowl": "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=300&fit=crop",
  "grain bowl": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop",
  "buddha bowl": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop",
  "sheet pan": "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop",
  "one pot": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop",
  "slow cooker": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop",
  "crock pot": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop",
  jambalaya: "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=400&h=300&fit=crop",
  gumbo: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop",
  teriyaki: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop",
  "honey garlic": "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop",
  "shepherd pie": "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&h=300&fit=crop",
  "pot pie": "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=400&h=300&fit=crop",
  "fried egg": "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=300&fit=crop",
  "scrambled egg": "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=300&fit=crop",

  // Main ingredients
  chicken: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop",
  rice: "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=300&fit=crop",
  pasta: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop",
  spaghetti: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop",
  salmon: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop",
  fish: "https://images.unsplash.com/photo-1510130387422-82bed34b37e9?w=400&h=300&fit=crop",
  shrimp: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=400&h=300&fit=crop",
  salad: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop",
  soup: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop",
  stew: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop",
  egg: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=300&fit=crop",
  oatmeal: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&h=300&fit=crop",
  oat: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&h=300&fit=crop",
  sandwich: "https://images.unsplash.com/photo-1528735602780-2552fd46c7af?w=400&h=300&fit=crop",
  stir: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop",
  taco: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop",
  beef: "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=300&fit=crop",
  pork: "https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=400&h=300&fit=crop",
  bean: "https://images.unsplash.com/photo-1511690743698-d9d18f7e20f1?w=400&h=300&fit=crop",
  lentil: "https://images.unsplash.com/photo-1515543904806-615355432eb7?w=400&h=300&fit=crop",
  smoothie: "https://images.unsplash.com/photo-1502741224143-90386d7f8c82?w=400&h=300&fit=crop",
  toast: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=400&h=300&fit=crop",
  peanut: "https://images.unsplash.com/photo-1598511726623-d2e9996892f0?w=400&h=300&fit=crop",
  potato: "https://images.unsplash.com/photo-1596560548464-f010549b84d7?w=400&h=300&fit=crop",
  turkey: "https://images.unsplash.com/photo-1574672280600-4accfa404c94?w=400&h=300&fit=crop",
  tofu: "https://images.unsplash.com/photo-1628689469838-524a4a973b8e?w=400&h=300&fit=crop",
  broccoli: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=400&h=300&fit=crop",
  avocado: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400&h=300&fit=crop",
  cornbread: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&h=300&fit=crop",
  chowder: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop",
  sloppy: "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=400&h=300&fit=crop",
  skillet: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop",
};

// Neutral placeholder — shown when no keyword matches (never a random food photo)
const PLACEHOLDER_IMAGE = "https://images.unsplash.com/photo-1495195134817-aeb325a55b65?w=400&h=300&fit=crop&q=80";

function getMealImage(name: string): string {
  const lower = name.toLowerCase();
  // Check multi-word matches first (more specific)
  for (const [keyword, url] of Object.entries(MEAL_IMAGES)) {
    if (keyword.includes(" ") && lower.includes(keyword)) return url;
  }
  // Then single-word matches
  for (const [keyword, url] of Object.entries(MEAL_IMAGES)) {
    if (!keyword.includes(" ") && lower.includes(keyword)) return url;
  }
  return PLACEHOLDER_IMAGE;
}

export default function MealPlanPage() {
  const { mealPlan, setMealPlan, loading, generating, generate } = useMealPlan();
  const [selectedMeal, setSelectedMeal] = useState<MealPlanMeal | null>(null);
  const [substituteOpen, setSubstituteOpen] = useState<{ dayIndex: number; mealIndex: number } | null>(null);
  const [swappedMeals, setSwappedMeals] = useState<Record<string, MealPlanMeal>>({});
  const [previousPlan, setPreviousPlan] = useState<GeneratedMealPlan | null>(null);
  const [showRestored, setShowRestored] = useState(false);

  const getMeal = (dayIndex: number, mealIndex: number, original: MealPlanMeal) => {
    return swappedMeals[`${dayIndex}-${mealIndex}`] || original;
  };

  const handleSwap = (dayIndex: number, mealIndex: number, newMeal: MealPlanMeal) => {
    setSwappedMeals((prev) => ({ ...prev, [`${dayIndex}-${mealIndex}`]: newMeal }));
    setSubstituteOpen(null);
  };

  const handleRegenerate = async () => {
    // Save current plan before regenerating
    if (mealPlan) {
      setPreviousPlan(mealPlan);
    }
    setSwappedMeals({});
    await generate();
  };

  const handleRestorePrevious = () => {
    if (previousPlan) {
      setMealPlan(previousPlan);
      setPreviousPlan(null);
    }
  };

  if (loading) return <MealPlanSkeleton />;

  if (!mealPlan) {
    return (
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="text-center py-20">
          <CalendarDays className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">No Meal Plan Yet</h1>
          <p className="text-muted-foreground mb-6">Generate your first AI-powered meal plan</p>
          <Button onClick={generate} disabled={generating} className="bg-gradient-honey text-primary-foreground hover:opacity-90 h-12 px-6 rounded-xl">
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

  return (
    <div className="max-w-6xl mx-auto space-y-5 md:space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-lg md:text-2xl font-bold text-foreground flex items-center gap-2">
          <CalendarDays className="w-5 h-5 md:w-6 md:h-6 text-primary" /> Weekly Meal Plan
        </h1>

        {/* Weekly cost display */}
        <div className="flex items-center gap-4 mt-2">
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
        </div>
      </div>

      {/* Regenerate + Restore buttons */}
      <div className="flex gap-2">
        <Button
          onClick={handleRegenerate}
          disabled={generating}
          variant="outline"
          className="flex-1 h-12 text-sm font-semibold rounded-xl"
        >
          {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Regenerate Meal Plan
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
          <h2 className="font-display text-sm md:text-lg font-semibold text-foreground flex items-center gap-1.5">
            <span className="bg-primary/10 text-primary px-2.5 py-0.5 rounded-full text-xs md:text-sm font-bold">{day.day}</span>
          </h2>
          <div
            className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-1 px-1 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:pb-0 md:mx-0 md:px-0"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {day.meals.map((originalMeal, mealIndex) => {
              const meal = getMeal(dayIndex, mealIndex, originalMeal);
              return (
                <div key={`${day.day}-${mealIndex}`} className="snap-start shrink-0 w-[140px] md:w-auto md:shrink">
                  {/* Entire card is clickable to open recipe */}
                  <button
                    onClick={() => setSelectedMeal(meal)}
                    className="bg-card rounded-2xl border border-border shadow-card overflow-hidden w-[140px] h-[120px] md:w-full md:h-auto text-left hover:shadow-elevated transition-shadow group"
                  >
                    <div className="relative h-[70px] md:h-24 overflow-hidden">
                      <img
                        src={getMealImage(meal.name)}
                        alt={meal.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE; }}
                      />
                      <div className="absolute top-1 left-1">
                        <span className="bg-primary/90 text-primary-foreground text-[8px] md:text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase">{meal.type}</span>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                        <p className="text-white text-[10px] md:text-sm font-semibold line-clamp-1 leading-tight">{meal.name}</p>
                      </div>
                    </div>
                    <div className="p-1.5 md:p-3 flex items-center gap-2 text-[9px] md:text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Flame className="w-2.5 h-2.5 text-primary" />{meal.calories} cal</span>
                    </div>
                  </button>
                  {/* Only Swap button below card */}
                  <div className="flex mt-1 md:mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full text-[9px] h-7 px-2 md:text-xs md:h-8 md:px-2 rounded-lg"
                      onClick={() => setSubstituteOpen({ dayIndex, mealIndex })}
                    >
                      <Shuffle className="w-2.5 h-2.5 mr-0.5 md:w-3 md:h-3" /> Swap
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      ))}
      </AnimatePresence>

      {/* Full Recipe Dialog */}
      <Dialog open={!!selectedMeal} onOpenChange={() => setSelectedMeal(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedMeal && (
            <>
              {/* Large floating close button */}
              <button
                onClick={() => setSelectedMeal(null)}
                className="absolute top-3 right-3 z-10 w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
              {/* Recipe image at top */}
              <div className="rounded-xl overflow-hidden -mx-2 -mt-2 mb-3">
                <img
                  src={getMealImage(selectedMeal.name)}
                  alt={selectedMeal.name}
                  className="w-full h-48 object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMAGE; }}
                />
              </div>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{selectedMeal.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1">
                    <Flame className="w-3 h-3" /> {selectedMeal.calories} cal
                  </span>
                  <span className="bg-muted px-3 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {selectedMeal.cookTimeMinutes} min
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-muted rounded-lg p-2"><p className="font-bold text-foreground">{selectedMeal.protein}g</p><p className="text-muted-foreground">Protein</p></div>
                  <div className="bg-muted rounded-lg p-2"><p className="font-bold text-foreground">{selectedMeal.carbs}g</p><p className="text-muted-foreground">Carbs</p></div>
                  <div className="bg-muted rounded-lg p-2"><p className="font-bold text-foreground">{selectedMeal.fats}g</p><p className="text-muted-foreground">Fats</p></div>
                </div>
                {selectedMeal.ingredients?.length > 0 && (
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
              </div>
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
                const alternatives = SUBSTITUTE_MEALS[currentMeal.type] || SUBSTITUTE_MEALS.dinner;
                return alternatives.map((alt) => (
                  <button
                    key={alt.name}
                    onClick={() => handleSwap(substituteOpen.dayIndex, substituteOpen.mealIndex, alt)}
                    className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-card transition-all"
                  >
                    <h4 className="font-semibold text-foreground">{alt.name}</h4>
                    <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> {alt.calories} cal</span>
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {alt.cookTimeMinutes}m</span>
                    </div>
                  </button>
                ));
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MealPlanHistory />
    </div>
  );
}
