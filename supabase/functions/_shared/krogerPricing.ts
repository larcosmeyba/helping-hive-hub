// Price a basket of items against a specific Kroger location.
// Uses the kroger_product_matches table as a 24h cache.
// Extracted so the meal plan generator can enforce a Kroger-priced budget.

import { krogerGet } from "./kroger.ts";

interface KrogerProduct {
  productId: string;
  upc?: string;
  description: string;
  brand?: string;
  images?: Array<{ perspective: string; sizes: Array<{ size: string; url: string }> }>;
  items?: Array<{
    size?: string;
    price?: { regular?: number; promo?: number };
    inventory?: { stockLevel?: string };
  }>;
}

export interface PricedLine {
  name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  matched: boolean;
  matched_name?: string | null;
  brand?: string | null;
  image_url?: string | null;
}

export interface PricedBasket {
  lines: PricedLine[];
  subtotal: number;
  matched_count: number;
  unmatched_count: number;
}

const STOP_WORDS = new Set([
  "fresh", "organic", "natural", "raw", "cooked", "uncooked",
  "extra-virgin", "extra", "virgin", "pure", "premium",
  "low-sodium", "low", "sodium", "reduced", "fat", "fat-free", "nonfat", "non-fat",
  "lean", "lite", "light", "unsweetened", "sweetened",
  "boneless", "skinless", "bone-in", "skin-on",
  "chopped", "sliced", "diced", "shredded", "minced", "crushed", "ground", "grated",
  "whole", "halved", "quartered", "peeled", "unpeeled",
  "large", "small", "medium", "mini", "jumbo", "baby",
  "ripe", "frozen", "canned", "dried", "fried", "roasted", "toasted",
  "of", "the", "a", "an", "and",
]);

const UNIT_REGEX = /\b\d+(\.\d+)?\s?(oz|ounce|ounces|lb|lbs|pound|pounds|g|gram|grams|kg|ml|l|liter|liters|gal|gallon|gallons|qt|quart|quarts|pt|pint|pints|cup|cups|tbsp|tsp|tablespoon|teaspoon|count|ct|pack|pkg)s?\b/gi;

function simplify(name: string): string {
  let s = name.toLowerCase();
  s = s.replace(UNIT_REGEX, " ");
  s = s.replace(/[,()/]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  const tokens = s.split(" ").filter((t) => t && !STOP_WORDS.has(t));
  return tokens.join(" ").trim() || name;
}

function pickImage(p: KrogerProduct): string | null {
  const persp = p.images?.find((i) => i.perspective === "front") ?? p.images?.[0];
  if (!persp) return null;
  return persp.sizes.find((x) => x.size === "medium")?.url ?? persp.sizes[0]?.url ?? null;
}

async function searchKroger(term: string, locationId: string): Promise<KrogerProduct | null> {
  try {
    const data = await krogerGet<{ data: KrogerProduct[] }>("/products", {
      "filter.term": term,
      "filter.locationId": locationId,
      "filter.limit": 5,
    });
    return (data.data ?? [])[0] ?? null;
  } catch (e) {
    console.warn("[krogerPricing] search failed", term, (e as Error).message);
    return null;
  }
}

/**
 * Price a basket against a Kroger location.
 * Uses kroger_product_matches as a 24h cache. Persists new matches.
 * Unmatched items contribute 0 to the subtotal but are tracked in unmatched_count.
 */
export async function priceBasketWithKroger(
  admin: any,
  userId: string,
  locationId: string,
  items: Array<{ name: string; quantity?: number }>,
): Promise<PricedBasket> {
  const lines: PricedLine[] = [];
  const insertRows: Array<Record<string, unknown>> = [];
  let subtotal = 0;
  let matched_count = 0;
  let unmatched_count = 0;
  const cacheCutoff = new Date(Date.now() - 24 * 3600_000).toISOString();

  for (const item of items) {
    const original = String(item.name || "").trim();
    if (!original) continue;
    const qty = Number(item.quantity ?? 1) || 1;

    // Cache lookup
    const { data: cached } = await admin
      .from("kroger_product_matches")
      .select("product_id, upc, matched_name, brand, size, image_url, unit_price")
      .eq("location_id", locationId)
      .eq("status", "matched")
      .ilike("ingredient_name", original)
      .gte("matched_at", cacheCutoff)
      .order("matched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (cached?.product_id) {
      const price = Number(cached.unit_price ?? 0);
      const lineTotal = price * qty;
      subtotal += lineTotal;
      matched_count += 1;
      lines.push({
        name: original, quantity: qty, unit_price: price, line_total: lineTotal,
        matched: true, matched_name: cached.matched_name, brand: cached.brand,
        image_url: cached.image_url,
      });
      continue;
    }

    // Live search — full term then simplified
    const simplified = simplify(original);
    const terms = simplified !== original.toLowerCase() ? [original, simplified] : [original];
    let best: KrogerProduct | null = null;
    for (const term of terms) {
      best = await searchKroger(term, locationId);
      if (best) break;
    }

    if (!best) {
      unmatched_count += 1;
      lines.push({
        name: original, quantity: qty, unit_price: 0, line_total: 0, matched: false,
      });
      insertRows.push({
        user_id: userId,
        ingredient_name: original,
        location_id: locationId,
        status: "no_match",
        from_cache: false,
      });
      continue;
    }

    const priceObj = best.items?.[0]?.price;
    const price = Number(priceObj?.promo ?? priceObj?.regular ?? 0);
    const lineTotal = price * qty;
    subtotal += lineTotal;
    matched_count += 1;
    const img = pickImage(best);
    lines.push({
      name: original, quantity: qty, unit_price: price, line_total: lineTotal,
      matched: true, matched_name: best.description, brand: best.brand ?? null, image_url: img,
    });
    insertRows.push({
      user_id: userId,
      ingredient_name: original,
      location_id: locationId,
      product_id: best.productId,
      upc: best.upc ?? null,
      matched_name: best.description,
      brand: best.brand ?? null,
      size: best.items?.[0]?.size ?? null,
      image_url: img,
      unit_price: price,
      confidence: 0.8,
      status: "matched",
      from_cache: false,
    });
  }

  if (insertRows.length) {
    try {
      await admin.from("kroger_product_matches").insert(insertRows);
    } catch (e) {
      console.warn("[krogerPricing] cache insert failed", (e as Error).message);
    }
  }

  return { lines, subtotal: Math.round(subtotal * 100) / 100, matched_count, unmatched_count };
}

/** Returns the user's Kroger location id when their account is connected. */
export async function getUserKrogerLocation(
  admin: any,
  userId: string,
): Promise<{ locationId: string | null; storeName: string | null; connected: boolean }> {
  const { data: token } = await admin
    .from("kroger_user_tokens")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  const { data: profile } = await admin
    .from("profiles")
    .select("kroger_location_id, kroger_store_name")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    locationId: (profile?.kroger_location_id as string | null) ?? null,
    storeName: (profile?.kroger_store_name as string | null) ?? null,
    connected: !!token,
  };
}
