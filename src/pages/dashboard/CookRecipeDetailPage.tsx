import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Check, X, ChefHat, Loader2, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  addSingleIngredientToGroceryList,
  markRecipeCooked,
  sendMissingIngredientsToGroceryList,
  type GeneratedRecipe,
  type GeneratedRecipeIngredient,
} from "@/lib/cookFromWhatIHave";

export default function CookRecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const initial = (location.state as { recipe?: GeneratedRecipe } | null)?.recipe;
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(initial ?? null);
  const [loading, setLoading] = useState(!initial);
  const [adding, setAdding] = useState(false);
  const [addingRow, setAddingRow] = useState<string | null>(null);
  const [addedRows, setAddedRows] = useState<Set<string>>(new Set());
  const [cooking, setCooking] = useState(false);

  useEffect(() => {
    if (initial || !user || !id) return;
    supabase
      .from("generated_recipes")
      .select("*, generated_recipe_ingredients(*)")
      .eq("id", id)
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setRecipe({ ...(data as any), ingredients: (data as any).generated_recipe_ingredients });
        }
        setLoading(false);
      });
  }, [id, initial, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#5B3FBF]" />
      </div>
    );
  }
  if (!recipe) {
    return <p className="text-center text-sm text-muted-foreground py-12">Recipe not found.</p>;
  }

  const ingredients = recipe.ingredients ?? [];
  const have = ingredients.filter((i) => i.already_have);
  const missing = ingredients.filter((i) => !i.already_have);
  const missingCost = missing.reduce((s, i) => s + (i.estimated_price ?? 0), 0);

  const handleAddMissing = async () => {
    if (!missing.length) {
      toast({ title: "Nothing missing", description: "You have everything for this recipe!" });
      return;
    }
    setAdding(true);
    try {
      await sendMissingIngredientsToGroceryList(recipe);
      navigate(`/dashboard/cook/recipes/${recipe.id}/added`, {
        state: { recipe, added: missing },
      });
    } catch (err) {
      toast({ title: "Couldn't add to grocery list", description: (err as Error).message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleCook = async () => {
    setCooking(true);
    try {
      const result: any = await markRecipeCooked(recipe.id);
      const updated_items = (result?.updated_items ?? []).map((u: any) => ({
        name: u.item_name ?? u.name ?? "Item",
        before: u.before ?? u.previous_quantity ?? "",
        after: u.after ?? u.new_quantity ?? (u.depleted ? "Used" : ""),
      }));
      navigate(`/dashboard/cook/recipes/${recipe.id}/cooked`, {
        state: {
          recipe_name: recipe.recipe_name,
          updated_items,
          money_saved: result?.money_saved ?? (recipe as any).estimated_savings ?? 0,
          food_waste_prevented: result?.food_waste_prevented ?? updated_items.length,
        },
      });
    } catch (err) {
      toast({ title: "Couldn't mark cooked", description: (err as Error).message, variant: "destructive" });
    } finally {
      setCooking(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-3 pb-32">
      <h1 className="text-center text-[20px] font-extrabold text-[#1a1a1a] mb-4">
        {recipe.recipe_name}
      </h1>

      {/* Hero tile */}
      <div className="rounded-2xl bg-[#F5EBDC] flex items-center justify-center h-40 mb-4">
        <ChefHat className="w-16 h-16 text-[#5B3FBF]" />
      </div>

      {/* Already Have */}
      {have.length > 0 && (
        <Section title="Already Have" headerBg="#E8F3E4" titleColor="#2E7D32">
          <ul className="divide-y divide-border">
            {have.map((i) => (
              <li key={i.item_name} className="flex items-center px-4 py-3">
                <div className="w-5 h-5 rounded-full bg-[#2E7D32] flex items-center justify-center shrink-0 mr-3">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
                <span className="text-[14px] text-[#1a1a1a] font-medium">{i.item_name}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Missing */}
      {missing.length > 0 && (
        <Section title="Missing" headerBg="#FDECEC" titleColor="#C0392B">
          <ul className="divide-y divide-border">
            {missing.map((i) => (
              <li key={i.item_name} className="flex items-center px-4 py-3">
                <div className="w-5 h-5 rounded-full bg-[#C0392B] flex items-center justify-center shrink-0 mr-3">
                  <X className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
                <span className="text-[14px] text-[#1a1a1a] font-medium flex-1">{i.item_name}</span>
                {i.estimated_price ? (
                  <span className="text-[13px] text-[#6b6b6b] font-semibold">
                    ${Number(i.estimated_price).toFixed(2)}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Cost summary */}
      {missing.length > 0 && (
        <div className="mt-4 flex items-center justify-between px-1">
          <span className="text-[14px] text-[#6b6b6b]">Estimated Missing Cost</span>
          <span className="text-[18px] font-extrabold text-[#1a1a1a]">
            ~${missingCost.toFixed(2)}
          </span>
        </div>
      )}

      {/* Buttons */}
      <div className="mt-5 space-y-3">
        {missing.length > 0 && (
          <button
            onClick={handleAddMissing}
            disabled={adding}
            className="w-full h-[52px] rounded-2xl bg-[#5B3FBF] text-white font-bold text-[15px] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            Add Missing Items To Grocery List
          </button>
        )}
        <button
          onClick={handleCook}
          disabled={cooking}
          className="w-full h-[52px] rounded-2xl bg-[#1F5A3D] text-white font-bold text-[15px] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {cooking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Cook This Meal
        </button>
      </div>
    </div>
  );
}

function Section({
  title, headerBg, titleColor, children,
}: { title: string; headerBg: string; titleColor: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden mb-3">
      <div className="px-4 py-2.5" style={{ backgroundColor: headerBg }}>
        <p className="text-[13px] font-extrabold" style={{ color: titleColor }}>{title}</p>
      </div>
      {children}
    </div>
  );
}
