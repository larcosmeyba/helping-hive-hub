// Pricing Service Layer — Phase 2.
//
// Backend-only pricing API. The UI does NOT consume these functions yet —
// per spec, we wire this in only after grocery_price_reference,
// store_price_multipliers, and state_price_multipliers are populated from
// the admin CSV imports.
//
// Public contract:
//   getIngredientPrice(name, opts?)          → Promise<IngredientPrice | null>
//   getStoreMultiplier(storeCode)            → Promise<number>
//   getStateMultiplier(stateCode)            → Promise<number>
//   calculateEstimatedPrice(name, opts?)     → Promise<EstimatedPrice | null>
//   estimateBasketRange(items, opts?)        → { low; high } | null
//   logMissingIngredient(name, opts?)        → Promise<void>
//
// Formula:
//   final = base_avg × storeMultiplier × stateMultiplier
//   range = [base_low × mults, base_high × mults]  (or ±10% if no low/high)

import { supabase } from "@/integrations/supabase/client";
import type { GroceryItem } from "@/types/mealPlan";

export const PRICING_DISCLAIMER =
  "Prices are estimated using grocery pricing data and may vary by location, retailer, promotions, and availability. Final pricing is confirmed at checkout.";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IngredientPrice {
  id: string;
  ingredientKey: string;
  displayName: string;
  category: string | null;
  unit: string | null;
  avgPrice: number;
  lowPrice: number | null;
  highPrice: number | null;
  /** 0–1 trigram similarity from the DB fuzzy match. */
  matchScore: number;
}

export interface PriceLookupOptions {
  storeCode?: string;
  stateCode?: string;
  /** Minimum trigram similarity to accept a fuzzy match. Default 0.3. */
  minSimilarity?: number;
}

export interface EstimatedPrice {
  /** Final point estimate (base avg × multipliers). */
  estimate: number;
  /** Low end of range. */
  low: number;
  /** High end of range. */
  high: number;
  /** Where the base price came from. */
  source: "database" | "ai" | "category-average" | "unknown";
  /** Multipliers that were applied. */
  storeMultiplier: number;
  stateMultiplier: number;
  /** Original DB row, when source === "database". */
  ingredient?: IngredientPrice;
  /** Match confidence: high (exact/near), medium (fuzzy), low (fallback). */
  confidence: "high" | "medium" | "low";
}

// ---------------------------------------------------------------------------
// In-memory caches (per session)
// ---------------------------------------------------------------------------

const storeCache = new Map<string, number>();
const stateCache = new Map<string, number>();
const ingredientCache = new Map<string, IngredientPrice | null>();

// ---------------------------------------------------------------------------
// Multipliers
// ---------------------------------------------------------------------------

export async function getStoreMultiplier(storeCode?: string): Promise<number> {
  if (!storeCode) return 1.0;
  const key = storeCode.trim().toLowerCase();
  if (storeCache.has(key)) return storeCache.get(key)!;
  const { data } = await supabase
    .from("store_price_multipliers")
    .select("multiplier")
    .ilike("store_code", key)
    .maybeSingle();
  const mult = data?.multiplier != null ? Number(data.multiplier) : 1.0;
  storeCache.set(key, mult);
  return mult;
}

export async function getStateMultiplier(stateCode?: string): Promise<number> {
  if (!stateCode) return 1.0;
  const key = stateCode.trim().toLowerCase();
  if (stateCache.has(key)) return stateCache.get(key)!;
  const { data } = await supabase
    .from("state_price_multipliers")
    .select("multiplier")
    .ilike("state_code", key)
    .maybeSingle();
  const mult = data?.multiplier != null ? Number(data.multiplier) : 1.0;
  stateCache.set(key, mult);
  return mult;
}

// ---------------------------------------------------------------------------
// Ingredient lookup (case-insensitive, fuzzy via pg_trgm)
// ---------------------------------------------------------------------------

export async function getIngredientPrice(
  name: string,
  opts: PriceLookupOptions = {},
): Promise<IngredientPrice | null> {
  const cleaned = (name || "").trim();
  if (!cleaned) return null;
  const cacheKey = cleaned.toLowerCase();
  if (ingredientCache.has(cacheKey)) return ingredientCache.get(cacheKey)!;

  const minSim = opts.minSimilarity ?? 0.3;

  // Use the DB-side fuzzy lookup RPC.
  const { data, error } = await supabase.rpc("lookup_ingredient_price", {
    _query: cleaned,
  });
  if (error || !Array.isArray(data) || data.length === 0) {
    ingredientCache.set(cacheKey, null);
    return null;
  }

  const top = data[0] as any;
  if ((top.similarity ?? 0) < minSim) {
    ingredientCache.set(cacheKey, null);
    return null;
  }

  const result: IngredientPrice = {
    id: top.id,
    ingredientKey: top.ingredient_key,
    displayName: top.display_name,
    category: top.category ?? null,
    unit: top.unit ?? null,
    avgPrice: Number(top.avg_price),
    lowPrice: top.low_price != null ? Number(top.low_price) : null,
    highPrice: top.high_price != null ? Number(top.high_price) : null,
    matchScore: Number(top.similarity ?? 0),
  };
  ingredientCache.set(cacheKey, result);
  return result;
}

