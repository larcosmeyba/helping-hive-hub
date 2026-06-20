// Pure, deterministic Budget Fix engine.
// Given a Need-To-Buy list (with current per-unit prices), a pantry, and a
// weekly budget, produce ranked swap suggestions with $ saved, and a "best
// combo" set of suggestions that brings the total to ≤ budget.
//
// Pure (no DB / no network) so it can be unit-tested and reused server-side.

export type FixStrategy =
  | "store_brand_swap"
  | "cheaper_protein"
  | "frozen_or_canned"
  | "drop_optional"
  | "use_more_pantry"
  | "cheaper_recipe";

export interface FixItem {
  id: string;
  name: string;
  category?: string | null;
  quantity: number;     // numeric qty
  unit_price: number;   // per-unit price (Kroger live or estimate)
  brand?: string | null;
  optional?: boolean;
  recipe_id?: string | null;
  /** Recipe cost (cents/usd) — used by `cheaper_recipe` strategy ranking. */
  recipe_cost?: number;
}

export interface PantryEntry { name: string; }

export interface FixInputs {
  items: FixItem[];
  pantry: PantryEntry[];
  weeklyBudget: number;
  storeBrandName?: string | null;     // e.g. "Kroger"
  /** Optional override map of canonical price lookups (name → unit_price). */
  priceRef?: Record<string, number>;
}

export interface FixSuggestion {
  item_id: string;
  type: FixStrategy;
  from_name: string;
  to_name: string;
  dollars_saved: number;
  new_unit_price?: number;
  new_already_have?: boolean;
  /** When type === "drop_optional", item is removed (saves price × qty). */
  drop?: boolean;
}

export interface FixResult {
  current_total: number;
  weekly_budget: number;
  over_by: number;
  suggestions: FixSuggestion[];     // sorted desc by $ saved
  best_combo: FixSuggestion[];      // minimal set that brings total ≤ budget
  combo_total_saved: number;
  combo_new_total: number;
  fits_budget: boolean;
}

// ---------------------------------------------------------------------------
// Built-in tables (kept inline so the helper has no external deps).
// ---------------------------------------------------------------------------

const PROTEIN_SUBS: Array<{ from: RegExp; to: string; factor: number }> = [
  { from: /\b(chicken )?breast(s)?\b/i, to: "Chicken Thighs", factor: 0.65 },
  { from: /\bground beef\b/i,           to: "Ground Turkey",  factor: 0.78 },
  { from: /\bsalmon\b/i,                to: "Tilapia",        factor: 0.55 },
  { from: /\bshrimp\b/i,                to: "Chicken Thighs", factor: 0.60 },
  { from: /\bsirloin|ribeye|strip steak\b/i, to: "Chuck Roast", factor: 0.70 },
  { from: /\bbacon\b/i,                 to: "Turkey Bacon",   factor: 0.80 },
];

const FROZEN_CANNED_SUBS: Array<{ from: RegExp; to: string; factor: number }> = [
  { from: /\bfresh (spinach|broccoli|peas|corn|green beans|berries|strawberries|mango)\b/i,
    to: "Frozen $1", factor: 0.60 },
  { from: /\bspinach|broccoli|peas|corn|green beans|berries|strawberries|mango\b/i,
    to: "Frozen $&", factor: 0.65 },
  { from: /\bfresh tomato(es)?\b/i, to: "Canned Tomatoes", factor: 0.50 },
  { from: /\btomato(es)?\b/i,       to: "Canned Tomatoes", factor: 0.55 },
  { from: /\bfresh beans?\b/i,      to: "Canned Beans",    factor: 0.50 },
];

const OPTIONAL_CATEGORIES = new Set(["Snacks", "snacks", "Beverages", "beverages"]);

function fuzzyPantryHit(item: FixItem, pantry: PantryEntry[]): boolean {
  const needle = item.name.toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
  if (!needle) return false;
  return pantry.some((p) => {
    const hay = (p.name ?? "").toLowerCase().replace(/[^a-z0-9 ]/g, "").trim();
    if (!hay) return false;
    return hay === needle || hay.includes(needle) || needle.includes(hay);
  });
}

function round2(n: number): number { return Math.round(n * 100) / 100; }

// ---------------------------------------------------------------------------
// Per-strategy suggestion builders.
// ---------------------------------------------------------------------------

function suggestStoreBrandSwap(item: FixItem, store: string | null | undefined): FixSuggestion | null {
  if (!store) return null;
  if (item.brand && item.brand.toLowerCase().includes(store.toLowerCase())) return null;
  // Store-brand savings ~ 20%.
  const saved = round2(item.unit_price * item.quantity * 0.20);
  if (saved <= 0.01) return null;
  return {
    item_id: item.id,
    type: "store_brand_swap",
    from_name: item.name,
    to_name: `${store} ${item.name}`,
    dollars_saved: saved,
    new_unit_price: round2(item.unit_price * 0.80),
  };
}

function suggestProtein(item: FixItem): FixSuggestion | null {
  for (const sub of PROTEIN_SUBS) {
    if (sub.from.test(item.name)) {
      const newPrice = round2(item.unit_price * sub.factor);
      const saved = round2((item.unit_price - newPrice) * item.quantity);
      if (saved <= 0.01) return null;
      return {
        item_id: item.id,
        type: "cheaper_protein",
        from_name: item.name,
        to_name: sub.to,
        dollars_saved: saved,
        new_unit_price: newPrice,
      };
    }
  }
  return null;
}

