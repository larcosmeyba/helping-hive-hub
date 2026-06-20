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
export const MACRO_WEIGHT = 0.05;      // small secondary bonus (protein)
// Phase A additions — tunable, additive, deterministic.
export const KID_FRIENDLY_BONUS = 7;
export const FAVORITE_BONUS = 10;
export const SKILL_FIT_BONUS = 4;        // applied per "easier-than-cap" level
export const KROGER_CONFIDENCE_BONUS = 3; // scaled by match_confidence (0..1)
// Balanced-nutrition score — small weights across the full macro set.
export const NUT_CAL_WEIGHT = 0.002;
export const NUT_PROTEIN_WEIGHT = 0.05;
export const NUT_CARB_WEIGHT = 0.005;
export const NUT_FAT_WEIGHT = 0.005;
export const NUT_FIBER_WEIGHT = 0.1;
export const NUT_SODIUM_PENALTY = 0.001; // higher sodium → small penalty

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

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
  carbs_g?: number | null;
  fats_g?: number | null;
  fiber_g?: number | null;
  sodium_mg?: number | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  // Optional Kroger match confidence (0..1) — only meaningful when Kroger
  // pricing has been pre-priced for a candidate. Absent → bonus skipped.
  kroger_match_confidence?: number | null;
  [key: string]: any;
}

export interface OptimizerPantryItem {
  normalized_name?: string | null;
  item_name?: string | null;
  freshness_status?: string | null;
  location?: string | null;
}

export type CookingSkill = "beginner" | "intermediate" | "advanced";

export interface OptimizerProfile {
  household_size: number;
  weekly_budget: number;
  allergies: string[];
  dietary_preferences: string[];
  disliked_foods?: string[];
  children_5_to_12?: number;
  has_toddler?: boolean;
  cooking_confidence?: CookingSkill | string | null;
}

export interface OptimizerSlot {
  day_name: string;
  meal_type: MealType;
}