// ---------------------------------------------------------------------------
// Final price calculation: base × store × state
// ---------------------------------------------------------------------------

export async function calculateEstimatedPrice(
  name: string,
  opts: PriceLookupOptions = {},
): Promise<EstimatedPrice | null> {
  const [ingredient, storeMult, stateMult] = await Promise.all([
    getIngredientPrice(name, opts),
    getStoreMultiplier(opts.storeCode),
    getStateMultiplier(opts.stateCode),
  ]);

  if (!ingredient) {
    // Log for future expansion. Fire-and-forget.
    logMissingIngredient(name, {
      storeCode: opts.storeCode,
      stateCode: opts.stateCode,
    }).catch(() => {});
    return null;
  }

  const mults = storeMult * stateMult;
  const estimate = round2(ingredient.avgPrice * mults);
  const low = round2(
    (ingredient.lowPrice ?? ingredient.avgPrice * 0.9) * mults,
  );
  const high = round2(
    (ingredient.highPrice ?? ingredient.avgPrice * 1.1) * mults,
  );

  const confidence: EstimatedPrice["confidence"] =
    ingredient.matchScore >= 0.7
      ? "high"
      : ingredient.matchScore >= 0.45
      ? "medium"
      : "low";

  return {
    estimate,
    low,
    high,
    source: "database",
    storeMultiplier: storeMult,
    stateMultiplier: stateMult,
    ingredient,
    confidence,
  };
}

// ---------------------------------------------------------------------------
// Missing-ingredient logging
// ---------------------------------------------------------------------------

export async function logMissingIngredient(
  name: string,
  opts: { storeCode?: string; stateCode?: string } = {},
): Promise<void> {
  const cleaned = (name || "").trim();
  if (!cleaned) return;
  await supabase.rpc("log_missing_ingredient", {
    _name: cleaned,
    _store_code: opts.storeCode ?? null,
    _state_code: opts.stateCode ?? null,
  });
}

// ---------------------------------------------------------------------------
// Basket-level estimator (category averages — internal only)
// ---------------------------------------------------------------------------

const CATEGORY_AVG: Record<string, number> = {
  produce: 1.75, fruit: 1.75, vegetable: 1.75,
  protein: 6.5, meat: 6.5, seafood: 8.0,
  dairy: 4.0, egg: 4.0,
  grain: 3.0, bread: 3.5, pasta: 2.0,
  canned: 1.75, pantry: 3.0, oil: 5.0,
  condiment: 3.5, spice: 3.0, baking: 3.5,
  frozen: 4.0, beverage: 3.0, snack: 3.5, other: 3.0,
};

function categoryFor(item: GroceryItem): string {
  const lower = (item.section || "").toLowerCase();
  for (const key of Object.keys(CATEGORY_AVG)) {
    if (lower.includes(key)) return key;
  }
  return "other";
}

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
  const low = Math.max(0, Math.round(mid * 0.85));
  const high = Math.round(mid * 1.15);
  return { low, high };
}

/**
 * DB-backed basket estimator. Looks up each item in grocery_price_reference
 * (fuzzy match) and applies store/state multipliers. Items not found fall
 * back to category averages so we still return a meaningful range.
 */
export async function estimateBasketRangeFromDB(
  items: GroceryItem[],
  opts: { storeCode?: string; stateCode?: string } = {},
): Promise<{ low: number; high: number } | null> {
  if (!items?.length) return null;
  const [storeMult, stateMult] = await Promise.all([
    getStoreMultiplier(opts.storeCode),
    getStateMultiplier(opts.stateCode),
  ]);
  const mult = storeMult * stateMult;

  let low = 0;
  let high = 0;
  await Promise.all(
    items.map(async (item) => {
      const ing = await getIngredientPrice(item.name, { minSimilarity: 0.3 });
      if (ing) {
        low += (ing.lowPrice ?? ing.avgPrice * 0.9) * mult;
        high += (ing.highPrice ?? ing.avgPrice * 1.1) * mult;
      } else {
        const avg = (CATEGORY_AVG[categoryFor(item)] ?? CATEGORY_AVG.other) * mult;
        low += avg * 0.85;
        high += avg * 1.15;
        logMissingIngredient(item.name, opts).catch(() => {});
      }
    }),
  );
  return { low: Math.max(0, Math.round(low)), high: Math.round(high) };
}

export function formatBasketRange(
  range: { low: number; high: number } | null,
): string {
  if (!range) return "—";
  if (range.low === range.high) return `~$${range.low}`;
  return `$${range.low} – $${range.high}`;
}

export function formatPriceRange(price: EstimatedPrice): string {
  if (price.low === price.high) return `$${price.estimate.toFixed(2)}`;
  return `$${price.low.toFixed(2)} – $${price.high.toFixed(2)}`;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function clearPricingCaches() {
  storeCache.clear();
  stateCache.clear();
  ingredientCache.clear();
}
