import { useState } from "react";
import { BookOpen, Search, DollarSign, Clock, Users } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = ["All", "$10 Family Meals", "$15 Meals", "Quick Dinners", "Slow Cooker", "Pantry Meals", "Holiday"];

const RECIPES = [
  { title: "One-Pot Chicken & Rice", category: "$10 Family Meals", cost: 8.50, time: 35, servings: 4, calories: 520, protein: 35, carbs: 55, fats: 14, image: "🍗" },
  { title: "Budget Beef Tacos", category: "$10 Family Meals", cost: 9.20, time: 25, servings: 4, calories: 530, protein: 28, carbs: 42, fats: 26, image: "🌮" },
  { title: "Pasta Primavera", category: "$10 Family Meals", cost: 7.50, time: 20, servings: 4, calories: 480, protein: 16, carbs: 62, fats: 18, image: "🍝" },
  { title: "Salmon & Veggies", category: "$15 Meals", cost: 14.00, time: 30, servings: 4, calories: 480, protein: 38, carbs: 22, fats: 26, image: "🐟" },
  { title: "Shrimp Stir Fry", category: "$15 Meals", cost: 13.50, time: 20, servings: 4, calories: 420, protein: 30, carbs: 38, fats: 16, image: "🍤" },
  { title: "15-Minute Fried Rice", category: "Quick Dinners", cost: 6.00, time: 15, servings: 4, calories: 500, protein: 20, carbs: 62, fats: 18, image: "🍚" },
  { title: "Sheet Pan Fajitas", category: "Quick Dinners", cost: 10.00, time: 25, servings: 4, calories: 460, protein: 28, carbs: 35, fats: 22, image: "🫑" },
  { title: "Slow Cooker Chili", category: "Slow Cooker", cost: 9.00, time: 240, servings: 6, calories: 520, protein: 28, carbs: 48, fats: 20, image: "🍲" },
  { title: "Pot Roast", category: "Slow Cooker", cost: 12.00, time: 300, servings: 6, calories: 580, protein: 42, carbs: 30, fats: 28, image: "🥩" },
  { title: "Pantry Pasta", category: "Pantry Meals", cost: 4.50, time: 20, servings: 4, calories: 450, protein: 14, carbs: 60, fats: 16, image: "🍝" },
  { title: "Bean & Rice Bowls", category: "Pantry Meals", cost: 3.80, time: 15, servings: 4, calories: 420, protein: 18, carbs: 65, fats: 8, image: "🍛" },
  { title: "Holiday Ham", category: "Holiday", cost: 18.00, time: 120, servings: 8, calories: 380, protein: 32, carbs: 12, fats: 24, image: "🍖" },
];

export default function RecipesPage() {
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [search, setSearch] = useState("");

  const filtered = RECIPES.filter((r) => {
    const matchCat = selectedCategory === "All" || r.category === selectedCategory;
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" /> Recipe Library
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Budget-friendly meals for your household</p>
      </div>

      {/* Search & Categories */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search recipes..." className="pl-9" />
        </div>
      </div>
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
              selectedCategory === cat
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Recipe Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((recipe) => (
          <div key={recipe.title} className="bg-card rounded-xl border border-border shadow-card overflow-hidden hover:shadow-elevated transition-shadow cursor-pointer group">
            <div className="h-32 bg-muted/30 flex items-center justify-center text-5xl group-hover:scale-110 transition-transform">
              {recipe.image}
            </div>
            <div className="p-4">
              <Badge variant="secondary" className="text-xs mb-2">{recipe.category}</Badge>
              <h3 className="font-display font-semibold text-foreground mb-2">{recipe.title}</h3>
              <div className="flex gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" />${recipe.cost.toFixed(2)}</span>
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{recipe.time < 60 ? `${recipe.time}m` : `${Math.floor(recipe.time / 60)}h`}</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{recipe.servings} servings</span>
              </div>
              <div className="flex gap-3 text-xs text-muted-foreground mt-2">
                <span>{recipe.calories} cal</span>
                <span>{recipe.protein}g P</span>
                <span>{recipe.carbs}g C</span>
                <span>{recipe.fats}g F</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
