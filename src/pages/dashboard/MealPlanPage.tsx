import { useState } from "react";
import { CalendarDays, RefreshCw, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useMealPlan } from "@/contexts/MealPlanContext";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_LABELS: Record<string, string> = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner", snack: "Snack" };

const MEAL_EMOJI: Record<string, string> = {
  breakfast: "🍳", lunch: "🥗", dinner: "🍽️", snack: "🍎",
};

export default function MealPlanPage() {
  const { mealPlan, generating, generate } = useMealPlan();
  const [selectedMeal, setSelectedMeal] = useState<any>(null);

  if (!mealPlan) {
    return (
      <div className="max-w-6xl mx-auto text-center py-20">
        <CalendarDays className="w-12 h-12 text-primary mx-auto mb-4" />
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">No Meal Plan Yet</h1>
        <p className="text-muted-foreground mb-6">Generate your first AI-powered meal plan</p>
        <Button onClick={generate} disabled={generating} className="bg-gradient-honey text-primary-foreground hover:opacity-90">
          {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : "Generate Meal Plan"}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" /> Weekly Meal Plan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Total: ${mealPlan.totalEstimatedCost?.toFixed(2)} • {mealPlan.weeklyPlan.reduce((n, d) => n + d.meals.length, 0)} meals
          </p>
        </div>
        <Button onClick={generate} disabled={generating} variant="outline" size="sm">
          {generating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Regenerate Plan
        </Button>
      </div>

      <div className="space-y-4">
        {mealPlan.weeklyPlan.map((day) => (
          <div key={day.day} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="bg-muted/50 px-5 py-3 border-b border-border">
              <h2 className="font-display text-lg font-semibold text-foreground">{day.day}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
              {day.meals.map((meal, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedMeal(meal)}
                  className="p-4 text-left hover:bg-muted/20 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{MEAL_EMOJI[meal.type] || "🍽️"}</span>
                    <div>
                      <p className="text-xs text-muted-foreground font-medium uppercase">
                        {MEAL_LABELS[meal.type] || meal.type}
                      </p>
                      <h3 className="font-semibold text-foreground">{meal.name}</h3>
                    </div>
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                    <span>{meal.calories} cal</span>
                    <span>{meal.protein}g P</span>
                    <span>{meal.carbs}g C</span>
                    <span>{meal.fats}g F</span>
                    <span className="text-primary font-medium">${meal.estimatedCost?.toFixed(2)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedMeal} onOpenChange={() => setSelectedMeal(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          {selectedMeal && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{selectedMeal.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">{selectedMeal.calories} cal</span>
                  <span className="bg-muted px-3 py-1 rounded-full">{selectedMeal.protein}g protein</span>
                  <span className="bg-muted px-3 py-1 rounded-full">{selectedMeal.carbs}g carbs</span>
                  <span className="bg-muted px-3 py-1 rounded-full">{selectedMeal.fats}g fats</span>
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full">${selectedMeal.estimatedCost?.toFixed(2)}</span>
                  {selectedMeal.cookTimeMinutes && (
                    <span className="bg-muted px-3 py-1 rounded-full">{selectedMeal.cookTimeMinutes} min</span>
                  )}
                </div>

                {selectedMeal.ingredients?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Ingredients</h4>
                    <ul className="space-y-1">
                      {selectedMeal.ingredients.map((ing: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                          {ing}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedMeal.instructions?.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Instructions</h4>
                    <ol className="space-y-2">
                      {selectedMeal.instructions.map((step: string, i: number) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-3">
                          <span className="text-primary font-semibold">{i + 1}.</span>
                          {step}
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
    </div>
  );
}
