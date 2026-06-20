// Deterministic meal-plan optimizer ("algo_v2").
//
// Pure module: no Supabase, no network, no Math.random. Same inputs → same
// output every run. Operates on data already loaded by generate-meal-plan
// and returns an internal selection in the same shape that the AI engine's
// `parsed.days` produces, so downstream pricing / save / normalize code is
// unchanged.
//
// Hybrid_v1 is unaffected; this is only invoked when the request resolves
// algorithmVersion === "algo_v2" (PostHog flag `new-meal-plan-algorithm`).

// =========================================================
// Weights (tunable). Keep here as named constants per spec.
// =========================================================
export const PANTRY_WEIGHT = 8;
export const EXPIRING_BONUS = 6;       // per expiring-soon match
export const BUDGET_WEIGHT = 4;        // applied to (avgCost - marginalCost)
export const VARIETY_WEIGHT = 5;       // per repeated protein / cuisine
export const RECENT_PENALTY = 12;      // if recipe id used recently
export const MACRO_WEIGHT = 0.05;      // small secondary bonus

export type MealType = "breakfast" | "lunch" | "dinner";

export interface OptimizerCandidate {
  id: string;
  title?: string | null;
  meal_type?: MealType | string | null;
  cost_per_serving?: number | null;
  ingredients?: any[] | null;
  tags?: string[] | null;
  kid_friendly?: boolean | null;
  family_friendly?: boolean | null;
  calories?: number | null;
  protein_g?: number | null;
  [key: string]: any;
}

export interface OptimizerPantryItem {
  normalized_name?: string | null;
  item_name?: string | null;
  freshness_status?: string | null;
  location?: string | null;
}

export interface OptimizerProfile {
  household_size: number;
  weekly_budget: number;
  allergies: string[];
  dietary_preferences: string[];
  disliked_foods?: string[];
  children_5_to_12?: number;
}

export interface OptimizerSlot {
  day_name: string;
  meal_type: MealType;
}

export interface OptimizerInputs {
  candidates: Record<MealType, OptimizerCandidate[]>;
  pantryItems: OptimizerPantryItem[];
  expiringSoon: OptimizerPantryItem[];
  profile: OptimizerProfile;
  recentRecipeIds: string[];
  slots: OptimizerSlot[];
  // Hard-filter helpers — passed in so this module stays free of project
  // helpers / imports. Each should return true if the recipe violates the
  // constraint and must be excluded.
  recipeContainsAny: (recipe: OptimizerCandidate, terms: string[]) => boolean;
  allergyTerms: string[];
  dietForbidden: string[];
  dislikedTerms: string[];
}

export interface OptimizerSelection {
  day_name: string;
  meal_type: MealType;
  recipe_id: string;
  reason: string;
}

export interface OptimizerDebug {
  pantry_items_used: number;
  expiring_items_used: number;
  variety_score: number;
  budget_subtotal: number;
  swaps_made: number;
  ai_fill_count: number;
  unfilled_slots: OptimizerSlot[];
}

export interface OptimizerResult {
  selections: OptimizerSelection[];
  // `parsed`-style structure the existing generate-meal-plan resolver consumes.
  parsed: {
    days: Array<{
      day_name: string;
      breakfast?: { library_recipe_id: string; reason?: string };
      lunch?: { library_recipe_id: string; reason?: string };
      dinner?: { library_recipe_id: string; reason?: string };
    }>;
    why_this_plan: Record<string, unknown>;
  };
  debug: OptimizerDebug;
}

const FALLBACK_COST = 3.5;

function norm(s: string | null | undefined): string {
  return String(s ?? "").toLowerCase().trim();
}

function ingredientNames(r: OptimizerCandidate): string[] {
  const ings = Array.isArray(r.ingredients) ? r.ingredients : [];
  return ings.map((i) => {
    if (typeof i === "string") return norm(i);
    return norm(i?.item_name ?? i?.name ?? "");
  }).filter(Boolean);
}

