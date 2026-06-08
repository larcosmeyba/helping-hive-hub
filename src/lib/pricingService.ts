// Pricing Service Layer — Phase 1 scaffold.
//
// All future pricing calculations MUST flow through this module so the UI
// stays decoupled from the underlying pricing source. Today this returns
// `null` for ingredient prices (we have no verified data) and identity
// multipliers (1.0) for store/state. Once `grocery_price_reference`,
// `store_price_multipliers`, and `state_price_multipliers` are populated in
// Supabase, swap the bodies of these functions to query those tables — the
// UI surfaces do not need to change.
//
// Public contract (do not break):
//   getIngredientPrice(name, opts?)  → number | null
//   getStoreMultiplier(store)        → Promise<number>
//   getStateMultiplier(stateCode)    → Promise<number>
//   estimateBasketRange(items)       → { low: number; high: number } | null

import type { GroceryItem } from "@/types/mealPlan";

/** Coarse category averages for INTERNAL basket estimation only. Never
 *  surface these to the user as item-level prices — the spec forbids it.
 *  Numbers are deliberately conservative national averages in USD. */
const CATEGORY_AVG: Record<string, number> = {
  produce: 1.75,
  fruit: 1.75,
  vegetable: 1.75,
  protein: 6.5,
  meat: 6.5,
  seafood: 8.0,
  dairy: 4.0,
  egg: 4.0,
  grain: 3.0,
  bread: 3.5,
  pasta: 2.0,
  canned: 1.75,
  pantry: 3.0,
  oil: 5.0,
  condiment: 3.5,
  spice: 3.0,
  baking: 3.5,
  frozen: 4.0,
  beverage: 3.0,
  snack: 3.5,
  other: 3.0,
};

function categoryFor(item: GroceryItem): string {
  const lower = (item.section || "").toLowerCase();
  for (const key of Object.keys(CATEGORY_AVG)) {
    if (lower.includes(key)) return key;
  }
  return "other";
}

export interface IngredientPriceOptions {
  storeCode?: string;
  stateCode?: string;
}

/**
 * Returns a verified per-unit retail price for the ingredient, or null when
 * we don't have one. Phase 1: always null until `grocery_price_reference`
 * is populated.
 */
export function getIngredientPrice(
  _name: string,
  _opts: IngredientPriceOptions = {},
): number | null {
  return null;
}

/** Phase 1: identity multiplier. Replace with table lookup later. */
export async function getStoreMultiplier(_storeCode?: string): Promise<number> {
  return 1.0;
}

/** Phase 1: identity multiplier. Replace with table lookup later. */
export async function getStateMultiplier(_stateCode?: string): Promise<number> {
  return 1.0;
}

/**
 * Estimate a low–high basket range using category averages. Used to render
 * "Estimated Weekly Grocery Cost  $105 – $135" style totals. Returns null
 * when there are no items.
 */
export function estimateBasketRange(
  items: GroceryItem[],
  opts: { storeMultiplier?: number; stateMultiplier?: number } = {},
): { low: number; high: number } | null {
  if (!items?.length) return null;
  const mult = (opts.storeMultiplier ?? 1) * (opts.stateMultiplier ?? 1);
  let mid = 0;
  for (const item of items) {
    mid += CATEGORY_AVG[categoryFor(item)] ?? CATEGORY_AVG.other;
  }
  mid *= mult;
  // ±15% band — conservative without being alarming.
  const low = Math.max(0, Math.round(mid * 0.85));
  const high = Math.round(mid * 1.15);
  return { low, high };
}

export function formatBasketRange(
  range: { low: number; high: number } | null,
): string {
  if (!range) return "—";
  if (range.low === range.high) return `~$${range.low}`;
  return `$${range.low} – $${range.high}`;
}

export const PRICING_DISCLAIMER =
  "Estimated costs are based on ingredient averages and may vary by store, location, promotions, and availability. Final pricing is confirmed at checkout.";