function suggestFrozenOrCanned(item: FixItem): FixSuggestion | null {
  for (const sub of FROZEN_CANNED_SUBS) {
    if (sub.from.test(item.name)) {
      const to = item.name.replace(sub.from, sub.to);
      const newPrice = round2(item.unit_price * sub.factor);
      const saved = round2((item.unit_price - newPrice) * item.quantity);
      if (saved <= 0.01) return null;
      return {
        item_id: item.id,
        type: "frozen_or_canned",
        from_name: item.name,
        to_name: to,
        dollars_saved: saved,
        new_unit_price: newPrice,
      };
    }
  }
  return null;
}

function suggestDropOptional(item: FixItem): FixSuggestion | null {
  const isOptional = item.optional || (item.category && OPTIONAL_CATEGORIES.has(item.category));
  if (!isOptional) return null;
  const saved = round2(item.unit_price * item.quantity);
  if (saved <= 0.01) return null;
  return {
    item_id: item.id,
    type: "drop_optional",
    from_name: item.name,
    to_name: "(removed)",
    dollars_saved: saved,
    drop: true,
  };
}

function suggestUseMorePantry(item: FixItem, pantry: PantryEntry[]): FixSuggestion | null {
  if (!fuzzyPantryHit(item, pantry)) return null;
  const saved = round2(item.unit_price * item.quantity);
  if (saved <= 0.01) return null;
  return {
    item_id: item.id,
    type: "use_more_pantry",
    from_name: item.name,
    to_name: `${item.name} (already in pantry)`,
    dollars_saved: saved,
    new_already_have: true,
  };
}

function suggestCheaperRecipe(items: FixItem[]): FixSuggestion | null {
  // Find the highest-cost recipe (sum of its item costs) and suggest a swap.
  const byRecipe = new Map<string, { cost: number; sampleName: string }>();
  for (const i of items) {
    if (!i.recipe_id) continue;
    const cur = byRecipe.get(i.recipe_id) ?? { cost: 0, sampleName: i.name };
    cur.cost += i.unit_price * i.quantity;
    byRecipe.set(i.recipe_id, cur);
  }
  if (!byRecipe.size) return null;
  let topId = ""; let topCost = 0; let topName = "";
  for (const [id, v] of byRecipe) {
    if (v.cost > topCost) { topCost = v.cost; topId = id; topName = v.sampleName; }
  }
  if (!topId) return null;
  const saved = round2(topCost * 0.30); // assume swap saves ~30%.
  if (saved <= 0.01) return null;
  return {
    item_id: topId,                       // recipe id, not list item
    type: "cheaper_recipe",
    from_name: topName,
    to_name: "Cheaper recipe swap",
    dollars_saved: saved,
  };
}

// ---------------------------------------------------------------------------
// Main entry.
// ---------------------------------------------------------------------------

export function computeBudgetFix(inputs: FixInputs): FixResult {
  const items = [...inputs.items].sort((a, b) => a.id.localeCompare(b.id));
  const currentTotal = round2(items.reduce((s, i) => s + i.unit_price * i.quantity, 0));
  const overBy = round2(Math.max(0, currentTotal - inputs.weeklyBudget));

  const all: FixSuggestion[] = [];
  for (const it of items) {
    const sbs = suggestStoreBrandSwap(it, inputs.storeBrandName ?? "Kroger");
    if (sbs) all.push(sbs);
    const pro = suggestProtein(it);
    if (pro) all.push(pro);
    const fz = suggestFrozenOrCanned(it);
    if (fz) all.push(fz);
    const drop = suggestDropOptional(it);
    if (drop) all.push(drop);
    const pantry = suggestUseMorePantry(it, inputs.pantry);
    if (pantry) all.push(pantry);
  }
  const recipe = suggestCheaperRecipe(items);
  if (recipe) all.push(recipe);

  // Deterministic ordering: $ saved desc, then strategy name, then item id.
  all.sort((a, b) =>
    b.dollars_saved - a.dollars_saved ||
    a.type.localeCompare(b.type) ||
    a.item_id.localeCompare(b.item_id));

  // Best combo: greedily pick suggestions in $-saved order, skipping any
  // that target an already-chosen item_id, until we're at/under budget.
  const chosen: FixSuggestion[] = [];
  const claimed = new Set<string>();
  let saved = 0;
  for (const s of all) {
    if (claimed.has(s.item_id)) continue;
    chosen.push(s); claimed.add(s.item_id); saved += s.dollars_saved;
    if (currentTotal - saved <= inputs.weeklyBudget) break;
  }
  const comboNewTotal = round2(currentTotal - saved);

  return {
    current_total: currentTotal,
    weekly_budget: inputs.weeklyBudget,
    over_by: overBy,
    suggestions: all,
    best_combo: chosen,
    combo_total_saved: round2(saved),
    combo_new_total: comboNewTotal,
    fits_budget: comboNewTotal <= inputs.weeklyBudget,
  };
}
