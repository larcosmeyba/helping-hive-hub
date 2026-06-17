// Whole-package + channel-aware cart costing.
//
// Phase 1 implementation: the package_prices table is the source of truth
// (when seeded) but we also support a "package waste multiplier" fallback so
// the engine produces realistic delivered totals before the CSV import
// finishes. This is the module that turns per-serving recipe estimates into
// the fully-loaded delivered cart price the user actually pays at Instacart
// checkout — which is what we must enforce the budget against.

import { SupabaseClient } from "npm:@supabase/supabase-js@2";

export interface ChannelConfig {
  store: string;
  channel: "in_store" | "delivery";
  item_markup_pct: number;
  service_fee: number;
  delivery_fee: number;
  bag_fee: number;
  tip_default_pct: number;
  tax_rate: number;
}

export interface ChannelTotals {
  channel: "in_store" | "delivery";
  store: string;
  in_store_subtotal: number;
  item_markup: number;
  service_fee: number;
  delivery_fee: number;
  bag_fee: number;
  tip: number;
  tax: number;
  delivered_total: number;
  as_of_date: string;
}

const STORE_ALIASES: Record<string, string> = {
  "walmart": "walmart",
  "walmart supercenter": "walmart",
  "aldi": "aldi",
  "dollar general": "dollar_general",
  "dg": "dollar_general",
  "dollar tree": "dollar_tree",
  "family dollar": "family_dollar",
  "winco": "winco",
  "winco foods": "winco",
  "food 4 less": "food_4_less",
  "food4less": "food_4_less",
  "kroger": "kroger",
  "grocery outlet": "grocery_outlet",
  "smart & final": "smart_final",
  "smart and final": "smart_final",
  "smart final": "smart_final",
  "instacart": "instacart",
};

export function normalizeStoreCode(input: string | null | undefined): string {
  const key = (input || "").trim().toLowerCase();
  if (!key) return "default";
  if (STORE_ALIASES[key]) return STORE_ALIASES[key];
  // partial match
  for (const [k, v] of Object.entries(STORE_ALIASES)) {
    if (key.includes(k)) return v;
  }
  return "default";
}

export async function loadChannelConfig(
  admin: SupabaseClient,
  storeRaw: string | null | undefined,
  channel: "in_store" | "delivery" = "delivery",
): Promise<ChannelConfig> {
  const store = normalizeStoreCode(storeRaw);
  const { data } = await admin
    .from("channel_pricing_config")
    .select("*")
    .eq("store", store)
    .eq("channel", channel)
    .maybeSingle();
  if (data) return data as ChannelConfig;
  // fall back to default row
  const { data: def } = await admin
    .from("channel_pricing_config")
    .select("*")
    .eq("store", "default")
    .eq("channel", channel)
    .maybeSingle();
  return (def as ChannelConfig) ?? {
    store: "default",
    channel,
    item_markup_pct: channel === "delivery" ? 0.18 : 0,
    service_fee: channel === "delivery" ? 5.99 : 0,
    delivery_fee: channel === "delivery" ? 3.99 : 0,
    bag_fee: 0,
    tip_default_pct: channel === "delivery" ? 0.10 : 0,
    tax_rate: 0.0725,
  };
}

/**
 * Package-rounding waste multiplier applied to a per-serving subtotal when no
 * row in package_prices matches an ingredient. Real shoppers must buy whole
 * packages (a whole jar of mayo to use 2 tbsp), so the in-store cart is
 * always meaningfully higher than the sum of fractional per-serving prices.
 *
 * Tuned to roughly bridge the $30 vs $118 gap reported by users. Will be
 * removed per-line once package_prices is fully seeded from the CSV.
 */
export const PACKAGE_WASTE_MULTIPLIER = 1.35;

/**
 * Compute the fully-loaded delivered total from an in-store subtotal and
 * channel config. This is the number the budget MUST be enforced against
 * when the user checks out via Instacart.
 */
export function computeChannelTotals(
  inStoreSubtotal: number,
  cfg: ChannelConfig,
): ChannelTotals {
  const sub = Math.max(0, inStoreSubtotal);
  const item_markup = sub * (cfg.item_markup_pct || 0);
  const service_fee = cfg.service_fee || 0;
  const delivery_fee = cfg.delivery_fee || 0;
  const bag_fee = cfg.bag_fee || 0;
  // Tip is calculated on the marked-up cart (Instacart default)
  const tip = (sub + item_markup) * (cfg.tip_default_pct || 0);
  // Tax applies to the in-store subtotal (groceries; states vary, this is a
  // reasonable default — the per-state table refines later).
  const tax = sub * (cfg.tax_rate || 0);
  const delivered_total =
    sub + item_markup + service_fee + delivery_fee + bag_fee + tip + tax;

  const round = (n: number) => Math.round(n * 100) / 100;
  return {
    channel: cfg.channel,
    store: cfg.store,
    in_store_subtotal: round(sub),
    item_markup: round(item_markup),
    service_fee: round(service_fee),
    delivery_fee: round(delivery_fee),
    bag_fee: round(bag_fee),
    tip: round(tip),
    tax: round(tax),
    delivered_total: round(delivered_total),
    as_of_date: new Date().toISOString().slice(0, 10),
  };
}

/**
 * Try to find a real whole-package price row. Returns null if the seed
 * doesn't cover this ingredient yet — callers should fall back to the
 * per-serving × waste-multiplier estimate.
 */
export async function lookupPackagePrice(
  admin: SupabaseClient,
  itemKey: string,
  storeRaw: string | null | undefined,
): Promise<
  | {
      package_price: number;
      package_size: number;
      package_unit: string;
      servings_per_package: number | null;
      unit_price: number | null;
      brand: string | null;
      display_name: string;
      as_of_date: string;
    }
  | null
> {
  const store = normalizeStoreCode(storeRaw);
  const key = (itemKey || "").trim().toLowerCase();
  if (!key) return null;
  // Prefer the user's specific store, fall back to any store.
  const { data } = await admin
    .from("package_prices")
    .select(
      "package_price, package_size, package_unit, servings_per_package, unit_price, brand, display_name, as_of_date, store",
    )
    .ilike("item_key", `%${key}%`)
    .order("store", { ascending: false }) // crude: prefer non-default
    .limit(10);
  if (!data || data.length === 0) return null;
  const exactStore = data.find((d: any) => d.store === store);
  const row: any = exactStore ?? data[0];
  return {
    package_price: Number(row.package_price),
    package_size: Number(row.package_size),
    package_unit: row.package_unit,
    servings_per_package: row.servings_per_package != null ? Number(row.servings_per_package) : null,
    unit_price: row.unit_price != null ? Number(row.unit_price) : null,
    brand: row.brand,
    display_name: row.display_name,
    as_of_date: row.as_of_date,
  };
}
