import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Check, X, ChefHat, Loader2, Plus, Heart, Clock, Users, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  addItemsToGroceryList,
} from "@/lib/groceryList";
import {
  addSingleIngredientToGroceryList,
  markRecipeCooked,
  sendMissingIngredientsToGroceryList,
  type GeneratedRecipe,
  type GeneratedRecipeIngredient,
  type CookTierItem,
} from "@/lib/cookFromWhatIHave";
import { trackEvent } from "@/lib/analytics";

const ALGO_VERSION = "phase_c_db_match_v1";

export default function CookRecipeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const navState = (location.state as {
    recipe?: GeneratedRecipe;
    tierItem?: CookTierItem;
  } | null) ?? null;

  const [tierItem] = useState<CookTierItem | null>(navState?.tierItem ?? null);
  const [recipe, setRecipe] = useState<GeneratedRecipe | null>(navState?.recipe ?? null);
  const [loading, setLoading] = useState(!navState?.recipe && !navState?.tierItem);
  const [adding, setAdding] = useState(false);
  const [addingRow, setAddingRow] = useState<string | null>(null);
  const [addedRows, setAddedRows] = useState<Set<string>>(new Set());
  const [cooking, setCooking] = useState(false);
  const [favorited, setFavorited] = useState(false);

  useEffect(() => {
    if (navState?.recipe || navState?.tierItem || !user || !id) return;
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
  }, [id, navState, user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#5B3FBF]" />
      </div>
    );
  }

  // ─── DB-matched (tier) detail view ─────────────────────────────────
  if (tierItem) {
    const t = tierItem;
    const handleAddMissingTier = async () => {
      if (!t.missing_items.length) {
        toast({ title: "Nothing missing", description: "You have everything for this recipe!" });
        return;
      }
      setAdding(true);
      try {
        await addItemsToGroceryList("cook_from_what_i_have", t.missing_items.map((m) => ({
          item_name: m.item_name,
          estimated_price: m.estimated_price,
          instacart_search_term: m.item_name,
          source_ref_id: t.public_recipe_id,
        })));
        toast({ title: "Added to grocery list", description: `${t.missing_items.length} items` });
      } catch (err) {
        toast({ title: "Couldn't add", description: (err as Error).message, variant: "destructive" });
      } finally {
        setAdding(false);
      }
    };

    const handleCookTier = async () => {
      setCooking(true);
      try {
        const result = await markRecipeCooked(t.public_recipe_id, {
          public_recipe_id: t.public_recipe_id,
          favorited,
        });
        const money_saved = (result as any)?.money_saved ?? 0;
        const food_waste_prevented = (result as any)?.food_waste_prevented ?? 0;
        void trackEvent("cook_recipe_cooked", {
          money_saved, food_waste_prevented,
          tier: t.tier, algorithm_version: ALGO_VERSION,
        });
        navigate(`/dashboard/cook/recipes/${t.public_recipe_id}/cooked`, {
          state: {
            recipe_name: t.recipe_name,
            updated_items: [],
            money_saved,
            food_waste_prevented,
          },
        });
      } catch (err) {
        toast({ title: "Couldn't mark cooked", description: (err as Error).message, variant: "destructive" });
      } finally {
        setCooking(false);
      }
    };

    const togglePreference = () => {
      const next = !favorited;
      setFavorited(next);
      void trackEvent("cook_preference_saved", {
        public_recipe_id: t.public_recipe_id,
        favorited: next,
        algorithm_version: ALGO_VERSION,
      });
    };

    return (
      <div className="max-w-md mx-auto px-4 pt-3 pb-32">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-[20px] font-extrabold text-[#1a1a1a]">{t.recipe_name}</h1>
          <button
            onClick={togglePreference}
            aria-label={favorited ? "Remove preference" : "Save preference"}
            className="w-10 h-10 rounded-full flex items-center justify-center border border-border"
          >
            <Heart className={`w-5 h-5 ${favorited ? "fill-[#C0392B] text-[#C0392B]" : "text-[#6b6b6b]"}`} />
          </button>
        </div>

        <div className="rounded-2xl bg-[#F5EBDC] flex items-center justify-center h-40 mb-4 overflow-hidden">
          {t.image_url ? (
            <img src={t.image_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <ChefHat className="w-16 h-16 text-[#5B3FBF]" />
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-3 text-[11px] font-bold">
          <span className="px-2 py-1 rounded-full bg-[#E8F3E4] text-[#2E7D32]">{t.pantry_match_pct}% match</span>
          <span className="px-2 py-1 rounded-full bg-[#F5EBDC] text-[#1a1a1a]">
            {t.cost_to_complete === 0 ? "$0 to cook" : `~$${t.cost_to_complete.toFixed(2)}`}
          </span>
          {t.cook_time_minutes ? (
            <span className="px-2 py-1 rounded-full bg-[#EEE] text-[#1a1a1a] inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> {(t.prep_time_minutes ?? 0) + (t.cook_time_minutes ?? 0)} min
            </span>
          ) : null}
          {t.servings ? (
            <span className="px-2 py-1 rounded-full bg-[#EEE] text-[#1a1a1a] inline-flex items-center gap-1">
              <Users className="w-3 h-3" /> {t.servings} servings
            </span>
          ) : null}
        </div>

        {t.why && (
          <div className="rounded-2xl bg-[#F4F1FE] p-3 mb-4 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-[#5B3FBF] mt-0.5 shrink-0" />
            <p className="text-[13px] text-[#1a1a1a]">{t.why}</p>
          </div>
        )}

        {t.missing_items.length > 0 && (
          <Section title="Missing" headerBg="#FDECEC" titleColor="#C0392B">
            <ul className="divide-y divide-border">
              {t.missing_items.map((m) => (
                <li key={m.item_name} className="flex items-center px-4 py-3 gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#C0392B] flex items-center justify-center shrink-0">
                    <X className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                  <span className="text-[14px] text-[#1a1a1a] font-medium flex-1">{m.item_name}</span>
                  <span className="text-[13px] text-[#6b6b6b] font-semibold">
                    ${Number(m.estimated_price).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {t.substitutions?.length > 0 && (
          <Section title="Suggested Substitutions" headerBg="#FFF3CD" titleColor="#7A5C00">
            <ul className="px-4 py-2 text-[13px] text-[#1a1a1a] space-y-1">
              {t.substitutions.map((s, i) => <li key={i}>• {s}</li>)}
            </ul>
          </Section>
        )}

        {Array.isArray(t.instructions) && t.instructions.length > 0 && (
          <Section title="Instructions" headerBg="#EEE" titleColor="#1a1a1a">
            <ol className="px-4 py-3 space-y-2 text-[14px] text-[#1a1a1a]">
              {t.instructions.map((step, i) => (
                <li key={i} className="flex gap-2">
                  <span className="font-bold text-[#5B3FBF]">{i + 1}.</span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
          </Section>
        )}

        <div className="mt-5 space-y-3">
          {t.missing_items.length > 0 && (
            <button
              onClick={handleAddMissingTier}
              disabled={adding}
              className="w-full h-[52px] rounded-2xl bg-[#5B3FBF] text-white font-bold text-[15px] disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Add Missing Items To Grocery List
            </button>
          )}
          <button
            onClick={handleCookTier}
            disabled={cooking}
            className="w-full h-[52px] rounded-2xl bg-[#1F5A3D] text-white font-bold text-[15px] disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {cooking ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            I Made This
          </button>
        </div>
      </div>
    );
  }

  // ─── Legacy generated_recipes detail (unchanged behavior + new fields) ─
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
      navigate(`/dashboard/cook/recipes/${recipe.id}/added`, { state: { recipe, added: missing } });
    } catch (err) {
      toast({ title: "Couldn't add to grocery list", description: (err as Error).message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleAddOne = async (i: GeneratedRecipeIngredient) => {
    const key = i.id ?? i.item_name;
    setAddingRow(key);
    try {
      const res = await addSingleIngredientToGroceryList(
        i,
        recipe.source_type === "food_waste" ? "food_waste" : "cook_from_what_i_have",
        recipe.id,
      );
      setAddedRows((prev) => new Set(prev).add(key));
      toast({
        title: res.merged ? "Updated in grocery list" : "Added to grocery list",
        description: i.item_name,
      });
    } catch (err) {
      toast({ title: "Couldn't add ingredient", description: (err as Error).message, variant: "destructive" });
    } finally {
      setAddingRow(null);
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
      const money_saved = result?.money_saved ?? (recipe as any).estimated_savings ?? 0;
      const food_waste_prevented = result?.food_waste_prevented ?? updated_items.length;
      void trackEvent("cook_recipe_cooked", { money_saved, food_waste_prevented, algorithm_version: ALGO_VERSION });
      navigate(`/dashboard/cook/recipes/${recipe.id}/cooked`, {
        state: { recipe_name: recipe.recipe_name, updated_items, money_saved, food_waste_prevented },
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

      <div className="rounded-2xl bg-[#F5EBDC] flex items-center justify-center h-40 mb-4">
        <ChefHat className="w-16 h-16 text-[#5B3FBF]" />
      </div>

      {(recipe.cook_time_minutes || recipe.servings) && (
        <div className="flex flex-wrap gap-2 mb-3 text-[11px] font-bold">
          {recipe.cook_time_minutes ? (
            <span className="px-2 py-1 rounded-full bg-[#EEE] text-[#1a1a1a] inline-flex items-center gap-1">
              <Clock className="w-3 h-3" /> {(recipe.prep_time_minutes ?? 0) + (recipe.cook_time_minutes ?? 0)} min
            </span>
          ) : null}
          {recipe.servings ? (
            <span className="px-2 py-1 rounded-full bg-[#EEE] text-[#1a1a1a] inline-flex items-center gap-1">
              <Users className="w-3 h-3" /> {recipe.servings} servings
            </span>
          ) : null}
        </div>
      )}

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

      {missing.length > 0 && (
        <Section title="Missing" headerBg="#FDECEC" titleColor="#C0392B">
          <ul className="divide-y divide-border">
            {missing.map((i) => {
              const key = i.id ?? i.item_name;
              const isAdded = addedRows.has(key);
              const isLoading = addingRow === key;
              return (
                <li key={key} className="flex items-center px-4 py-3 gap-3">
                  <div className="w-5 h-5 rounded-full bg-[#C0392B] flex items-center justify-center shrink-0">
                    <X className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                  <span className="text-[14px] text-[#1a1a1a] font-medium flex-1">{i.item_name}</span>
                  {i.estimated_price ? (
                    <span className="text-[13px] text-[#6b6b6b] font-semibold">
                      ${Number(i.estimated_price).toFixed(2)}
                    </span>
                  ) : null}
                  <button
                    onClick={() => handleAddOne(i)}
                    disabled={isLoading || isAdded}
                    aria-label={isAdded ? "Added to grocery list" : "Add ingredient to grocery list"}
                    className={`h-8 px-3 rounded-full text-[12px] font-bold inline-flex items-center gap-1 transition-colors ${
                      isAdded ? "bg-[#E8F3E4] text-[#2E7D32]" : "bg-[#5B3FBF] text-white disabled:opacity-60"
                    }`}
                  >
                    {isLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : isAdded ? (
                      <><Check className="w-3.5 h-3.5" strokeWidth={3} /> Added</>
                    ) : (
                      <><Plus className="w-3.5 h-3.5" strokeWidth={3} /> Add</>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {Array.isArray(recipe.instructions) && recipe.instructions.length > 0 && (
        <Section title="Instructions" headerBg="#EEE" titleColor="#1a1a1a">
          <ol className="px-4 py-3 space-y-2 text-[14px] text-[#1a1a1a]">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="flex gap-2">
                <span className="font-bold text-[#5B3FBF]">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </Section>
      )}

      {missing.length > 0 && (
        <div className="mt-4 flex items-center justify-between px-1">
          <span className="text-[14px] text-[#6b6b6b]">Estimated Missing Cost</span>
          <span className="text-[18px] font-extrabold text-[#1a1a1a]">~${missingCost.toFixed(2)}</span>
        </div>
      )}

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
