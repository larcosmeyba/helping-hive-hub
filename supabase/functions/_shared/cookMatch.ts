// Pure, deterministic matcher for "Cook What I Have".
// No I/O, no Date.now, no Math.random — fully unit-testable.
//
// Given a user's inventory + candidate recipes from the public recipes table,
// compute pantry_match_pct, missing_items, cost_to_complete, uses_expiring,
// then assign a tier (make_now / need_1 / need_2_3) and produce a deterministic
// ranking. Allergy/diet/skill filters are also exposed as pure helpers.

export interface InventoryItem {
  id: string;
  item_name: string;
  location?: string | null;
  freshness?: string | null; // "good" | "use_soon" | "expiring_today" | "low_stock"
  expiration_date?: string | null;
}

export interface CandidateRecipe {
  id: string;
  title: string;
  description?: string | null;
  ingredients?: Array<string | { item_name?: string; name?: string; quantity?: string; unit?: string; estimated_price?: number; optional?: boolean }> | null;
  prep_time_minutes?: number | null;
  cook_time_minutes?: number | null;
  cost_per_serving?: number | null;
  serving_size?: number | null;
  estimated_recipe_cost?: number | null;
  tags?: string[] | null;
  instructions?: any;
  image_url?: string | null;
}

export interface MatchedRecipe {
  recipe: CandidateRecipe;
  pantry_match_pct: number;        // 0..100, integer
  total_ingredients: number;
  owned_count: number;
  missing_items: Array<{ item_name: string; estimated_price: number }>;
  missing_count: number;
  cost_to_complete: number;
  uses_expiring: number;
  skill_fit: boolean;
  allergy_safe: boolean;            // always true after hard filter
  dietary_match: boolean;           // true after hard filter
  tier: "make_now" | "need_1" | "need_2_3" | "out_of_scope";
}

export interface RankInputs {
  inventory: InventoryItem[];
  recipes: CandidateRecipe[];
  allergyTerms: string[];           // already expanded
  dietForbidden: string[];          // already expanded
  cookingConfidence: "low" | "medium" | "high" | string;
  // Items the user has access to outside pantry (grocery_list, recently purchased)
  extraOwnedNames?: string[];
  // Tier caps
  need_2_3_max_cost?: number;       // default $8
  need_2_3_max_missing?: number;    // default 3
}

const PANTRY_STAPLES = new Set([
  "salt","pepper","black pepper","water","oil","olive oil","cooking oil","vegetable oil",
]);

export function normalize(name: string): string {
  return (name || "").toLowerCase().trim().replace(/\s+/g, " ");
}

function ingName(ing: any): string {
  if (typeof ing === "string") return ing;
  return ing?.item_name ?? ing?.name ?? "";
}

function ingPrice(ing: any): number {
  const p = typeof ing === "object" ? Number(ing?.estimated_price ?? 0) : 0;
  return isFinite(p) && p > 0 ? p : 2.5; // fallback default per missing item
}

function recipeIngredients(r: CandidateRecipe): any[] {
  return Array.isArray(r.ingredients) ? r.ingredients : [];
}

export function recipeContainsAny(r: CandidateRecipe, terms: string[]): boolean {
  if (!terms.length) return false;
  const parts: string[] = [String(r.title || ""), String(r.description || "")];
  for (const i of recipeIngredients(r)) parts.push(String(ingName(i)));
  const hay = parts.join(" \n ").toLowerCase();
  return terms.some((t) => {
    const term = (t || "").toLowerCase();
    if (!term) return false;
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    return re.test(hay);
  });
}

export function skillFit(r: CandidateRecipe, confidence: string): boolean {
  const total =
    (Number(r.prep_time_minutes) || 0) + (Number(r.cook_time_minutes) || 0);
  const ingCount = recipeIngredients(r).length;
  const c = (confidence || "medium").toLowerCase();
  if (c === "low" || c === "beginner") {
    return total <= 45 && ingCount <= 10;
  }
  if (c === "high" || c === "advanced") return true;
  // medium
  return total <= 90 && ingCount <= 15;
}