function detectProtein(r: OptimizerCandidate): string {
  const hay = norm(r.title) + " " + ingredientNames(r).join(" ");
  const proteins = ["chicken", "beef", "pork", "turkey", "salmon", "tuna", "fish", "shrimp", "tofu", "tempeh", "beans", "lentil", "egg"];
  for (const p of proteins) if (hay.includes(p)) return p;
  return "other";
}

function detectCuisine(r: OptimizerCandidate): string {
  const tags = (r.tags ?? []).map(norm);
  const cuisines = ["italian", "mexican", "asian", "chinese", "thai", "indian", "mediterranean", "american", "japanese", "korean"];
  for (const c of cuisines) if (tags.includes(c)) return c;
  const t = norm(r.title);
  for (const c of cuisines) if (t.includes(c)) return c;
  return "other";
}

function pantryOverlap(r: OptimizerCandidate, pantrySet: Set<string>): number {
  let n = 0;
  for (const name of ingredientNames(r)) {
    if (!name) continue;
    for (const p of pantrySet) {
      if (p && (name.includes(p) || p.includes(name))) { n++; break; }
    }
  }
  return n;
}

function expiringOverlap(r: OptimizerCandidate, expiringSet: Set<string>): number {
  return pantryOverlap(r, expiringSet);
}

function isFeasible(
  r: OptimizerCandidate,
  slot: OptimizerSlot,
  inputs: OptimizerInputs,
): boolean {
  if (!r?.id) return false;
  if (norm(r.meal_type) !== slot.meal_type) return false;
  const { recipeContainsAny, allergyTerms, dietForbidden, dislikedTerms } = inputs;
  if (allergyTerms.length && recipeContainsAny(r, allergyTerms)) return false;
  if (dietForbidden.length && recipeContainsAny(r, dietForbidden)) return false;
  if (dislikedTerms.length && recipeContainsAny(r, dislikedTerms)) return false;
  return true;
}

interface ScoreCtx {
  pantrySet: Set<string>;
  expiringSet: Set<string>;
  recentSet: Set<string>;
  usedProteins: Map<string, number>;
  usedCuisines: Map<string, number>;
  avgCost: number;
}

function scoreCandidate(r: OptimizerCandidate, ctx: ScoreCtx): { score: number; marginalCost: number; pantryUsed: number; expiringUsed: number } {
  const pantryUsed = pantryOverlap(r, ctx.pantrySet);
  const expiringUsed = expiringOverlap(r, ctx.expiringSet);
  const baseCost = Number(r.cost_per_serving) || FALLBACK_COST;
  // Pantry consumption discounts marginal cost by ~$0.40/ingredient.
  const marginalCost = Math.max(0, baseCost - pantryUsed * 0.4);

  let score = 0;
  score += PANTRY_WEIGHT * pantryUsed;
  score += EXPIRING_BONUS * expiringUsed;
  score += BUDGET_WEIGHT * (ctx.avgCost - marginalCost);

  const protein = detectProtein(r);
  const cuisine = detectCuisine(r);
  score -= VARIETY_WEIGHT * (ctx.usedProteins.get(protein) ?? 0);
  score -= VARIETY_WEIGHT * (ctx.usedCuisines.get(cuisine) ?? 0);
  if (ctx.recentSet.has(r.id)) score -= RECENT_PENALTY;

  score += MACRO_WEIGHT * (Number(r.protein_g) || 0);

  return { score, marginalCost, pantryUsed, expiringUsed };
}

