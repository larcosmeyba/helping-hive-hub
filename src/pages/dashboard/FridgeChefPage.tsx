import { useState } from "react";
import { Refrigerator, Sparkles, Loader2, Plus, X, ChefHat, Clock, DollarSign, Flame } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const COMMON_ITEMS = [
  "Chicken", "Rice", "Eggs", "Pasta", "Beans", "Potatoes", "Onions", "Tomatoes",
  "Cheese", "Bread", "Butter", "Milk", "Garlic", "Bell Peppers", "Frozen Veggies",
  "Ground Beef", "Tortillas", "Canned Tomatoes", "Soy Sauce", "Flour",
];

interface FridgeMeal {
  name: string;
  image?: string;
  calories: number;
  cookTime: number;
  cost: number;
  protein: number;
  carbs: number;
  fats: number;
  ingredients: string[];
  instructions: string[];
}

export default function FridgeChefPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [customItem, setCustomItem] = useState("");
  const [generating, setGenerating] = useState(false);
  const [recipes, setRecipes] = useState<FridgeMeal[]>([]);
  const [selectedRecipe, setSelectedRecipe] = useState<FridgeMeal | null>(null);

  // Load pantry items to pre-select
  const { data: pantryItems } = useQuery({
    queryKey: ["pantry_items", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pantry_items")
        .select("item_name")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data.map((i) => i.item_name);
    },
    enabled: !!user,
  });

  const toggle = (item: string) => {
    setSelectedItems((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]
    );
  };

  const addCustom = () => {
    const trimmed = customItem.trim();
    if (trimmed && !selectedItems.includes(trimmed)) {
      setSelectedItems((prev) => [...prev, trimmed]);
      setCustomItem("");
    }
  };

  const loadPantry = () => {
    if (pantryItems?.length) {
      setSelectedItems((prev) => {
        const combined = new Set([...prev, ...pantryItems]);
        return Array.from(combined);
      });
    }
  };

  const generateRecipes = async () => {
    if (selectedItems.length === 0) return;
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("fridge-chef", {
        body: { ingredients: selectedItems },
      });
      if (error) throw new Error(error.message);
      if (data?.error) throw new Error(data.error);
      setRecipes(data.recipes || []);
      if (!data.recipes?.length) {
        toast({ title: "No recipes found", description: "Try adding more ingredients.", variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="bg-primary/10 rounded-2xl p-3">
          <ChefHat className="w-8 h-8 text-primary" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">FridgeChef</h1>
          <p className="text-muted-foreground mt-1">Tell us what's in your fridge — we'll create meals using <span className="text-primary font-medium">only those ingredients</span>.</p>
        </div>
      </div>

      {/* Ingredient Selection */}
      <div className="bg-card rounded-2xl border border-border shadow-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">Select Your Ingredients</h2>
          {pantryItems && pantryItems.length > 0 && (
            <Button variant="outline" size="sm" onClick={loadPantry}>
              <Refrigerator className="w-3.5 h-3.5 mr-1.5" /> Load Pantry ({pantryItems.length})
            </Button>
          )}
        </div>

        {/* Common Items */}
        <div className="flex flex-wrap gap-2">
          {COMMON_ITEMS.map((item) => (
            <button
              key={item}
              onClick={() => toggle(item)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                selectedItems.includes(item)
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : "bg-card text-muted-foreground border-border hover:border-primary/40"
              }`}
            >
              {item}
            </button>
          ))}
        </div>

        {/* Custom Input */}
        <div className="flex gap-2">
          <Input
            value={customItem}
            onChange={(e) => setCustomItem(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addCustom()}
            placeholder="Add another ingredient..."
            className="text-sm"
          />
          <Button variant="outline" onClick={addCustom} className="shrink-0">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* Custom items display */}
        {selectedItems.filter((i) => !COMMON_ITEMS.includes(i)).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {selectedItems.filter((i) => !COMMON_ITEMS.includes(i)).map((item) => (
              <span key={item} className="flex items-center gap-1 bg-accent/10 text-accent text-sm font-medium px-3 py-1 rounded-full">
                {item}
                <button onClick={() => toggle(item)}><X className="w-3 h-3" /></button>
              </span>
            ))}
          </div>
        )}

        {/* Generate Button */}
        <Button
          onClick={generateRecipes}
          disabled={selectedItems.length === 0 || generating}
          className="w-full bg-gradient-honey text-primary-foreground hover:opacity-90 h-12 text-base"
        >
          {generating ? (
            <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Generating Recipes...</>
          ) : (
            <><Sparkles className="w-5 h-5 mr-2" /> Find Recipes ({selectedItems.length} ingredients)</>
          )}
        </Button>
      </div>

      {/* Results */}
      {recipes.length > 0 && (
        <div className="space-y-4">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Recipes You Can Make ({recipes.length})
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recipes.map((recipe, i) => (
              <button
                key={i}
                onClick={() => setSelectedRecipe(recipe)}
                className="bg-card rounded-xl border border-border shadow-card overflow-hidden text-left hover:shadow-elevated transition-shadow group"
              >
                {recipe.image && (
                  <div className="relative h-36 overflow-hidden">
                    <img src={recipe.image} alt={recipe.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-3">
                      <p className="text-white font-semibold text-sm">{recipe.name}</p>
                    </div>
                  </div>
                )}
                <div className="p-4">
                  {!recipe.image && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="bg-primary/10 rounded-lg p-2">
                        <ChefHat className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-display font-semibold text-foreground group-hover:text-primary transition-colors">{recipe.name}</h3>
                    </div>
                  )}
                  <div className="flex gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Flame className="w-3 h-3" /> {recipe.calories} cal</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {recipe.cookTime}m</span>
                    <span className="flex items-center gap-1"><DollarSign className="w-3 h-3" /> ${recipe.cost.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                    Uses: {recipe.ingredients.join(", ")}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Recipe Detail Dialog */}
      <Dialog open={!!selectedRecipe} onOpenChange={() => setSelectedRecipe(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedRecipe && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-xl flex items-center gap-2">
                  <ChefHat className="w-5 h-5 text-primary" /> {selectedRecipe.name}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2 text-sm">
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1">
                    <Flame className="w-3 h-3" /> {selectedRecipe.calories} cal
                  </span>
                  <span className="bg-muted px-3 py-1 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {selectedRecipe.cookTime} min
                  </span>
                  <span className="bg-primary/10 text-primary px-3 py-1 rounded-full flex items-center gap-1">
                    <DollarSign className="w-3 h-3" /> ${selectedRecipe.cost.toFixed(2)}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-muted rounded-lg p-2"><p className="font-bold text-foreground">{selectedRecipe.protein}g</p><p className="text-muted-foreground">Protein</p></div>
                  <div className="bg-muted rounded-lg p-2"><p className="font-bold text-foreground">{selectedRecipe.carbs}g</p><p className="text-muted-foreground">Carbs</p></div>
                  <div className="bg-muted rounded-lg p-2"><p className="font-bold text-foreground">{selectedRecipe.fats}g</p><p className="text-muted-foreground">Fats</p></div>
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