export interface OptimizerInputs {
  // candidates may include an optional `snack` pool — backward compatible.
  candidates: Partial<Record<MealType, OptimizerCandidate[]>> & {
    breakfast: OptimizerCandidate[];
    lunch: OptimizerCandidate[];
    dinner: OptimizerCandidate[];
  };
  pantryItems: OptimizerPantryItem[];
  // Freezer items behave like pantry for $0-owned matching; passed
  // separately so reporting can distinguish, but treated as owned.
  freezerItems?: OptimizerPantryItem[];
  expiringSoon: OptimizerPantryItem[];
  profile: OptimizerProfile;
  recentRecipeIds: string[];
  favoriteRecipeIds?: string[];
  slots: OptimizerSlot[];
  // Hard-filter helpers — passed in so this module stays free of project
  // helpers / imports. Each should return true if the recipe violates the
  // constraint and must be excluded.
  recipeContainsAny: (recipe: OptimizerCandidate, terms: string[]) => boolean;
  allergyTerms: string[];
  dietForbidden: string[];
  dislikedTerms: string[];
  // Toddler choking-hazard terms (applied as a HARD filter when has_toddler).
  toddlerHazards?: string[];
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
  // Pantry-discounted planning subtotal (uses marginalCost). This is the
  // optimizer's internal scoring figure and will read lower than the
  // generate-meal-plan budget gate, which enforces raw cost_per_serving.
  // See `enforced_subtotal` below for the gate-parity number.
  budget_subtotal: number;
  // Non-discounted subtotal using raw cost_per_serving * household_size,
  // matching the downstream `budget_unfit` hard gate in generate-meal-plan.
  enforced_subtotal: number;
  swaps_made: number;
  ai_fill_count: number;
  unfilled_slots: OptimizerSlot[];
  meal_type_mismatch_dropped: number;
  // distinct pantry/fridge/freezer items used / distinct ingredients needed
  pantry_utilization_pct: number;
  // Counts of HARD filter rejections — observability only.
  skill_filtered_out: number;
  toddler_filtered_out: number;
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
      snack?: { library_recipe_id: string; reason?: string };
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

// Derive a difficulty level (0=beginner, 1=intermediate, 2=advanced)
// from prep+cook time + ingredient count. Same rubric the prompt uses.
function recipeDifficulty(r: OptimizerCandidate): 0 | 1 | 2 {
  const prep = Number(r.prep_time_minutes) || 0;
  const cook = Number(r.cook_time_minutes) || 0;
  const total = prep + cook;
  const ingCount = Array.isArray(r.ingredients) ? r.ingredients.length : 0;
  if (total <= 30 && ingCount <= 8) return 0;
  if (total <= 45 && ingCount <= 12) return 1;
  return 2;
}

function skillCap(skill: CookingSkill | string | null | undefined): 0 | 1 | 2 {
  const s = String(skill ?? "intermediate").toLowerCase();
  if (s === "beginner") return 0;
  if (s === "advanced") return 2;
  return 1;
}

function isFeasible(
  r: OptimizerCandidate,
  slot: OptimizerSlot,
  inputs: OptimizerInputs,
  cap: 0 | 1 | 2,
  hooks?: {
    onMealTypeMismatch?: (r: OptimizerCandidate) => void;
    onSkillReject?: (r: OptimizerCandidate) => void;
    onToddlerReject?: (r: OptimizerCandidate) => void;
  },
): boolean {
  if (!r?.id) return false;
  // Tolerate null / missing meal_type — candidates are pre-filtered by
  // meal_type at fetch, so an unset value most likely means the data
  // source shape changed. Accept it for the slot rather than silently
  // dropping. A real mismatch (e.g. "brunch" vs "breakfast") is counted
  // in debug.meal_type_mismatch_dropped for observability.
  const mt = norm(r.meal_type);
  if (mt && mt !== slot.meal_type) {
    hooks?.onMealTypeMismatch?.(r);
    return false;
  }
  const { recipeContainsAny, allergyTerms, dietForbidden, dislikedTerms, toddlerHazards, profile } = inputs;
  if (allergyTerms.length && recipeContainsAny(r, allergyTerms)) return false;
  if (dietForbidden.length && recipeContainsAny(r, dietForbidden)) return false;
  if (dislikedTerms.length && recipeContainsAny(r, dislikedTerms)) return false;
  // Toddler-unsafe — HARD filter when household has a toddler.
  if (profile.has_toddler && toddlerHazards && toddlerHazards.length && recipeContainsAny(r, toddlerHazards)) {
    hooks?.onToddlerReject?.(r);
    return false;
  }
  // Skill-too-hard — HARD filter for recipes above the user's cap.
  if (recipeDifficulty(r) > cap) {
    hooks?.onSkillReject?.(r);
    return false;
  }
  return true;
}

interface ScoreCtx {
  pantrySet: Set<string>;
  expiringSet: Set<string>;
  recentSet: Set<string>;
  favoriteSet: Set<string>;
  usedProteins: Map<string, number>;
  usedCuisines: Map<string, number>;
  avgCost: number;
  cap: 0 | 1 | 2;
  krogerConnected: boolean;
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

  // Balanced-nutrition score (replaces protein-only term).
  score += MACRO_WEIGHT * (Number(r.protein_g) || 0);
  score += NUT_CAL_WEIGHT * Math.min(800, Number(r.calories) || 0);
  score += NUT_PROTEIN_WEIGHT * (Number(r.protein_g) || 0);
  score += NUT_CARB_WEIGHT * (Number(r.carbs_g) || 0);
  score += NUT_FAT_WEIGHT * (Number(r.fats_g) || 0);
  score += NUT_FIBER_WEIGHT * (Number(r.fiber_g) || 0);
  score -= NUT_SODIUM_PENALTY * (Number(r.sodium_mg) || 0);

  // Kid-friendly bonus (uses new column or legacy flag).
  if (r.kid_friendly === true || r.family_friendly === true) score += KID_FRIENDLY_BONUS;

  // Favorite boost.
  if (ctx.favoriteSet.has(r.id)) score += FAVORITE_BONUS;

  // Skill fit — closer to user cap = higher.
  const diff = recipeDifficulty(r);
  score += SKILL_FIT_BONUS * Math.max(0, ctx.cap - diff);