export function runOptimizer(inputs: OptimizerInputs): OptimizerResult {
  const { candidates, pantryItems, expiringSoon, profile, recentRecipeIds, slots } = inputs;

  const pantrySet = new Set(
    pantryItems.map((p) => norm(p.normalized_name ?? p.item_name)).filter(Boolean),
  );
  const expiringSet = new Set(
    expiringSoon.map((p) => norm(p.normalized_name ?? p.item_name)).filter(Boolean),
  );
  const recentSet = new Set(recentRecipeIds.filter(Boolean));

  // Pre-compute average baseline cost across all candidates for budget scoring.
  const allCands = [...(candidates.breakfast ?? []), ...(candidates.lunch ?? []), ...(candidates.dinner ?? [])];
  const avgCost = allCands.length
    ? allCands.reduce((s, c) => s + (Number(c.cost_per_serving) || FALLBACK_COST), 0) / allCands.length
    : FALLBACK_COST;

  const usedProteins = new Map<string, number>();
  const usedCuisines = new Map<string, number>();
  const chosenById = new Set<string>();
  const selections: OptimizerSelection[] = [];

  let pantryUsedTotal = 0;
  let expiringUsedTotal = 0;
  let subtotal = 0;
  const aiFillSlots: OptimizerSlot[] = [];
  let swaps = 0;

  // Stable slot order: as given (already deterministic from the caller).
  for (const slot of slots) {
    const pool = candidates[slot.meal_type] ?? [];
    const ctx: ScoreCtx = { pantrySet, expiringSet, recentSet, usedProteins, usedCuisines, avgCost };

    let best: { cand: OptimizerCandidate; score: number; marginalCost: number; pantryUsed: number; expiringUsed: number } | null = null;
    for (const c of pool) {
      if (chosenById.has(c.id)) continue;
      if (!isFeasible(c, slot, inputs)) continue;
      const s = scoreCandidate(c, ctx);
      if (
        !best ||
        s.score > best.score ||
        // Stable tie-break: lower id wins.
        (s.score === best.score && String(c.id) < String(best.cand.id))
      ) {
        best = { cand: c, ...s };
      }
    }

    if (!best) {
      aiFillSlots.push(slot);
      continue;
    }

    chosenById.add(best.cand.id);
    selections.push({
      day_name: slot.day_name,
      meal_type: slot.meal_type,
      recipe_id: best.cand.id,
      reason: best.expiringUsed > 0
        ? "Uses ingredients already in your fridge that are expiring soon."
        : best.pantryUsed > 0
          ? "Uses ingredients you already have on hand."
          : "Best fit for your budget and variety this week.",
    });
    subtotal += best.marginalCost * profile.household_size;
    pantryUsedTotal += best.pantryUsed;
    expiringUsedTotal += best.expiringUsed;
    const p = detectProtein(best.cand);
    const c = detectCuisine(best.cand);
    usedProteins.set(p, (usedProteins.get(p) ?? 0) + 1);
    usedCuisines.set(c, (usedCuisines.get(c) ?? 0) + 1);
  }

  // ---- Budget-repair pass ----
  let guard = 0;
  while (subtotal > profile.weekly_budget && guard < 24) {
    guard++;
    let bestSwap: { idx: number; replacement: OptimizerCandidate; delta: number; rep: ReturnType<typeof scoreCandidate> } | null = null;
    for (let i = 0; i < selections.length; i++) {
      const sel = selections[i];
      const currentRecipe = (candidates[sel.meal_type] ?? []).find((c) => c.id === sel.recipe_id);
      if (!currentRecipe) continue;
      const currentCost = (Number(currentRecipe.cost_per_serving) || FALLBACK_COST) * profile.household_size;
      const pool = candidates[sel.meal_type] ?? [];
      const ctx: ScoreCtx = { pantrySet, expiringSet, recentSet, usedProteins, usedCuisines, avgCost };
      for (const cand of pool) {
        if (chosenById.has(cand.id)) continue;
        if (!isFeasible(cand, { day_name: sel.day_name, meal_type: sel.meal_type }, inputs)) continue;
        const sc = scoreCandidate(cand, ctx);
        const candCost = sc.marginalCost * profile.household_size;
        const delta = currentCost - candCost;
        if (delta <= 0) continue;
        if (!bestSwap || delta > bestSwap.delta || (delta === bestSwap.delta && String(cand.id) < String(bestSwap.replacement.id))) {
          bestSwap = { idx: i, replacement: cand, delta, rep: sc };
        }
      }
    }
    if (!bestSwap) break;
    const sel = selections[bestSwap.idx];
    chosenById.delete(sel.recipe_id);
    chosenById.add(bestSwap.replacement.id);
    sel.recipe_id = bestSwap.replacement.id;
    sel.reason = "Swapped to keep your plan within your weekly grocery budget.";
    subtotal -= bestSwap.delta;
    swaps++;
  }

  // ---- Kid-friendly repair ----
  const needsKidFriendly = (profile.children_5_to_12 ?? 0) > 0;
  if (needsKidFriendly) {
    const kfCount = () => selections.filter((s) => {
      const r = (candidates[s.meal_type] ?? []).find((c) => c.id === s.recipe_id);
      return r?.kid_friendly === true || r?.family_friendly === true;
    }).length;
    let kg = 0;
    while (kfCount() < 3 && kg < 12) {
      kg++;
      let didSwap = false;
      for (let i = 0; i < selections.length; i++) {
        const sel = selections[i];
        const cur = (candidates[sel.meal_type] ?? []).find((c) => c.id === sel.recipe_id);
        if (cur?.kid_friendly === true || cur?.family_friendly === true) continue;
        const pool = candidates[sel.meal_type] ?? [];
        const alt = pool.find((c) =>
          !chosenById.has(c.id) &&
          (c.kid_friendly === true || c.family_friendly === true) &&
          isFeasible(c, { day_name: sel.day_name, meal_type: sel.meal_type }, inputs),
        );
        if (alt) {
          chosenById.delete(sel.recipe_id);
          chosenById.add(alt.id);
          sel.recipe_id = alt.id;
          sel.reason = "Swapped in a kid-friendly meal for your household.";
          didSwap = true;
          swaps++;
          break;
        }
      }
      if (!didSwap) break;
    }
  }

  // Build parsed-shaped output (one entry per day_name, with meal slots).
  const dayMap = new Map<string, any>();
  for (const sel of selections) {
    let entry = dayMap.get(sel.day_name);
    if (!entry) {
      entry = { day_name: sel.day_name };
      dayMap.set(sel.day_name, entry);
    }
    entry[sel.meal_type] = { library_recipe_id: sel.recipe_id, reason: sel.reason };
  }
  // Preserve original day order from slots
  const seen = new Set<string>();
  const days: any[] = [];
  for (const s of slots) {
    if (seen.has(s.day_name)) continue;
    seen.add(s.day_name);
    if (dayMap.has(s.day_name)) days.push(dayMap.get(s.day_name));
    else days.push({ day_name: s.day_name });
  }

  const debug: OptimizerDebug = {
    pantry_items_used: pantryUsedTotal,
    expiring_items_used: expiringUsedTotal,
    variety_score: usedProteins.size + usedCuisines.size,
    budget_subtotal: Math.round(subtotal * 100) / 100,
    swaps_made: swaps,
    ai_fill_count: aiFillSlots.length,
    unfilled_slots: aiFillSlots,
  };

  return {
    selections,
    parsed: {
      days,
      why_this_plan: {
        engine: "algo_v2",
        summary: `Built deterministically using ${pantryUsedTotal} pantry items (${expiringUsedTotal} expiring soon), $${debug.budget_subtotal.toFixed(2)} projected vs. $${profile.weekly_budget} budget, ${swaps} cost/variety swaps.`,
        pantry_items_used: pantryUsedTotal,
        expiring_items_used: expiringUsedTotal,
        variety_score: debug.variety_score,
        budget_subtotal: debug.budget_subtotal,
        swaps_made: swaps,
      },
    },
    debug,
  };
}
