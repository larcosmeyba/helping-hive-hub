import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Loader2, ChefHat, Sparkles, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  generateRecipesFromInventory,
  cookFromInventoryV2,
  type GeneratedRecipe,
  type CookTierItem,
  type CookFromInventoryResponse,
} from "@/lib/cookFromWhatIHave";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { trackEvent } from "@/lib/analytics";

const ALGO_VERSION = "phase_c_db_match_v1";

type NavState = {
  recipes?: GeneratedRecipe[];
  cook?: CookFromInventoryResponse;
};

export default function CookRecipesPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const flagOn = useFeatureFlag("new-meal-plan-algorithm");
  const initial = (location.state as NavState | null) ?? null;
  const [cook, setCook] = useState<CookFromInventoryResponse | null>(initial?.cook ?? null);
  const [legacyRecipes, setLegacyRecipes] = useState<GeneratedRecipe[]>(initial?.recipes ?? []);
  const [loading, setLoading] = useState(!initial?.cook && !initial?.recipes);

  useEffect(() => {
    if (!user || cook || legacyRecipes.length) return;
    if (flagOn) {
      cookFromInventoryV2({ count: 5 })
        .then((resp) => setCook(resp))
        .finally(() => setLoading(false));
    } else {
      // Legacy: pull last persisted suggestions, generate if empty.
      supabase
        .from("generated_recipes")
        .select("*, generated_recipe_ingredients(*)")
        .eq("user_id", user.id)
        .eq("source_type", "cook_from_what_i_have")
        .order("created_at", { ascending: false })
        .limit(3)
        .then(({ data }) => {
          if (data && data.length) {
            setLegacyRecipes(
              data.map((r: any) => ({ ...r, ingredients: r.generated_recipe_ingredients })) as GeneratedRecipe[],
            );
            setLoading(false);
          } else {
            generateRecipesFromInventory({ count: 3 })
              .then((r) => setLegacyRecipes(r))
              .finally(() => setLoading(false));
          }
        });
    }
  }, [user, flagOn, cook, legacyRecipes.length]);

  const tierCounts = useMemo(() => ({
    make_now: cook?.tiers?.make_now.length ?? 0,
    need_1: cook?.tiers?.need_1.length ?? 0,
    need_2_3: cook?.tiers?.need_2_3.length ?? 0,
  }), [cook]);

  // Emit cook_results_viewed once when results land.
  useEffect(() => {
    if (!cook) return;
    void trackEvent("cook_results_viewed", {
      source: cook.source,
      ...tierCounts,
      algorithm_version: ALGO_VERSION,
    });
    if (cook.source === "ai_fallback") {
      void trackEvent("cook_ai_fallback_used", { algorithm_version: ALGO_VERSION });
    }
  }, [cook, tierCounts]);

  const openTierRecipe = (t: CookTierItem) => {
    void trackEvent("cook_recipe_opened", {
      tier: t.tier,
      pantry_match_pct: t.pantry_match_pct,
      missing_count: t.missing_count,
      source: cook?.source,
      algorithm_version: ALGO_VERSION,
    });
    navigate(`/dashboard/cook/recipes/${t.public_recipe_id}`, {
      state: { tierItem: t },
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#5B3FBF]" />
      </div>
    );
  }

  // ─── 3-tier UI (new) ──────────────────────────────────────────────
  if (cook?.tiers) {
    const { make_now, need_1, need_2_3 } = cook.tiers;
    const totalSavings = [...make_now, ...need_1, ...need_2_3].reduce(
      (s, r) => s + Math.max(0, 12 - r.cost_to_complete), 0,
    );
    return (
      <div className="max-w-md mx-auto px-4 pt-3 pb-28">
        <h1 className="text-center text-[20px] font-extrabold text-[#1a1a1a] mb-1">
          Meals From What You Have
        </h1>
        <p className="text-center text-[12px] text-muted-foreground mb-4">
          {cook.source === "ai_fallback" ? "AI-suggested ideas" : "Matched to your pantry"}
        </p>

        <div className="rounded-2xl p-4 mb-4 flex items-center justify-between" style={{ backgroundColor: "#E8F3E4" }}>
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[#2E7D32] font-semibold">Ready Right Now</p>
            <p className="text-[18px] font-extrabold text-[#1F5A3D] leading-none mt-1">
              {make_now.length} {make_now.length === 1 ? "meal" : "meals"}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[11px] uppercase tracking-wide text-[#2E7D32] font-semibold">Est. Savings</p>
            <p className="text-[18px] font-extrabold text-[#1F5A3D] leading-none mt-1">
              ~${totalSavings.toFixed(0)}
            </p>
          </div>
        </div>

        <TierSection
          label="Make Right Now"
          color="#2E7D32"
          items={make_now}
          onOpen={openTierRecipe}
          emptyText="No fully-stocked recipes yet — add more pantry items."
        />
        <TierSection
          label="Need 1 Item"
          color="#C77F00"
          items={need_1}
          onOpen={openTierRecipe}
          emptyText="Nothing one-step-away in your pantry."
        />
        <TierSection
          label="Need 2–3 Items"
          color="#C0392B"
          items={need_2_3}
          onOpen={openTierRecipe}
          emptyText="No close matches. Try adding to your pantry."
        />

        <button
          onClick={() => navigate("/dashboard/cook")}
          className="mt-6 w-full h-[52px] rounded-2xl bg-[#5B3FBF] text-white font-bold text-[15px]"
        >
          View More Recipes
        </button>
      </div>
    );
  }

  // ─── Legacy 2-bucket UI (flag OFF) ────────────────────────────────
  const recipes = legacyRecipes;
  const wastePrevented = recipes.reduce((s, r) => {
    const have = (r.ingredients ?? []).filter((i) => i.already_have).length;
    return s + Math.min(have, 3);
  }, 0);
  const estSavings = recipes.reduce((s, r) => s + (r.savings_estimate ?? 6), 0);

  const ready = recipes.filter((r) => (r.ingredients ?? []).every((i) => i.already_have));
  const needsShopping = recipes.filter((r) => (r.ingredients ?? []).some((i) => !i.already_have));

  const renderLegacy = (r: GeneratedRecipe, missingCount: number) => {
    const used = (r.ingredients ?? []).filter((i) => i.already_have).map((i) => i.item_name).slice(0, 4);
    return (
      <button
        key={r.id}
        onClick={() => navigate(`/dashboard/cook/recipes/${r.id}`, { state: { recipe: r } })}
        className="w-full text-left bg-card border border-border rounded-2xl p-4 active:scale-[0.99] transition-transform flex items-start gap-3"
      >
        <div className="w-14 h-14 rounded-xl bg-[#F5EBDC] flex items-center justify-center shrink-0">
          <ChefHat className="w-7 h-7 text-[#5B3FBF]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-bold text-[#1a1a1a] leading-tight">{r.recipe_name}</p>
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
    <div className="max-w-md mx-auto px-4 pt-3 pb-28">
      <h1 className="text-center text-[20px] font-extrabold text-[#1a1a1a] mb-4">
        Meals From What You Have
      </h1>
      <div className="rounded-2xl p-4 mb-4 flex items-center justify-between" style={{ backgroundColor: "#E8F3E4" }}>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-[#2E7D32] font-semibold">Food Waste Prevented</p>
          <p className="text-[18px] font-extrabold text-[#1F5A3D] leading-none mt-1">
            {wastePrevented} {wastePrevented === 1 ? "Item" : "Items"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[11px] uppercase tracking-wide text-[#2E7D32] font-semibold">Estimated Savings</p>
          <p className="text-[18px] font-extrabold text-[#1F5A3D] leading-none mt-1">
            ${estSavings.toFixed(0)}
          </p>
        </div>
      </div>
      <div className="space-y-5">
        <section>
          <p className="text-[13px] font-extrabold text-[#2E7D32] mb-2 px-1">
            Ready To Cook ({ready.length})
          </p>
          {ready.length ? (
            <div className="space-y-3">{ready.map((r) => renderLegacy(r, 0))}</div>
          ) : (
            <p className="text-[13px] text-muted-foreground px-1 py-3">
              No recipes can be made with what you currently have.
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
                renderLegacy(r, (r.ingredients ?? []).filter((i) => !i.already_have).length),
              )}
            </div>
          </section>
        )}
      </div>
      <button
        onClick={() => navigate("/dashboard/cook")}
        className="mt-6 w-full h-[52px] rounded-2xl bg-[#5B3FBF] text-white font-bold text-[15px]"
      >
        View More Recipes
      </button>
    </div>
  );
}

function TierSection({
  label, color, items, onOpen, emptyText,
}: {
  label: string;
  color: string;
  items: CookTierItem[];
  onOpen: (t: CookTierItem) => void;
  emptyText: string;
}) {
  return (
    <section className="mb-5">
      <p className="text-[13px] font-extrabold mb-2 px-1" style={{ color }}>
        {label} ({items.length})
      </p>
      {items.length === 0 ? (
        <p className="text-[12px] text-muted-foreground px-1 py-2">{emptyText}</p>
      ) : (
        <div className="space-y-3">
          {items.map((t) => (
            <button
              key={t.public_recipe_id}
              onClick={() => onOpen(t)}
              className="w-full text-left bg-card border border-border rounded-2xl p-4 active:scale-[0.99] transition-transform flex items-start gap-3"
            >
              <div className="w-14 h-14 rounded-xl bg-[#F5EBDC] flex items-center justify-center shrink-0 overflow-hidden">
                {t.image_url ? (
                  <img src={t.image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <ChefHat className="w-7 h-7 text-[#5B3FBF]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-bold text-[#1a1a1a] leading-tight">{t.recipe_name}</p>
                <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] font-bold">
                  <span className="px-2 py-0.5 rounded-full bg-[#E8F3E4] text-[#2E7D32]">
                    {t.pantry_match_pct}% match
                  </span>
                  <span className="px-2 py-0.5 rounded-full bg-[#F5EBDC] text-[#1a1a1a]">
                    {t.cost_to_complete === 0 ? "$0 to cook" : `$${t.cost_to_complete.toFixed(2)} to complete`}
                  </span>
                  {t.uses_expiring > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-[#FFF3CD] text-[#7A5C00] inline-flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Saves {t.uses_expiring}
                    </span>
                  )}
                </div>
                {t.why && (
                  <p className="text-[12px] text-[#6b6b6b] mt-1.5 line-clamp-2 inline-flex items-start gap-1">
                    <Sparkles className="w-3 h-3 mt-0.5 shrink-0 text-[#5B3FBF]" />
                    <span>{t.why}</span>
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
