import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, DollarSign, ShoppingCart, Package, TrendingDown, Utensils } from "lucide-react";
import { Link } from "react-router-dom";

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Sample meal data for display — in production this comes from the Hive Budget Meal Engine
const SAMPLE_MEALS = [
  { day: "Monday", meals: [{ name: "Oatmeal & Banana", cal: 350 }, { name: "Chicken Rice Bowl", cal: 520 }, { name: "Veggie Stir Fry", cal: 480 }] },
  { day: "Tuesday", meals: [{ name: "Eggs & Toast", cal: 380 }, { name: "Bean Burrito Bowl", cal: 490 }, { name: "Pasta Primavera", cal: 510 }] },
  { day: "Wednesday", meals: [{ name: "Smoothie Bowl", cal: 320 }, { name: "Turkey Wrap", cal: 440 }, { name: "Baked Chicken Thighs", cal: 550 }] },
  { day: "Thursday", meals: [{ name: "Pancakes", cal: 400 }, { name: "Tuna Salad", cal: 380 }, { name: "Beef Tacos", cal: 530 }] },
  { day: "Friday", meals: [{ name: "Yogurt Parfait", cal: 290 }, { name: "Grilled Cheese & Soup", cal: 460 }, { name: "Fried Rice", cal: 500 }] },
  { day: "Saturday", meals: [{ name: "Breakfast Burritos", cal: 450 }, { name: "Chicken Salad", cal: 410 }, { name: "Spaghetti & Meatballs", cal: 580 }] },
  { day: "Sunday", meals: [{ name: "French Toast", cal: 420 }, { name: "Leftover Stir Fry", cal: 470 }, { name: "Slow Cooker Chili", cal: 520 }] },
];

export default function DashboardHome() {
  const { user } = useAuth();

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
  const estimatedCost = 68;
  const pantrySavings = 12;
  const costPerMeal = 2.85;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome */}
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Welcome back, {profile?.display_name ?? "there"} 👋
        </h1>
        <p className="text-muted-foreground mt-1">Here's your weekly meal plan overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Weekly Budget", value: `$${budget}`, icon: DollarSign, color: "text-primary" },
          { label: "Estimated Cost", value: `$${estimatedCost}`, icon: ShoppingCart, color: "text-accent" },
          { label: "Pantry Savings", value: `$${pantrySavings}`, icon: TrendingDown, color: "text-green-600" },
          { label: "Cost per Meal", value: `$${costPerMeal}`, icon: Utensils, color: "text-primary" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-4 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Weekly Meal Plan */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-semibold text-foreground flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" /> This Week's Meals
          </h2>
          <Link to="/dashboard/meal-plan" className="text-sm text-primary hover:underline font-medium">View Full Plan →</Link>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {SAMPLE_MEALS.map((day) => (
            <div key={day.day} className="bg-card rounded-xl border border-border p-3 shadow-card">
              <h3 className="text-sm font-semibold text-foreground mb-2">{day.day}</h3>
              <div className="space-y-1.5">
                {day.meals.map((meal, i) => (
                  <div key={i} className="text-xs">
                    <p className="text-foreground font-medium truncate">{meal.name}</p>
                    <p className="text-muted-foreground">{meal.cal} cal</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link to="/dashboard/grocery-list" className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-elevated transition-shadow group">
          <ShoppingCart className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold text-foreground">Grocery List</h3>
          <p className="text-sm text-muted-foreground">View & print your shopping list</p>
        </Link>
        <Link to="/dashboard/pantry" className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-elevated transition-shadow group">
          <Package className="w-6 h-6 text-accent mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold text-foreground">Pantry</h3>
          <p className="text-sm text-muted-foreground">Track what you already have</p>
        </Link>
        <Link to="/dashboard/recipes" className="bg-card rounded-xl border border-border p-5 shadow-card hover:shadow-elevated transition-shadow group">
          <Utensils className="w-6 h-6 text-primary mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="font-semibold text-foreground">Recipes</h3>
          <p className="text-sm text-muted-foreground">Browse budget-friendly meals</p>
        </Link>
      </div>
    </div>
  );
}
