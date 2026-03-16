import { useState } from "react";
import { CalendarDays, RefreshCw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner"];

const SAMPLE_PLAN: Record<string, { name: string; image: string; calories: number; protein: number; carbs: number; fats: number; cost: number }[]> = {
  Monday: [
    { name: "Oatmeal & Banana", image: "🥣", calories: 350, protein: 12, carbs: 58, fats: 8, cost: 1.20 },
    { name: "Chicken Rice Bowl", image: "🍗", calories: 520, protein: 35, carbs: 55, fats: 14, cost: 3.50 },
    { name: "Veggie Stir Fry", image: "🥘", calories: 480, protein: 18, carbs: 45, fats: 22, cost: 2.80 },
  ],
  Tuesday: [
    { name: "Eggs & Toast", image: "🍳", calories: 380, protein: 22, carbs: 30, fats: 18, cost: 1.50 },
    { name: "Bean Burrito Bowl", image: "🌯", calories: 490, protein: 20, carbs: 62, fats: 16, cost: 2.30 },
    { name: "Pasta Primavera", image: "🍝", calories: 510, protein: 16, carbs: 65, fats: 20, cost: 2.50 },
  ],
  Wednesday: [
    { name: "Smoothie Bowl", image: "🫐", calories: 320, protein: 10, carbs: 52, fats: 8, cost: 2.00 },
    { name: "Turkey Wrap", image: "🌮", calories: 440, protein: 28, carbs: 38, fats: 18, cost: 3.00 },
    { name: "Baked Chicken Thighs", image: "🍖", calories: 550, protein: 40, carbs: 30, fats: 26, cost: 3.20 },
  ],
  Thursday: [
    { name: "Pancakes", image: "🥞", calories: 400, protein: 10, carbs: 60, fats: 14, cost: 1.40 },
    { name: "Tuna Salad", image: "🥗", calories: 380, protein: 30, carbs: 20, fats: 22, cost: 2.50 },
    { name: "Beef Tacos", image: "🌮", calories: 530, protein: 28, carbs: 42, fats: 26, cost: 3.80 },
  ],
  Friday: [
    { name: "Yogurt Parfait", image: "🍨", calories: 290, protein: 14, carbs: 42, fats: 8, cost: 1.80 },
    { name: "Grilled Cheese & Soup", image: "🧀", calories: 460, protein: 18, carbs: 48, fats: 22, cost: 2.20 },
    { name: "Fried Rice", image: "🍚", calories: 500, protein: 20, carbs: 62, fats: 18, cost: 2.40 },
  ],
  Saturday: [
    { name: "Breakfast Burritos", image: "🌯", calories: 450, protein: 24, carbs: 42, fats: 20, cost: 2.50 },
    { name: "Chicken Salad", image: "🥗", calories: 410, protein: 32, carbs: 22, fats: 22, cost: 3.00 },
    { name: "Spaghetti & Meatballs", image: "🍝", calories: 580, protein: 30, carbs: 64, fats: 22, cost: 3.50 },
  ],
  Sunday: [
    { name: "French Toast", image: "🍞", calories: 420, protein: 14, carbs: 55, fats: 16, cost: 1.60 },
    { name: "Leftover Stir Fry", image: "🥘", calories: 470, protein: 18, carbs: 45, fats: 22, cost: 0.00 },
    { name: "Slow Cooker Chili", image: "🍲", calories: 520, protein: 28, carbs: 48, fats: 20, cost: 3.00 },
  ],
};

const SWAP_OPTIONS = [
  { name: "Vegetable Stir Fry", cost: 2.40, calories: 380 },
  { name: "Black Bean Tacos", cost: 2.10, calories: 420 },
  { name: "Egg Fried Rice", cost: 1.80, calories: 450 },
];

export default function MealPlanPage() {
  const [swapOpen, setSwapOpen] = useState(false);
  const [swapTarget, setSwapTarget] = useState<{ day: string; index: number } | null>(null);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="w-6 h-6 text-primary" /> Weekly Meal Plan
          </h1>
          <p className="text-sm text-muted-foreground mt-1">March 17 – March 23, 2026</p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Regenerate Plan
        </Button>
      </div>

      <div className="space-y-4">
        {DAYS.map((day) => (
          <div key={day} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
            <div className="bg-muted/50 px-5 py-3 border-b border-border">
              <h2 className="font-display text-lg font-semibold text-foreground">{day}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
              {SAMPLE_PLAN[day]?.map((meal, i) => (
                <div key={i} className="p-4 group">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{meal.image}</span>
                      <div>
                        <p className="text-xs text-muted-foreground font-medium uppercase">{MEAL_TYPES[i]}</p>
                        <h3 className="font-semibold text-foreground">{meal.name}</h3>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                      onClick={() => { setSwapTarget({ day, index: i }); setSwapOpen(true); }}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" /> Swap
                    </Button>
                  </div>
                  <div className="flex gap-4 mt-3 text-xs text-muted-foreground">
                    <span>{meal.calories} cal</span>
                    <span>{meal.protein}g P</span>
                    <span>{meal.carbs}g C</span>
                    <span>{meal.fats}g F</span>
                    <span className="text-primary font-medium">${meal.cost.toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Swap Dialog */}
      <Dialog open={swapOpen} onOpenChange={setSwapOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Swap Meal</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">
            Choose a replacement. Your budget and grocery list will update automatically.
          </p>
          <div className="space-y-2">
            {SWAP_OPTIONS.map((opt) => (
              <button
                key={opt.name}
                onClick={() => setSwapOpen(false)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-colors"
              >
                <div>
                  <p className="font-medium text-foreground">{opt.name}</p>
                  <p className="text-xs text-muted-foreground">{opt.calories} cal • ${opt.cost.toFixed(2)}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