export function matchRecipe(
  r: CandidateRecipe,
  inventoryNames: Set<string>,
  extraOwnedNames: Set<string>,
  expiringNames: Set<string>,
): {
  total: number;
  owned: number;
  missing: Array<{ item_name: string; estimated_price: number }>;
  cost: number;
  uses_expiring: number;
} {
  const ings = recipeIngredients(r);
  let owned = 0;
  let uses_expiring = 0;
  const missing: Array<{ item_name: string; estimated_price: number }> = [];
  for (const ing of ings) {
    const name = ingName(ing);
    const norm = normalize(name);
    if (!norm) continue;
    if (PANTRY_STAPLES.has(norm)) {
      owned += 1;
      continue;
    }
    if (inventoryNames.has(norm) || partialMatch(norm, inventoryNames)) {
      owned += 1;
      if (expiringNames.has(norm) || partialMatch(norm, expiringNames)) uses_expiring += 1;
      continue;
    }
    if (extraOwnedNames.has(norm) || partialMatch(norm, extraOwnedNames)) {
      owned += 1;
      continue;
    }
    missing.push({ item_name: name, estimated_price: Math.round(ingPrice(ing) * 100) / 100 });
  }
  const total = ings.length || 1;
  const cost = Math.round(missing.reduce((s, m) => s + m.estimated_price, 0) * 100) / 100;
  return { total, owned, missing, cost, uses_expiring };
}

function partialMatch(name: string, set: Set<string>): boolean {
  if (!name) return false;
  for (const n of set) {
    if (!n) continue;
    if (n.includes(name) || name.includes(n)) return true;
  }
  return false;
}

export function assignTier(
  pct: number,
  missing: number,
  cost: number,
  caps: { need_2_3_max_cost: number; need_2_3_max_missing: number },
): MatchedRecipe["tier"] {
  if (pct >= 100 && cost === 0 && missing === 0) return "make_now";
  if (pct >= 90 && missing <= 1 && cost <= 4) return "need_1";
  if (missing <= caps.need_2_3_max_missing && cost <= caps.need_2_3_max_cost) return "need_2_3";
  return "out_of_scope";
}

export interface RankOutput {
  matches: MatchedRecipe[];                                  // all in-scope, ranked
  tiers: { make_now: MatchedRecipe[]; need_1: MatchedRecipe[]; need_2_3: MatchedRecipe[] };
}

export function rankCandidates(inputs: RankInputs): RankOutput {
  const need_2_3_max_cost = inputs.need_2_3_max_cost ?? 8;
  const need_2_3_max_missing = inputs.need_2_3_max_missing ?? 3;

  const inventoryNames = new Set(inputs.inventory.map((i) => normalize(i.item_name)));
  const expiringNames = new Set(
    inputs.inventory
      .filter((i) => i.freshness === "expiring_today" || i.freshness === "use_soon")
      .map((i) => normalize(i.item_name)),
  );
  const extraOwnedNames = new Set((inputs.extraOwnedNames ?? []).map(normalize));

  // Hard filters: allergy + diet + skill
  const filtered: CandidateRecipe[] = [];
  for (const r of inputs.recipes) {
    if (recipeContainsAny(r, inputs.allergyTerms)) continue;
    if (recipeContainsAny(r, inputs.dietForbidden)) continue;
    if (!skillFit(r, inputs.cookingConfidence)) continue;
    filtered.push(r);
  }

  const matches: MatchedRecipe[] = filtered.map((r) => {
    const m = matchRecipe(r, inventoryNames, extraOwnedNames, expiringNames);
    const hasIngredients = recipeIngredients(r).length > 0;
    const pct = hasIngredients ? Math.round((m.owned / m.total) * 100) : 0;
    const tier: MatchedRecipe["tier"] = hasIngredients
      ? assignTier(pct, m.missing.length, m.cost, { need_2_3_max_cost, need_2_3_max_missing })
      : "out_of_scope";
    return {
      recipe: r,
      pantry_match_pct: pct,
      total_ingredients: m.total,
      owned_count: m.owned,
      missing_items: m.missing,
      missing_count: m.missing.length,
      cost_to_complete: m.cost,
      uses_expiring: m.uses_expiring,
      skill_fit: true,
      allergy_safe: true,
      dietary_match: true,
      tier,
    };
  });

  const inScope = matches.filter((m) => m.tier !== "out_of_scope");

  // Deterministic sort:
  // pantry_match_pct desc, uses_expiring desc, missing_count asc, cost asc, id asc
  inScope.sort((a, b) => {
    if (b.pantry_match_pct !== a.pantry_match_pct) return b.pantry_match_pct - a.pantry_match_pct;
    if (b.uses_expiring !== a.uses_expiring) return b.uses_expiring - a.uses_expiring;
    if (a.missing_count !== b.missing_count) return a.missing_count - b.missing_count;
    if (a.cost_to_complete !== b.cost_to_complete) return a.cost_to_complete - b.cost_to_complete;
    return String(a.recipe.id).localeCompare(String(b.recipe.id));
  });

  const tiers = {
    make_now: inScope.filter((m) => m.tier === "make_now"),
    need_1: inScope.filter((m) => m.tier === "need_1"),
    need_2_3: inScope.filter((m) => m.tier === "need_2_3"),
  };

  return { matches: inScope, tiers };
}
