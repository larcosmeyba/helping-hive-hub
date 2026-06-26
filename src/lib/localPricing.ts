// ZIP-based local pricing — the single source of truth for in-app estimates.
//
// Calls the `kroger-match-grocery-list` edge function which auto-resolves the
// nearest Kroger to the user's saved ZIP code (no store picker, no user OAuth).
// If pricing is temporarily unavailable, returns `available: false` so the UI
// can show "Final grocery pricing will be confirmed in Instacart." instead of
// any fallback / category-average estimate.
//
// This module DELIBERATELY does NOT fall back to grocery_price_reference,
// state/store multipliers, or any other estimate. Pricing hierarchy:
//   1. ZIP-based local pricing (this module) — planning estimate
//   2. Instacart checkout — final customer price

import { supabase } from "@/integrations/supabase/client";

export interface LocalPriceLine {
  name: string;
  matched: boolean;
  price: number | null;        // package_price × packages (line total)
  matched_name?: string | null;
  brand?: string | null;
}

export interface LocalPricingResult {
  available: boolean;
  subtotal: number;            // sum of matched line totals only
  matched_count: number;
  unmatched_count: number;
  prices: Record<string, LocalPriceLine>;
}

export async function fetchLocalPricing(
  items: Array<{ name: string; quantity?: number | string }>,
): Promise<LocalPricingResult> {
  const empty: LocalPricingResult = {
    available: false,
    subtotal: 0,
    matched_count: 0,
    unmatched_count: items.length,
    prices: {},
  };
  if (!items.length) return { ...empty, unmatched_count: 0 };

  try {
    const { data, error } = await supabase.functions.invoke(
      "kroger-match-grocery-list",
      { body: { items: items.map((i) => ({ name: i.name, quantity: i.quantity ?? 1 })) } },
    );
    if (error) return empty;
    const payload = data as any;
    if (!payload || payload.pricing_available === false) return empty;

    const prices: Record<string, LocalPriceLine> = {};
    for (const m of (payload.matches ?? []) as any[]) {
      const matched = m.status === "matched" && typeof m.line_total === "number";
      prices[m.ingredient_name] = {
        name: m.ingredient_name,
        matched,
        price: matched ? Number(m.line_total) : null,
        matched_name: m.matched_name ?? null,
        brand: m.brand ?? null,
      };
    }
    return {
      available: true,
      subtotal: Number(payload?.totals?.estimatedTotal ?? 0),
      matched_count: Number(payload?.totals?.matched ?? 0),
      unmatched_count: Number(payload?.totals?.failed ?? 0),
      prices,
    };
  } catch {
    return empty;
  }
}

export const LOCAL_PRICING_UNAVAILABLE_MESSAGE =
  "Final grocery pricing will be confirmed in Instacart.";

export const INSTACART_OVER_BUDGET_MESSAGE =
  "Need to stay within your budget? Review substitutions and lower-cost alternatives in the Instacart app to help keep your grocery total on track.";
