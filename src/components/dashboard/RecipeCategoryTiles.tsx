import { useState } from "react";
import { ArrowRight, X, Flame, Clock, DollarSign, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const CATEGORY_IMAGES: Record<string, string> = {
  "Budget Friendly": "https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=400&h=300&fit=crop",
  "Quick Meals": "https://images.unsplash.com/photo-1512058564366-18510be2db19?w=400&h=300&fit=crop",
  "Slow Cooker": "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop",
  "Pantry Staples": "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&h=300&fit=crop",
  "High Protein": "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop",
  "Vegetarian": "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop",
  "Family Favorites": "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop",
  "Holiday": "https://images.unsplash.com/photo-1574672280600-4accfa404c94?w=400&h=300&fit=crop",
  "Special Occasions": "https://images.unsplash.com/photo-1558636508-e0db3814bd1d?w=400&h=300&fit=crop",
};

const RECIPES_BY_CATEGORY: Record<string, Array<{
  title: string; cost: number; time: number; servings: number; calories: number;
  protein: number; carbs: number; fats: number; image: string;
  ingredients: string[]; instructions: string[];
}>> = {
  "Budget Friendly": [
    { title: "One-Pot Chicken & Rice", cost: 8.50, time: 35, servings: 4, calories: 520, protein: 35, carbs: 55, fats: 14, image: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=400&h=300&fit=crop", ingredients: ["4 chicken thighs", "2 cups rice", "1 can diced tomatoes", "Onion", "Garlic", "Chicken broth"], instructions: ["Season chicken", "Sear until golden", "Sauté onion and garlic", "Add rice, tomatoes, broth", "Cook 20 min"] },
    { title: "Budget Beef Tacos", cost: 9.20, time: 25, servings: 4, calories: 530, protein: 28, carbs: 42, fats: 26, image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop", ingredients: ["1 lb ground beef", "Taco seasoning", "Tortillas", "Lettuce", "Tomatoes", "Cheese"], instructions: ["Brown beef", "Add seasoning", "Warm tortillas", "Assemble tacos"] },
    { title: "Pasta Primavera", cost: 7.50, time: 20, servings: 4, calories: 480, protein: 16, carbs: 62, fats: 18, image: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=300&fit=crop", ingredients: ["1 lb penne", "Zucchini", "Bell peppers", "Garlic", "Olive oil", "Parmesan"], instructions: ["Cook pasta", "Sauté vegetables", "Toss with pasta", "Top with parmesan"] },
  ],
  "Quick Meals": [
    { title: "15-Minute Fried Rice", cost: 6.00, time: 15, servings: 4, calories: 500, protein: 20, carbs: 62, fats: 18, image: "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=300&fit=crop", ingredients: ["3 cups cooked rice", "2 eggs", "Frozen peas", "Soy sauce", "Sesame oil"], instructions: ["Heat oil", "Scramble eggs", "Add rice", "Add soy sauce", "Toss together"] },
    { title: "Sheet Pan Fajitas", cost: 10.00, time: 25, servings: 4, calories: 460, protein: 28, carbs: 35, fats: 22, image: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=400&h=300&fit=crop", ingredients: ["Chicken breast", "Bell peppers", "Onion", "Fajita seasoning", "Tortillas"], instructions: ["Preheat oven 425°F", "Slice and toss with seasoning", "Roast 20 min", "Serve in tortillas"] },
  ],
  "Slow Cooker": [
    { title: "Slow Cooker Chili", cost: 9.00, time: 240, servings: 6, calories: 520, protein: 28, carbs: 48, fats: 20, image: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=400&h=300&fit=crop", ingredients: ["1 lb ground beef", "Kidney beans", "Black beans", "Diced tomatoes", "Chili powder"], instructions: ["Brown beef", "Add all to slow cooker", "Cook 6-8 hours", "Season and serve"] },
    { title: "Pot Roast", cost: 12.00, time: 300, servings: 6, calories: 580, protein: 42, carbs: 30, fats: 28, image: "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=400&h=300&fit=crop", ingredients: ["3 lb chuck roast", "Potatoes", "Carrots", "Beef broth"], instructions: ["Sear roast", "Add vegetables and broth", "Slow cook 8 hours", "Shred and serve"] },
  ],
  "Pantry Staples": [
    { title: "Bean & Rice Bowls", cost: 3.80, time: 15, servings: 4, calories: 420, protein: 18, carbs: 65, fats: 8, image: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400&h=300&fit=crop", ingredients: ["Rice", "Black beans", "Corn", "Salsa", "Lime"], instructions: ["Cook rice", "Heat beans", "Combine in bowls", "Top with salsa"] },
    { title: "Egg Fried Rice", cost: 3.00, time: 12, servings: 2, calories: 380, protein: 14, carbs: 52, fats: 12, image: "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=400&h=300&fit=crop", ingredients: ["Cooked rice", "Eggs", "Soy sauce", "Frozen peas"], instructions: ["Heat oil", "Scramble eggs", "Add rice and peas", "Season with soy sauce"] },
  ],
  "High Protein": [
    { title: "Salmon & Roasted Veggies", cost: 14.00, time: 30, servings: 4, calories: 480, protein: 38, carbs: 22, fats: 26, image: "https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400&h=300&fit=crop", ingredients: ["4 salmon fillets", "Broccoli", "Sweet potatoes", "Olive oil", "Lemon"], instructions: ["Preheat oven 400°F", "Roast veggies 15 min", "Add salmon", "Roast 12 min more"] },
    { title: "Turkey Meatballs", cost: 9.50, time: 30, servings: 4, calories: 380, protein: 32, carbs: 22, fats: 18, image: "https://images.unsplash.com/photo-1529042410759-befb1204b468?w=400&h=300&fit=crop", ingredients: ["Ground turkey", "Breadcrumbs", "Egg", "Marinara sauce", "Spaghetti"], instructions: ["Mix and form meatballs", "Bake 400°F 20 min", "Heat marinara", "Serve over spaghetti"] },
  ],
};

const ALL_CATEGORIES = Object.keys(CATEGORY_IMAGES);

export function RecipeCategoryTiles() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<typeof RECIPES_BY_CATEGORY[""][0] | null>(null);
  const [showAll, setShowAll] = useState(false);

  const displayCategories = showAll ? ALL_CATEGORIES : ALL_CATEGORIES.slice(0, 5);
  const recipes = selectedCategory ? RECIPES_BY_CATEGORY[selectedCategory] || [] : [];

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-semibold text-foreground">Recipe Categories</h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {displayCategories.map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className="relative h-28 rounded-2xl overflow-hidden group"
          >
            <img
              src={CATEGORY_IMAGES[cat]}
              alt={cat}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
            <div className="absolute bottom-0 inset-x-0 p-3">
              <p className="text-white font-semibold text-sm leading-tight">{cat}</p>
            </div>
          </button>
        ))}
      </div>

      {!showAll && (
        <Button
          variant="outline"
          onClick={() => setShowAll(true)}
          className="w-full mt-3 rounded-xl h-11 font-semibold"
        >
          View More Categories <ArrowRight className="w-4 h-4 ml-1.5" />
        </Button>
      )}

      {/* Category recipes dialog */}
      <Dialog open={!!selectedCategory} onOpenChange={() => setSelectedCategory(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">{selectedCategory}</DialogTitle>
          </DialogHeader>
          {recipes.length > 0 ? (
            <div className="space-y-3">
              {recipes.map((recipe) => (
                <button
                  key={recipe.title}
                  onClick={() => setSelectedRecipe(recipe)}
                  className="w-full bg-card rounded-xl border border-border overflow-hidden text-left hover:shadow-card transition-shadow flex"
                >
                  <img src={recipe.image} alt={recipe.title} className="w-24 h-24 object-cover shrink-0" loading="lazy" />
                  <div className="p-3 flex-1">
                    <p className="font-semibold text-foreground text-sm">{recipe.title}</p>
                    <div className="flex gap-2 mt-1.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5"><Flame className="w-3 h-3" /> {recipe.calories}</span>
                      <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {recipe.time < 60 ? `${recipe.time}m` : `${Math.floor(recipe.time / 60)}h`}</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No recipes in this category yet.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Recipe detail dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedRecipe && (
            <>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="absolute top-3 right-3 z-10 w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
              <div className="relative -mx-6 -mt-6 mb-4">
                <img src={selectedRecipe.image} alt={selectedRecipe.title} className="w-full h-48 object-cover rounded-t-lg" />
              </div>
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{selectedRecipe.title}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1">
                    <Flame className="w-3 h-3" /> {selectedRecipe.calories} cal
                  </span>
                  <span className="bg-muted px-3 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {selectedRecipe.time < 60 ? `${selectedRecipe.time}m` : `${Math.floor(selectedRecipe.time / 60)}h`}
                  </span>
                  <span className="bg-muted px-3 py-1 rounded-full flex items-center gap-1">
                    <Users className="w-3 h-3" /> {selectedRecipe.servings}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-muted rounded-lg p-2">
                    <p className="font-bold text-foreground">{selectedRecipe.protein}g</p>
                    <p className="text-muted-foreground">Protein</p>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <p className="font-bold text-foreground">{selectedRecipe.carbs}g</p>
                    <p className="text-muted-foreground">Carbs</p>
                  </div>
                  <div className="bg-muted rounded-lg p-2">
                    <p className="font-bold text-foreground">{selectedRecipe.fats}g</p>
                    <p className="text-muted-foreground">Fats</p>
                  </div>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Ingredients</h4>
                  <ul className="space-y-1">
                    {selectedRecipe.ingredients.map((ing, i) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" /> {ing}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-semibold text-foreground mb-2">Instructions</h4>
                  <ol className="space-y-2">
                    {selectedRecipe.instructions.map((step, i) => (
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
    </div>
  );
}
