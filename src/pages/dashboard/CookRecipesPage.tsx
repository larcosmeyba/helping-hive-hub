import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, ChefHat } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { generateRecipesFromInventory, type GeneratedRecipe } from "@/lib/cookFromWhatIHave";

export default function CookRecipesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const initial = (location.state as { recipes?: GeneratedRecipe[] } | null)?.recipes ?? null;
  const [recipes, setRecipes] = useState<GeneratedRecipe[]>(initial ?? []);
  const [loading, setLoading] = useState(!initial);

  useEffect(() => {
    if (initial || !user) return;
    // Fetch latest persisted recipes (last 3 suggested)
    supabase
      .from("generated_recipes")
      .select("*, generated_recipe_ingredients(*)")
      .eq("user_id", user.id)
      .eq("source_type", "cook_from_what_i_have")
      .order("created_at", { ascending: false })
      .limit(3)
      .then(({ data }) => {
        if (data && data.length) {
          setRecipes(
            data.map((r: any) => ({ ...r, ingredients: r.generated_recipe_ingredients })) as GeneratedRecipe[],
          );
          setLoading(false);
        } else {
          generateRecipesFromInventory({ count: 3 })
            .then((r) => setRecipes(r))
            .finally(() => setLoading(false));
        }
      });
  }, [initial, user]);

  const wastePrevented = recipes.reduce((s, r) => {
    const have = (r.ingredients ?? []).filter((i) => i.already_have).length;
    return s + Math.min(have, 3);
  }, 0);
  const estSavings = recipes.reduce((s, r) => s + (r.savings_estimate ?? 6), 0);

  return (
    <div className="max-w-md mx-auto px-4 pt-3 pb-28">
      <h1 className="text-center text-[20px] font-extrabold text-[#1a1a1a] mb-4">
        Meals From What You Have
      </h1>

      {/* Summary tile */}
      <div className="rounded-2xl p-4 mb-4 flex items-center justify-between" style={{ backgroundColor: "#E8F3E4" }}>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[#2E7D32] font-semibold">
            Food Waste Prevented
          </p>
          <p className="text-[18px] font-extrabold text-[#1F5A3D] leading-none mt-1">
            {wastePrevented} {wastePrevented === 1 ? "Item" : "Items"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-[#2E7D32] font-semibold">
            Estimated Savings
          </p>
          <p className="text-[18px] font-extrabold text-[#1F5A3D] leading-none mt-1">
            ${estSavings.toFixed(0)}
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#5B3FBF]" />
        </div>
      ) : (
        <div className="space-y-5">
          {(() => {
            const ready = recipes.filter(
              (r) => (r.ingredients ?? []).every((i) => i.already_have),
            );
            const needsShopping = recipes.filter(
              (r) => (r.ingredients ?? []).some((i) => !i.already_have),
            );

            const renderCard = (r: GeneratedRecipe, missingCount: number) => {
              const used = (r.ingredients ?? [])
                .filter((i) => i.already_have)
                .map((i) => i.item_name)
                .slice(0, 4);
              return (
                <button
                  key={r.id}
                  onClick={() =>
                    navigate(`/dashboard/cook/recipes/${r.id}`, { state: { recipe: r } })
                  }
                  className="w-full text-left bg-card border border-border rounded-2xl p-4 active:scale-[0.99] transition-transform flex items-start gap-3"
                >
                  <div className="w-14 h-14 rounded-xl bg-[#F5EBDC] flex items-center justify-center shrink-0">
                    <ChefHat className="w-7 h-7 text-[#5B3FBF]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-bold text-[#1a1a1a] leading-tight">
                      {r.recipe_name}
                    </p>
                    <p className="text-[12px] text-[#6b6b6b] mt-1 line-clamp-2">
                      Uses: {used.join(", ") || "Your pantry items"}
                    </p>
                    {missingCount > 0 && (
                      <p className="text-[11px] font-bold text-[#C0392B] mt-1">
                        Missing {missingCount} {missingCount === 1 ? "ingredient" : "ingredients"}
                      </p>
                    )}
                  </div>
                </button>
              );
            };

            return (
              <>
                <section>
                  <p className="text-[13px] font-extrabold text-[#2E7D32] mb-2 px-1">
                    Ready To Cook ({ready.length})
                  </p>
                  {ready.length ? (
                    <div className="space-y-3">{ready.map((r) => renderCard(r, 0))}</div>
                  ) : (
                    <p className="text-[13px] text-muted-foreground px-1 py-3">
                      No recipes can be made with what you currently have. Add more pantry items or grocery list items to unlock pantry meals.
                    </p>
                  )}
                </section>

                {needsShopping.length > 0 && (
                  <section>
                    <p className="text-[13px] font-extrabold text-[#C0392B] mb-2 px-1">
                      Missing Ingredients ({needsShopping.length})
                    </p>
                    <div className="space-y-3">
                      {needsShopping.map((r) =>
                        renderCard(
                          r,
                          (r.ingredients ?? []).filter((i) => !i.already_have).length,
                        ),
                      )}
                    </div>
                  </section>
                )}

                {recipes.length === 0 && (
                  <p className="text-center text-sm text-muted-foreground py-12">
                    No recipes yet. Add more pantry items and try again.
                  </p>
                )}
              </>
            );
          })()}
        </div>
      )}

      <button
        onClick={() => navigate("/dashboard/cook")}
        className="mt-6 w-full h-[52px] rounded-2xl bg-[#5B3FBF] text-white font-bold text-[15px]"
      >
        View More Recipes
      </button>
    </div>
  );
}
