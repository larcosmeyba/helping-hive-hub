import { useState } from "react";
import { CalendarDays, RefreshCw, Loader2, Shuffle, Clock, Flame, DollarSign, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { MealCard } from "@/components/dashboard/MealCard";
import { MealPlanSkeleton } from "@/components/dashboard/MealPlanSkeleton";
import { MealPlanHistory } from "@/components/dashboard/MealPlanHistory";
import type { MealPlanMeal } from "@/types/mealPlan";

const SUBSTITUTE_MEALS: Record<string, MealPlanMeal[]> = {
  breakfast: [
    { type: "breakfast", name: "Greek Yogurt Parfait", calories: 320, protein: 18, carbs: 42, fats: 10, estimatedCost: 2.50, cookTimeMinutes: 5, ingredients: ["Greek yogurt", "Granola", "Mixed berries", "Honey"], instructions: ["Layer yogurt in a bowl", "Add granola and berries", "Drizzle with honey"] },
    { type: "breakfast", name: "Banana Oat Pancakes", calories: 380, protein: 12, carbs: 55, fats: 12, estimatedCost: 1.80, cookTimeMinutes: 15, ingredients: ["Banana", "Oats", "Eggs", "Cinnamon", "Maple syrup"], instructions: ["Blend banana, oats, eggs, and cinnamon", "Pour batter onto heated pan", "Cook 2-3 min per side", "Serve with maple syrup"] },
    { type: "breakfast", name: "Veggie Scramble", calories: 290, protein: 20, carbs: 12, fats: 18, estimatedCost: 2.20, cookTimeMinutes: 10, ingredients: ["Eggs", "Bell pepper", "Spinach", "Onion", "Cheese"], instructions: ["Sauté diced vegetables", "Add beaten eggs", "Scramble until cooked", "Top with cheese"] },
  ],
  lunch: [
    { type: "lunch", name: "Turkey & Avocado Wrap", calories: 450, protein: 28, carbs: 38, fats: 22, estimatedCost: 3.50, cookTimeMinutes: 10, ingredients: ["Tortilla", "Turkey deli", "Avocado", "Lettuce", "Tomato"], instructions: ["Lay out tortilla", "Layer turkey, sliced avocado, lettuce, and tomato", "Roll tightly and slice in half"] },
    { type: "lunch", name: "Chickpea Salad Bowl", calories: 420, protein: 18, carbs: 52, fats: 16, estimatedCost: 2.80, cookTimeMinutes: 10, ingredients: ["Chickpeas", "Cucumber", "Cherry tomatoes", "Red onion", "Feta", "Lemon vinaigrette"], instructions: ["Rinse and drain chickpeas", "Chop vegetables", "Combine all ingredients", "Toss with lemon vinaigrette"] },
    { type: "lunch", name: "Black Bean Quesadilla", calories: 480, protein: 22, carbs: 48, fats: 22, estimatedCost: 2.20, cookTimeMinutes: 12, ingredients: ["Tortillas", "Black beans", "Cheese", "Salsa", "Sour cream"], instructions: ["Mash beans and spread on tortilla", "Add cheese and fold", "Cook in pan until crispy on both sides", "Serve with salsa and sour cream"] },
  ],
  dinner: [
    { type: "dinner", name: "Lemon Herb Chicken Thighs", calories: 520, protein: 38, carbs: 28, fats: 28, estimatedCost: 4.50, cookTimeMinutes: 35, ingredients: ["Chicken thighs", "Lemon", "Garlic", "Rosemary", "Potatoes", "Olive oil"], instructions: ["Preheat oven to 425°F", "Season chicken with lemon, garlic, rosemary", "Arrange with potatoes on sheet pan", "Roast 30-35 minutes"] },
    { type: "dinner", name: "Veggie Stir Fry with Rice", calories: 450, protein: 14, carbs: 62, fats: 16, estimatedCost: 3.20, cookTimeMinutes: 20, ingredients: ["Rice", "Broccoli", "Carrots", "Snap peas", "Soy sauce", "Sesame oil", "Ginger"], instructions: ["Cook rice according to package", "Heat sesame oil in wok", "Stir-fry vegetables with ginger", "Add soy sauce and serve over rice"] },
    { type: "dinner", name: "Spaghetti Bolognese", calories: 550, protein: 30, carbs: 60, fats: 20, estimatedCost: 3.80, cookTimeMinutes: 30, ingredients: ["Spaghetti", "Ground beef", "Onion", "Garlic", "Crushed tomatoes", "Italian seasoning"], instructions: ["Cook pasta al dente", "Brown beef with onion and garlic", "Add crushed tomatoes and seasoning", "Simmer 15 minutes, serve over pasta"] },
  ],
};

export default function MealPlanPage() {
  const { mealPlan, loading, generating, generate } = useMealPlan();
  const [selectedMeal, setSelectedMeal] = useState<MealPlanMeal | null>(null);
  const [substituteOpen, setSubstituteOpen] = useState<{ dayIndex: number; mealIndex: number } | null>(null);
  const [swappedMeals, setSwappedMeals] = useState<Record<string, MealPlanMeal>>({});

  const getMeal = (dayIndex: number, mealIndex: number, original: MealPlanMeal) => {
    const key = `${dayIndex}-${mealIndex}`;
    return swappedMeals[key] || original;
  };

  const handleSwap = (dayIndex: number, mealIndex: number, newMeal: MealPlanMeal) => {
    const key = `${dayIndex}-${mealIndex}`;
    setSwappedMeals((prev) => ({ ...prev, [key]: newMeal }));
    setSubstituteOpen(null);
  };

  if (loading) {
    return <MealPlanSkeleton />;
  }

  if (!mealPlan) {
    return (
      <div className="max-w-6xl mx-auto space-y-10">
        <div className="text-center py-20">
          <CalendarDays className="w-12 h-12 text-primary mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">No Meal Plan Yet</h1>
          <p className="text-muted-foreground mb-6">Generate your first AI-powered meal plan</p>
          <Button onClick={generate} disabled={generating} className="bg-gradient-honey text-primary-foreground hover:opacity-90">
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : "Generate Meal Plan"}
          </Button>
        </div>
        <MealPlanHistory />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-5 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg md:text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-5 h-5 md:w-6 md:h-6 text-primary" /> Weekly Meal Plan
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-1">
            Total: ${mealPlan.totalEstimatedCost?.toFixed(2)} • {mealPlan.weeklyPlan.reduce((n, d) => n + d.meals.length, 0)} meals
          </p>
        </div>
        <Button onClick={generate} disabled={generating} variant="outline" size="sm" className="h-10 text-sm px-3 md:h-10 md:text-sm md:px-4 rounded-xl">
          {generating ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-1.5" />}
          Regen
        </Button>
      </div>

      {mealPlan.weeklyPlan.map((day, dayIndex) => (
        <div key={day.day} className="space-y-2 md:space-y-3">
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
                  <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden w-[140px] h-[140px] md:w-auto md:h-auto">
                    <div className="relative h-[90px] md:h-32 overflow-hidden">
                      <img
                        src={(() => {
                          const lower = meal.name.toLowerCase();
                          const images: Record<string, string> = {
                            chicken: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop",
                            rice: "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=300&fit=crop",
                            pasta: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop",
                            salmon: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop",
                            salad: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop",
                            soup: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop",
                            egg: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=400&h=300&fit=crop",
                            oatmeal: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=400&h=300&fit=crop",
                            taco: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop",
                            stir: "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop",
                            beef: "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=300&fit=crop",
                          };
                          for (const [kw, url] of Object.entries(images)) {
                            if (lower.includes(kw)) return url;
                          }
                          return "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";
                        })()}
                        alt={meal.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute top-1 left-1">
                        <span className="bg-primary/90 text-primary-foreground text-[8px] md:text-[10px] font-semibold px-1.5 py-0.5 rounded-full uppercase">{meal.type}</span>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                        <p className="text-white text-[10px] md:text-sm font-semibold line-clamp-1 leading-tight">{meal.name}</p>
                      </div>
                    </div>
                    <div className="p-1.5 md:p-3 flex items-center gap-2 text-[9px] md:text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Flame className="w-2.5 h-2.5 text-primary" />{meal.calories}</span>
                      <span className="flex items-center gap-0.5"><DollarSign className="w-2.5 h-2.5 text-accent" />${meal.estimatedCost.toFixed(0)}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 mt-1 md:gap-2 md:mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-[9px] h-7 px-2 md:text-xs md:h-8 md:px-2 rounded-lg"
                      onClick={() => setSelectedMeal(meal)}
                    >
                      Recipe
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-[9px] h-7 px-2 md:text-xs md:h-8 md:px-2 rounded-lg"
                      onClick={() => setSubstituteOpen({ dayIndex, mealIndex })}
                    >
                      <Shuffle className="w-2.5 h-2.5 mr-0.5 md:w-3 md:h-3" /> Swap
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {/* Full Recipe Dialog */}
      <Dialog open={!!selectedMeal} onOpenChange={() => setSelectedMeal(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedMeal && (
            <>
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
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> ${selectedMeal.estimatedCost?.toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-muted rounded-lg p-2">
                    <p className="font-bold text-foreground">{selectedMeal.protein}g</p>
                    <p className="text-muted-foreground">Protein</p>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <p className="font-bold text-foreground">{selectedMeal.carbs}g</p>
                    <p className="text-muted-foreground">Carbs</p>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <p className="font-bold text-foreground">{selectedMeal.fats}g</p>
                    <p className="text-muted-foreground">Fats</p>
                  </div>
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
              <Shuffle className="w-5 h-5 text-primary" /> Substitute Meal
            </DialogTitle>
          </DialogHeader>
          {substituteOpen && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Choose an alternative meal:</p>
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
                      <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> ${alt.estimatedCost.toFixed(2)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{alt.ingredients.join(", ")}</p>
                  </button>
                ));
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Meal Plan History */}
      <MealPlanHistory />
    </div>
  );
}
