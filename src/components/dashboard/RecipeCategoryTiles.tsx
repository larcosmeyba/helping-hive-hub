import { useState } from "react";
import { ArrowRight, X, Flame, Clock, Users, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";

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

const DEFAULT_CATEGORY_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400&h=300&fit=crop";

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
      return unique.sort();
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
                src={CATEGORY_IMAGES[cat] || DEFAULT_CATEGORY_IMAGE}
                alt={cat}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-3">
                <p className="text-white font-semibold text-sm leading-tight">{cat}</p>
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
            <DialogTitle className="font-display text-xl">{selectedCategory}</DialogTitle>
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
