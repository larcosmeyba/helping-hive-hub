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
  unit_price: number;          // size-normalized $/size (e.g. per oz)
  package_price: number;       // price you actually pay per package
  line_total: number;          // package_price * quantity
  matched: boolean;
  matched_name?: string | null;
  brand?: string | null;
  image_url?: string | null;
  size?: string | null;
  promo_price?: number | null; // sale price when present, separate from regular
  regular_price?: number | null;
  availability?: string | null; // stock level: HIGH / LOW / TEMPORARILY_OUT_OF_STOCK, etc.
  match_confidence?: number;    // 0..1 — name/size/unit similarity
}

export interface PricedBasket {
  lines: PricedLine[];
  subtotal: number;
  matched_count: number;
  unmatched_count: number;
  // Mean match_confidence across matched lines, or 0 when none matched.
  avg_match_confidence: number;
  low_confidence_count: number; // matched lines with confidence < 0.6
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

const STORE_BRANDS = ["kroger", "private selection", "simple truth", "heritage farm", "psst", "home chef"];

function isStoreBrand(p: KrogerProduct): boolean {
  const b = (p.brand ?? "").toLowerCase();
  if (!b) return false;
  return STORE_BRANDS.some((s) => b.includes(s));
}

function priceOf(p: KrogerProduct): { promo: number | null; regular: number | null; pay: number } {
  const px = p.items?.[0]?.price ?? {};
  const promo = typeof px.promo === "number" && px.promo > 0 ? px.promo : null;
  const regular = typeof px.regular === "number" && px.regular > 0 ? px.regular : null;
  const pay = promo ?? regular ?? 0;
  return { promo, regular, pay };
}

function parseSize(size?: string | null): { qty: number; unit: string } | null {
  if (!size) return null;
  const m = String(size).match(/([\d.]+)\s*([a-z]+)/i);
  if (!m) return null;
  const qty = parseFloat(m[1]);
  if (!isFinite(qty) || qty <= 0) return null;
  return { qty, unit: m[2].toLowerCase() };
}

function computeUnitPrice(p: KrogerProduct): number {
  const { pay } = priceOf(p);
  const sz = parseSize(p.items?.[0]?.size);
  if (!sz) return pay;
  return Math.round((pay / sz.qty) * 10000) / 10000;
}

// Crude similarity: shared token ratio between simplified query and product name.
function nameSimilarity(query: string, product: string): number {
  const a = new Set(simplify(query).split(" ").filter(Boolean));
  const b = new Set(simplify(product).split(" ").filter(Boolean));
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / Math.max(a.size, b.size);
}

function computeMatchConfidence(query: string, p: KrogerProduct): number {
  const nameSim = nameSimilarity(query, p.description ?? "");
  // Boost confidence for store-brand (catalog quality is typically higher).
  const brandBoost = isStoreBrand(p) ? 0.1 : 0;
  const sizeBoost = parseSize(p.items?.[0]?.size) ? 0.1 : 0;
  return Math.max(0, Math.min(1, nameSim + brandBoost + sizeBoost));
}

async function searchKroger(term: string, locationId: string): Promise<KrogerProduct[]> {
  try {
    const data = await krogerGet<{ data: KrogerProduct[] }>("/products", {
      "filter.term": term,
      "filter.locationId": locationId,
      "filter.limit": 5,
    });
    return data.data ?? [];
  } catch (e) {
    console.warn("[krogerPricing] search failed", term, (e as Error).message);
    return [];
  }
}

// Rank: prefer store-brand → then cheapest pay price → then highest name sim.
function pickBest(query: string, results: KrogerProduct[]): KrogerProduct | null {
  if (!results.length) return null;
  const scored = results.map((p) => {
    const { pay } = priceOf(p);
    return { p, storeBrand: isStoreBrand(p), pay, sim: nameSimilarity(query, p.description ?? "") };
  });
  scored.sort((a, b) => {
    if (a.storeBrand !== b.storeBrand) return a.storeBrand ? -1 : 1;
    if (a.pay !== b.pay) return a.pay - b.pay;
    return b.sim - a.sim;
  });
  return scored[0].p;
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
  let confSum = 0;
  let lowConf = 0;
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
      const pay = Number(cached.unit_price ?? 0);
      const lineTotal = pay * qty;
      subtotal += lineTotal;
      matched_count += 1;
      // Cache doesn't carry confidence/availability — assume reasonable defaults.
      const conf = 0.8;
      confSum += conf;
      lines.push({
        name: original, quantity: qty,
        unit_price: pay, package_price: pay, line_total: lineTotal,
        matched: true, matched_name: cached.matched_name, brand: cached.brand,
        image_url: cached.image_url, size: cached.size,
        promo_price: null, regular_price: pay, availability: null, match_confidence: conf,
      });
      continue;
    }

    // Live search — full term then simplified
    const simplified = simplify(original);
    const terms = simplified !== original.toLowerCase() ? [original, simplified] : [original];
    let results: KrogerProduct[] = [];
    for (const term of terms) {
      results = await searchKroger(term, locationId);
      if (results.length) break;
    }
    const best = pickBest(original, results);

    if (!best) {
      unmatched_count += 1;
      lines.push({
        name: original, quantity: qty, unit_price: 0, package_price: 0, line_total: 0, matched: false,
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

    const { promo, regular, pay } = priceOf(best);
    const unitPrice = computeUnitPrice(best);
    const lineTotal = pay * qty;
    subtotal += lineTotal;
    matched_count += 1;
    const img = pickImage(best);
    const confidence = computeMatchConfidence(original, best);
    confSum += confidence;
    if (confidence < 0.6) lowConf += 1;
    const availability = (best.items?.[0]?.inventory?.stockLevel ?? null) as string | null;
    lines.push({
      name: original, quantity: qty,
      unit_price: unitPrice, package_price: pay, line_total: lineTotal,
      matched: true, matched_name: best.description, brand: best.brand ?? null, image_url: img,
      size: best.items?.[0]?.size ?? null,
      promo_price: promo, regular_price: regular,
      availability, match_confidence: confidence,
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
      unit_price: pay,
      confidence,
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

  return {
    lines,
    subtotal: Math.round(subtotal * 100) / 100,
    matched_count,
    unmatched_count,
    avg_match_confidence: matched_count ? Math.round((confSum / matched_count) * 100) / 100 : 0,
    low_confidence_count: lowConf,
  };
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
