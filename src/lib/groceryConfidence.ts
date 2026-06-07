// Shared helper for deciding when to hide the precise grocery total and
// show a range instead. Used by GrocerySummaryPage and GroceryListPage.
//
// Until the pricing engine is rewritten, the internal estimate is known to
// undershoot the real Instacart cart by ~2–6× because:
//   - Recipe units (tbsp, cup, tsp, clove) are sent verbatim and matched as
//     full retail units by Instacart.
//   - Internal price math uses portion fractions, not product prices.
//
// We use a conservative low/high band to communicate uncertainty truthfully
// without claiming a wrong precise number.

import type { GroceryItem, PricingConfidenceSummary } from "@/types/mealPlan";

// Recipe-only units that don't map to retail packages reliably.
const RISKY_UNITS = new Set([
  "tbsp", "tablespoon", "tablespoons",
  "tsp", "teaspoon", "teaspoons",
  "cup", "cups",
  "clove", "cloves",
  "pinch", "pinches",
  "dash", "dashes",
  "slice", "slices",
  "stick", "sticks",
]);

function lineUnit(item: GroceryItem): string {
  const raw = String(item.quantity ?? "").trim().toLowerCase();
  return raw.replace(/[\d./\s]+/g, "").trim();
}

export interface GroceryRange {
  /** Single estimate (kept for backward compatibility / breakdowns). */
  estimate: number;
  /** Low end of the displayed range. */
  low: number;
  /** High end of the displayed range. */
  high: number;
  /** Show the precise number, or the low–high range. */
  showRange: boolean;
  /** Human-readable reason we chose a range. */
  reason?: string;
}

/**
 * Decide whether to show an exact total or a low–high range.
 *
 * We show a range when ANY of the following is true:
 *   - The server explicitly reports low confidence.
 *   - More than 20% of lines use risky recipe-only units.
 *   - More than 25% of priced lines are below $1 (a tell-tale sign that
 *     prices are recipe-portion fractions, not retail product prices).
 *
 * The high end is `estimate × multiplier`, where the multiplier scales with
 * the share of risky lines (cap 2.5×). This is intentionally conservative —
 * we'd rather over-quote than under-quote a basket.
 */
export function computeGroceryRange(
  items: GroceryItem[],
  estimate: number,
  serverConfidence?: PricingConfidenceSummary,
): GroceryRange {
  const total = items.length;
  if (total === 0 || estimate <= 0) {
    return { estimate, low: estimate, high: estimate, showRange: false };
  }

  const riskyCount = items.filter((i) => RISKY_UNITS.has(lineUnit(i))).length;
  const subDollarCount = items.filter(
    (i) => (i.estimatedPrice ?? 0) > 0 && (i.estimatedPrice ?? 0) < 1,
  ).length;
  const pricedCount = items.filter((i) => (i.estimatedPrice ?? 0) > 0).length || 1;

  const riskyShare = riskyCount / total;
  const subDollarShare = subDollarCount / pricedCount;

  const serverLow =
    serverConfidence &&
    typeof serverConfidence.confidencePercent === "number" &&
    serverConfidence.confidencePercent < 60;

  const reasons: string[] = [];
  if (serverLow) reasons.push("low server confidence");
  if (riskyShare > 0.2) reasons.push(`${riskyCount} recipe-unit items`);
  if (subDollarShare > 0.25) reasons.push(`${subDollarCount} sub-$1 lines`);

  const showRange = reasons.length > 0;
  if (!showRange) {
    return { estimate, low: estimate, high: estimate, showRange: false };
  }

  // Multiplier scales from 1.8× → 2.5× with risky-unit share.
  const multiplier = Math.min(2.5, 1.8 + riskyShare * 1.5);
  const low = Math.max(0, Math.round(estimate));
  const high = Math.round(estimate * multiplier);

  return {
    estimate,
    low,
    high,
    showRange: true,
    reason: reasons.join(", "),
  };
}

export function formatRange(range: GroceryRange): string {
  if (!range.showRange) return `~$${range.estimate.toFixed(2)}`;
  return `~$${range.low}–$${range.high}`;
}
