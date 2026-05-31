import { useState } from "react";
import { ArrowRight, X, Flame, Clock, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { SendToInstacartButton, type InstacartLineItem } from "@/components/dashboard/SendToInstacartButton";
import imgBudgetFriendly from "@/assets/category-budget-friendly.jpg";
import imgQuickMeals from "@/assets/category-quick-meals.jpg";
import imgSlowCooker from "@/assets/category-slow-cooker.jpg";
import imgPantryStaples from "@/assets/category-pantry-staples.jpg";
import imgHighProtein from "@/assets/category-high-protein.jpg";
import imgVegetarian from "@/assets/category-vegetarian.jpg";
import imgFamilyFavorites from "@/assets/category-family-favorites.jpg";
import imgCelebrations from "@/assets/category-celebrations.jpg";

// Curated stock food photography bundled with the app. Uses the user-provided
// category images in src/assets — no AI-generated photos, no remote URLs.
// Until Instacart provides per-store imagery, related categories share the
// closest matching photo.
// Real recipe photos pulled from the recipe-images storage bucket so each
// category tile shows an actual dish from that category — not AI imagery.
const SUPABASE_RECIPE_IMG = "https://ndbqbhghjsjkpgcvkvtq.supabase.co/storage/v1/object/public/recipe-images/imported";
const imgSmoothie = `${SUPABASE_RECIPE_IMG}/d839cb14-0178-4a6e-8985-d4f5f6109d6b.jpg`; // The Power Breaky Smoothie
const imgVegetarianReal = `${SUPABASE_RECIPE_IMG}/5dbc1099-ca38-4f40-8b3b-55892cc534c8.jpg`; // Salad Bowl
const imgLowCarb = `${SUPABASE_RECIPE_IMG}/519bee07-6189-410f-8774-4d502e4bb849.jpg`; // Crushed Cucumber Salad With Salmon

const CATEGORY_IMAGES: Record<string, string> = {
  "Budget Friendly": imgBudgetFriendly,
  "Quick Meals": imgQuickMeals,
  "Slow Cooker": imgSlowCooker,
  "Pantry Staples": imgPantryStaples,
  "High Protein": imgHighProtein,
  "Vegetarian": imgVegetarianReal,
  "Vegan": imgVegetarianReal,
  "Family Favorites": imgFamilyFavorites,
  "Celebrations": imgCelebrations,
  "Holiday": imgCelebrations,
  "5-Ingredient": imgQuickMeals,
  "Gluten Free": imgVegetarianReal,
  "Low Carb": imgLowCarb,
  "Smoothie": imgSmoothie,
};

// Categories that should never appear as a tile (merged into another or retired).
const HIDDEN_CATEGORIES = new Set(["Special Occasions"]);

// Remap legacy "Holiday" category from DB to "Celebrations" for display
const CATEGORY_LABEL_REMAP: Record<string, string> = {
  Holiday: "Celebrations",
};
const displayLabel = (cat: string) => CATEGORY_LABEL_REMAP[cat] ?? cat;

const DEFAULT_CATEGORY_IMAGE = CATEGORY_IMAGES["Family Favorites"];

interface Recipe {
  id: string;
  title: string;
  category: string | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fats_g: number | null;
  cook_time_minutes: number | null;
  cost_estimate: number | null;
  serving_size: number | null;
  image_url: string | null;
  ingredients: any;
  instructions: any;
  description: string | null;
}

export function RecipeCategoryTiles() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showAll, setShowAll] = useState(false);

  // Fetch distinct categories from DB
  const { data: categories = [], isLoading: catLoading } = useQuery({
    queryKey: ["recipe_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("category")
        .not("category", "is", null)
        .eq("is_public", true);
      if (error) throw error;
      const unique = [...new Set((data || []).map((r) => r.category).filter(Boolean))] as string[];
      return unique.filter((c) => !HIDDEN_CATEGORIES.has(c)).sort();
    },
  });

  // Fetch recipes for selected category
  const { data: recipes = [], isLoading: recipesLoading } = useQuery({
    queryKey: ["recipes_by_category", selectedCategory],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("recipes")
        .select("*")
        .eq("category", selectedCategory!)
        .eq("is_public", true)
        .order("title");
      if (error) throw error;
      return data as Recipe[];
    },
    enabled: !!selectedCategory,
  });

  const displayCategories = showAll ? categories : categories.slice(0, 6);

  // Fallback: if no DB categories, show hardcoded ones
  const fallbackCategories = Object.keys(CATEGORY_IMAGES);
  const effectiveCategories = categories.length > 0 ? displayCategories : (showAll ? fallbackCategories : fallbackCategories.slice(0, 6));

  const parseJsonArray = (val: any): string[] => {
    if (Array.isArray(val)) return val.map(String);
    if (typeof val === "string") {
      try { return JSON.parse(val); } catch { return []; }
    }
    return [];
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-semibold text-foreground">Recipe Categories</h2>
      </div>

      {catLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-2 gap-3"
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
        >
          {effectiveCategories.map((cat) => (
            <motion.button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="relative h-28 rounded-2xl overflow-hidden group"
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
              whileTap={{ scale: 0.97 }}
            >
              <img
                src={CATEGORY_IMAGES[displayLabel(cat)] || CATEGORY_IMAGES[cat] || DEFAULT_CATEGORY_IMAGE}
                alt={displayLabel(cat)}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
                onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_CATEGORY_IMAGE; }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-3">
                <p className="text-white font-semibold text-sm leading-tight">{displayLabel(cat)}</p>
              </div>
            </motion.button>
          ))}
        </motion.div>
      )}

      {!showAll && effectiveCategories.length >= 6 && (
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
            <DialogTitle className="font-display text-xl">{selectedCategory ? displayLabel(selectedCategory) : ""}</DialogTitle>
          </DialogHeader>
          {recipesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : recipes.length > 0 ? (
            <AnimatePresence>
              <motion.div
                className="space-y-3"
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
              >
                {recipes.map((recipe) => (
                  <motion.button
                    key={recipe.id}
                    onClick={() => setSelectedRecipe(recipe)}
                    className="w-full bg-card rounded-xl border border-border overflow-hidden text-left hover:shadow-card transition-shadow flex"
                    variants={{
                      hidden: { opacity: 0, x: -12 },
                      visible: { opacity: 1, x: 0 },
                    }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <img
                      src={recipe.image_url || DEFAULT_CATEGORY_IMAGE}
                      alt={recipe.title}
                      className="w-24 h-24 object-cover shrink-0"
                      loading="lazy"
                      onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_CATEGORY_IMAGE; }}
                    />
                    <div className="p-3 flex-1">
                      <p className="font-semibold text-foreground text-sm">{recipe.title}</p>
                      <div className="flex gap-2 mt-1.5 text-xs text-muted-foreground">
                        {recipe.calories && (
                          <span className="flex items-center gap-0.5"><Flame className="w-3 h-3" /> {recipe.calories}</span>
                        )}
                        {recipe.cook_time_minutes && (
                          <span className="flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {recipe.cook_time_minutes < 60 ? `${recipe.cook_time_minutes}m` : `${Math.floor(recipe.cook_time_minutes / 60)}h`}
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            </AnimatePresence>
          ) : (
            <p className="text-sm text-muted-foreground py-8 text-center">No recipes in this category yet.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Recipe detail dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedRecipe && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
              <button
                onClick={() => setSelectedRecipe(null)}
                className="absolute top-3 right-3 z-10 w-11 h-11 rounded-full bg-white shadow-lg flex items-center justify-center"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
              {selectedRecipe.image_url && (
                <div className="relative -mx-6 -mt-6 mb-4">
                  <img src={selectedRecipe.image_url} alt={selectedRecipe.title} className="w-full h-48 object-cover rounded-t-lg" />
                </div>
              )}
              <DialogHeader>
                <DialogTitle className="font-display text-xl">{selectedRecipe.title}</DialogTitle>
              </DialogHeader>
              {selectedRecipe.description && (
                <p className="text-sm text-muted-foreground">{selectedRecipe.description}</p>
              )}
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 text-sm">
                  {selectedRecipe.calories && (
                    <span className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1">
                      <Flame className="w-3 h-3" /> {selectedRecipe.calories} cal
                    </span>
                  )}
                  {selectedRecipe.cook_time_minutes && (
                    <span className="bg-muted px-3 py-1 rounded-full flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {selectedRecipe.cook_time_minutes < 60 ? `${selectedRecipe.cook_time_minutes}m` : `${Math.floor(selectedRecipe.cook_time_minutes / 60)}h`}
                    </span>
                  )}
                  {selectedRecipe.serving_size && (
                    <span className="bg-muted px-3 py-1 rounded-full flex items-center gap-1">
                      <Users className="w-3 h-3" /> {selectedRecipe.serving_size}
                    </span>
                  )}
                </div>
                {(selectedRecipe.protein_g || selectedRecipe.carbs_g || selectedRecipe.fats_g) && (
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="bg-muted rounded-lg p-2">
                      <p className="font-bold text-foreground">{selectedRecipe.protein_g ?? 0}g</p>
                      <p className="text-muted-foreground">Protein</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <p className="font-bold text-foreground">{selectedRecipe.carbs_g ?? 0}g</p>
                      <p className="text-muted-foreground">Carbs</p>
                    </div>
                    <div className="bg-muted rounded-lg p-2">
                      <p className="font-bold text-foreground">{selectedRecipe.fats_g ?? 0}g</p>
                      <p className="text-muted-foreground">Fats</p>
                    </div>
                  </div>
                )}
                {parseJsonArray(selectedRecipe.ingredients).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Ingredients</h4>
                    <ul className="space-y-1">
                      {parseJsonArray(selectedRecipe.ingredients).map((ing, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex items-center gap-2">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" /> {ing}
                        </li>
                      ))}
                    </ul>
                    <div className="flex flex-col items-center gap-1.5 mt-3">
                      <SendToInstacartButton
                        title={selectedRecipe.title}
                        linkType="recipe"
                        imageUrl={selectedRecipe.image_url || undefined}
                        lineItems={parseJsonArray(selectedRecipe.ingredients).map<InstacartLineItem>((ing) => ({
                          name: String(ing).replace(/^[\d./\s]+\w*\s+/, "").trim() || String(ing),
                          display_text: String(ing),
                          quantity: 1,
                          unit: "each",
                        }))}
                        instructions={parseJsonArray(selectedRecipe.instructions).map(String)}
                        label="Shop Ingredients"
                        fullWidth
                      />
                      <p className="text-[10px] leading-snug text-muted-foreground text-center px-2">
                        Opens on Instacart. Pricing and availability shown at checkout. Help The Hive may earn a small affiliate fee.
                      </p>
                    </div>
                  </div>
                )}
                {parseJsonArray(selectedRecipe.instructions).length > 0 && (
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Instructions</h4>
                    <ol className="space-y-2">
                      {parseJsonArray(selectedRecipe.instructions).map((step, i) => (
                        <li key={i} className="text-sm text-muted-foreground flex gap-3">
                          <span className="bg-primary text-primary-foreground w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0">{i + 1}</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