  // Kroger price-confidence bonus — only when Kroger is connected and we
  // have a numeric confidence for this candidate.
  if (ctx.krogerConnected && typeof r.kroger_match_confidence === "number") {
    score += KROGER_CONFIDENCE_BONUS * Math.max(0, Math.min(1, r.kroger_match_confidence));
  }

  return { score, marginalCost, pantryUsed, expiringUsed };
}

export function runOptimizer(inputs: OptimizerInputs): OptimizerResult {
  const { candidates, pantryItems, expiringSoon, profile, recentRecipeIds, slots } = inputs;
  const freezerItems = inputs.freezerItems ?? [];

  // Owned-set for $0 matching combines pantry + freezer; expiring stays its own bucket.
  const ownedNames: string[] = [
    ...pantryItems.map((p) => norm(p.normalized_name ?? p.item_name)),
    ...freezerItems.map((p) => norm(p.normalized_name ?? p.item_name)),
  ].filter(Boolean);
  const pantrySet = new Set(ownedNames);
  const expiringSet = new Set(
    expiringSoon.map((p) => norm(p.normalized_name ?? p.item_name)).filter(Boolean),
  );
  const recentSet = new Set(recentRecipeIds.filter(Boolean));
  const favoriteSet = new Set((inputs.favoriteRecipeIds ?? []).filter(Boolean));
  const cap = skillCap(profile.cooking_confidence);
  const krogerConnected = (candidates.breakfast ?? []).some((c) => typeof c.kroger_match_confidence === "number")
    || (candidates.lunch ?? []).some((c) => typeof c.kroger_match_confidence === "number")
    || (candidates.dinner ?? []).some((c) => typeof c.kroger_match_confidence === "number");

  // Pre-compute average baseline cost across all candidates for budget scoring.
  const allCands = [
    ...(candidates.breakfast ?? []),
    ...(candidates.lunch ?? []),
    ...(candidates.dinner ?? []),
    ...(candidates.snack ?? []),
  ];
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
  let enforcedSubtotal = 0;
  let mealTypeMismatchDropped = 0;
  let skillFilteredOut = 0;
  let toddlerFilteredOut = 0;
  const hooks = {
    onMealTypeMismatch: () => { mealTypeMismatchDropped++; },
    onSkillReject: () => { skillFilteredOut++; },
    onToddlerReject: () => { toddlerFilteredOut++; },
  };
  const aiFillSlots: OptimizerSlot[] = [];
  let swaps = 0;
  // Track distinct owned ingredients consumed for pantry_utilization_pct.
  const ownedIngredientsConsumed = new Set<string>();
  const allIngredientsNeeded = new Set<string>();

  // Stable slot order: as given (already deterministic from the caller).
  for (const slot of slots) {
    const pool = (candidates[slot.meal_type] ?? []) as OptimizerCandidate[];
    const ctx: ScoreCtx = { pantrySet, expiringSet, recentSet, favoriteSet, usedProteins, usedCuisines, avgCost, cap, krogerConnected };

    let best: { cand: OptimizerCandidate; score: number; marginalCost: number; pantryUsed: number; expiringUsed: number } | null = null;
    for (const c of pool) {
      if (chosenById.has(c.id)) continue;
      if (!isFeasible(c, slot, inputs, cap, hooks)) continue;
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
    enforcedSubtotal += (Number(best.cand.cost_per_serving) || FALLBACK_COST) * profile.household_size;
    pantryUsedTotal += best.pantryUsed;
    expiringUsedTotal += best.expiringUsed;
    // Utilization tracking
    for (const ing of ingredientNames(best.cand)) {
      if (!ing) continue;
      allIngredientsNeeded.add(ing);
      for (const p of pantrySet) {
        if (p && (ing.includes(p) || p.includes(ing))) { ownedIngredientsConsumed.add(ing); break; }
      }
    }
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
      const currentRecipe = ((candidates[sel.meal_type] ?? []) as OptimizerCandidate[]).find((c) => c.id === sel.recipe_id);
      if (!currentRecipe) continue;
      const currentCost = (Number(currentRecipe.cost_per_serving) || FALLBACK_COST) * profile.household_size;
      const pool = (candidates[sel.meal_type] ?? []) as OptimizerCandidate[];
      const ctx: ScoreCtx = { pantrySet, expiringSet, recentSet, favoriteSet, usedProteins, usedCuisines, avgCost, cap, krogerConnected };
      for (const cand of pool) {
        if (chosenById.has(cand.id)) continue;
        if (!isFeasible(cand, { day_name: sel.day_name, meal_type: sel.meal_type }, inputs, cap)) continue;
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
    const prevRecipe = ((candidates[sel.meal_type] ?? []) as OptimizerCandidate[]).find((c) => c.id === sel.recipe_id);
    const prevRawCost = (Number(prevRecipe?.cost_per_serving) || FALLBACK_COST) * profile.household_size;
    const newRawCost = (Number(bestSwap.replacement.cost_per_serving) || FALLBACK_COST) * profile.household_size;
    chosenById.delete(sel.recipe_id);
    chosenById.add(bestSwap.replacement.id);
    sel.recipe_id = bestSwap.replacement.id;
    sel.reason = "Swapped to keep your plan within your weekly grocery budget.";
    subtotal -= bestSwap.delta;
    enforcedSubtotal += newRawCost - prevRawCost;
    swaps++;
  }

  // ---- Kid-friendly repair ----
  const needsKidFriendly = (profile.children_5_to_12 ?? 0) > 0;
  if (needsKidFriendly) {
    const kfCount = () => selections.filter((s) => {
      const r = ((candidates[s.meal_type] ?? []) as OptimizerCandidate[]).find((c) => c.id === s.recipe_id);
      return r?.kid_friendly === true || r?.family_friendly === true;
    }).length;
    let kg = 0;
    while (kfCount() < 3 && kg < 12) {
      kg++;
      let didSwap = false;
      for (let i = 0; i < selections.length; i++) {
        const sel = selections[i];
        const cur = ((candidates[sel.meal_type] ?? []) as OptimizerCandidate[]).find((c) => c.id === sel.recipe_id);
        if (cur?.kid_friendly === true || cur?.family_friendly === true) continue;
        const pool = (candidates[sel.meal_type] ?? []) as OptimizerCandidate[];
        const alt = pool.find((c) =>
          !chosenById.has(c.id) &&
          (c.kid_friendly === true || c.family_friendly === true) &&
          isFeasible(c, { day_name: sel.day_name, meal_type: sel.meal_type }, inputs, cap),
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

  const utilization = allIngredientsNeeded.size > 0
    ? Math.round((ownedIngredientsConsumed.size / allIngredientsNeeded.size) * 1000) / 10
    : 0;

  const debug: OptimizerDebug = {
    pantry_items_used: pantryUsedTotal,
    expiring_items_used: expiringUsedTotal,
    variety_score: usedProteins.size + usedCuisines.size,
    budget_subtotal: Math.round(subtotal * 100) / 100,
    enforced_subtotal: Math.round(enforcedSubtotal * 100) / 100,
    swaps_made: swaps,
    ai_fill_count: aiFillSlots.length,
    unfilled_slots: aiFillSlots,
    meal_type_mismatch_dropped: mealTypeMismatchDropped,
    pantry_utilization_pct: utilization,
    skill_filtered_out: skillFilteredOut,
    toddler_filtered_out: toddlerFilteredOut,
  };

  return {
    selections,
    parsed: {
      days,
      why_this_plan: {
        engine: "algo_v2",
        summary: `Built deterministically using ${pantryUsedTotal} pantry items (${expiringUsedTotal} expiring soon), $${debug.budget_subtotal.toFixed(2)} projected vs. $${profile.weekly_budget} budget, ${swaps} cost/variety swaps. Pantry utilization ${utilization}%.`,
        pantry_items_used: pantryUsedTotal,
        expiring_items_used: expiringUsedTotal,
        variety_score: debug.variety_score,
        budget_subtotal: debug.budget_subtotal,
        swaps_made: swaps,
        pantry_utilization_pct: utilization,
      },
    },
    debug,
  };
}
