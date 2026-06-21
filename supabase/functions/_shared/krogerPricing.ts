// Shared Kroger pricing helper used by BOTH the meal-plan budget gate
// (generate-meal-plan) and the user-facing grocery matcher
// (kroger-match-grocery-list). One matcher = one number across the app.
//
// Hard rules enforced here:
//   1. Search term is CLEANED (prep words + units stripped) before hitting
//      Kroger so "chopped yellow onion" searches as "onion".
//   2. Up to 5 results are pulled and a RELEVANCE GATE
//      (nameSimilarity >= RELEVANCE_THRESHOLD) is applied. Anything below
//      becomes status "needs_review" and is NEVER summed into the subtotal.
//   3. Among gated-in results we pick the LOWEST pay price; value-store
//      brand is only a tiebreaker. Premium lines (Simple Truth, Private
//      Selection) are NEVER preferred and get no confidence boost.
//   4. Quantity → packages: needed amount is converted into number of
//      whole packages using the product's parsed size (ceil). "1 tbsp
//      cumin" → 1 jar, "2 cups flour" → 1 bag.
//   5. Cache: real `confidence` is read back; any cached match below the
//      relevance threshold is excluded from the subtotal.
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
  quantity: number;            // packages purchased (post-conversion)
  unit_price: number;          // size-normalized $/size when known, else pay
  package_price: number;       // price per package
  line_total: number;          // package_price * quantity (packages)
  matched: boolean;
  status?: "matched" | "needs_review" | "no_match";
  matched_name?: string | null;
  brand?: string | null;
  image_url?: string | null;
  size?: string | null;
  promo_price?: number | null;
  regular_price?: number | null;
  availability?: string | null;
  match_confidence?: number;
}

export interface PricedBasket {
  lines: PricedLine[];
  subtotal: number;            // sum of matched (gated-in) line totals only
  matched_count: number;
  unmatched_count: number;
  needs_review_count: number;
  avg_match_confidence: number;
  low_confidence_count: number;
}

// --- Term cleaning ----------------------------------------------------------

const STOP_WORDS = new Set([
  "fresh","organic","natural","raw","cooked","uncooked","drained","rinsed",
  "extra-virgin","extra","virgin","pure","premium",
  "low-sodium","low","sodium","reduced","fat","fat-free","nonfat","non-fat",
  "lean","lite","light","unsweetened","sweetened",
  "boneless","skinless","bone-in","skin-on",
  "chopped","sliced","diced","shredded","minced","crushed","ground","grated",
  "whole","halved","quartered","peeled","unpeeled","cubed","julienned",
  "large","small","medium","mini","jumbo","baby",
  "ripe","frozen","canned","dried","fried","roasted","toasted","seeded","pitted",
  "of","the","a","an","and","or","to","for","with","into",
]);

const UNIT_REGEX = /\b\d+(\.\d+)?\s?(oz|ounce|ounces|lb|lbs|pound|pounds|g|gram|grams|kg|ml|l|liter|liters|gal|gallon|gallons|qt|quart|quarts|pt|pint|pints|cup|cups|tbsp|tsp|tablespoon|teaspoon|count|ct|pack|pkg|can|cans|jar|jars|box|boxes|bag|bags|bottle|bottles)s?\b/gi;
const LEADING_QTY = /^\s*[\d./\s-]+/;

/** Strip prep words + units so the search term is the grocery noun. */
function cleanSearchTerm(name: string): string {
  let s = String(name || "").toLowerCase();
  s = s.replace(LEADING_QTY, " ");
  s = s.replace(UNIT_REGEX, " ");
  s = s.replace(/[,()/]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  const tokens = s.split(" ").filter((t) => t && !STOP_WORDS.has(t));
  const cleaned = tokens.join(" ").trim();
  return cleaned || s || name;
}

// --- Brands ----------------------------------------------------------------

// Value-tier store brands ONLY. Premium lines (Simple Truth, Private
// Selection) are intentionally excluded — they should never beat a cheaper
// basic item on price.
const VALUE_STORE_BRANDS = ["kroger", "heritage farm", "psst", "home chef"];
const PREMIUM_STORE_BRANDS = ["simple truth", "private selection"];

function brandTier(p: KrogerProduct): "value" | "premium" | "other" {
  const b = (p.brand ?? "").toLowerCase();
  if (!b) return "other";
  if (VALUE_STORE_BRANDS.some((s) => b.includes(s))) return "value";
  if (PREMIUM_STORE_BRANDS.some((s) => b.includes(s))) return "premium";
  return "other";
}

// --- Price / size ----------------------------------------------------------

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

function pickImage(p: KrogerProduct): string | null {
  const persp = p.images?.find((i) => i.perspective === "front") ?? p.images?.[0];
  if (!persp) return null;
  return persp.sizes.find((x) => x.size === "medium")?.url ?? persp.sizes[0]?.url ?? null;
}

// --- Relevance -------------------------------------------------------------

export const RELEVANCE_THRESHOLD = 0.34;

function tokenize(s: string): Set<string> {
  return new Set(cleanSearchTerm(s).split(" ").filter(Boolean));
}

function nameSimilarity(query: string, product: string): number {
  const a = tokenize(query);
  const b = tokenize(product);
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / Math.max(a.size, b.size);
}

// --- Search + select -------------------------------------------------------

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

/**
 * Apply the relevance gate then pick the CHEAPEST product. Value-store
 * brand only breaks ties between equally-priced products. Returns null if
 * no result clears the relevance threshold.
 */
function pickRelevantCheapest(
  query: string,
  results: KrogerProduct[],
): { product: KrogerProduct; confidence: number } | null {
  if (!results.length) return null;
  const scored = results.map((p) => {
    const sim = nameSimilarity(query, p.description ?? "");
    const { pay } = priceOf(p);
    return { p, sim, pay, tier: brandTier(p) };
  });
  const gated = scored.filter((s) => s.sim >= RELEVANCE_THRESHOLD && s.pay > 0);
  if (!gated.length) return null;
  gated.sort((a, b) => {
    if (a.pay !== b.pay) return a.pay - b.pay;            // CHEAPEST first
    // Tiebreak: value store-brand > other > premium.
    const tierRank = (t: string) => (t === "value" ? 0 : t === "premium" ? 2 : 1);
    const tr = tierRank(a.tier) - tierRank(b.tier);
    if (tr !== 0) return tr;
    return b.sim - a.sim;
  });
  const best = gated[0];
  return { product: best.p, confidence: Math.max(0, Math.min(1, best.sim)) };
}

// --- Quantity → packages ---------------------------------------------------

const VOLUME_TO_OZ: Record<string, number> = {
  tsp: 1 / 6, teaspoon: 1 / 6, teaspoons: 1 / 6,
  tbsp: 0.5, tablespoon: 0.5, tablespoons: 0.5,
  cup: 8, cups: 8, pt: 16, pint: 16, pints: 16,
  qt: 32, quart: 32, quarts: 32, gal: 128, gallon: 128, gallons: 128,
};
const WEIGHT_TO_OZ: Record<string, number> = {
  oz: 1, ounce: 1, ounces: 1, lb: 16, lbs: 16, pound: 16, pounds: 16,
  g: 0.035274, gram: 0.035274, grams: 0.035274,
  kg: 35.274, ml: 0.033814, l: 33.814, liter: 33.814, liters: 33.814,
};

function parseNeeded(raw: string | number | undefined | null): { qty: number; unit: string | null } {
  if (typeof raw === "number") return { qty: raw, unit: null };
  const s = String(raw ?? "").trim();
  const m = s.match(/^([\d./\s]+)\s*([a-zA-Z]+)?/);
  if (!m) return { qty: 1, unit: null };
  // Handle simple fractions / mixed numbers
  let q = 0;
  for (const part of m[1].trim().split(/\s+/)) {
    if (part.includes("/")) {
      const [n, d] = part.split("/").map(Number);
      if (d) q += n / d;
    } else {
      const n = parseFloat(part);
      if (isFinite(n)) q += n;
    }
  }
  if (!isFinite(q) || q <= 0) q = 1;
  return { qty: q, unit: m[2]?.toLowerCase() ?? null };
}

/**
 * How many WHOLE packages cover the needed amount. Returns 1 if we can't
 * convert (e.g. mismatched units, "1 jar cumin"). Caps at 6 packages to
 * prevent absurd buys.
 */
function packagesNeeded(
  neededRaw: string | number | undefined | null,
  product: KrogerProduct,
): number {
  const { qty: needQty, unit: needUnit } = parseNeeded(neededRaw);
  const sz = parseSize(product.items?.[0]?.size);
  if (!sz || !needUnit) return 1;
  const needOz = (VOLUME_TO_OZ[needUnit] ?? WEIGHT_TO_OZ[needUnit]) ?? null;
  const packOz = (VOLUME_TO_OZ[sz.unit] ?? WEIGHT_TO_OZ[sz.unit]) ?? null;
  if (!needOz || !packOz) {
    // Same unit literal? Direct ratio.
    if (needUnit === sz.unit) return Math.min(6, Math.max(1, Math.ceil(needQty / sz.qty)));
    return 1;
  }
  const totalNeed = needQty * needOz;
  const perPack = sz.qty * packOz;
  if (perPack <= 0) return 1;
  return Math.min(6, Math.max(1, Math.ceil(totalNeed / perPack)));
}

// --- Public API ------------------------------------------------------------

export interface PriceItemInput {
  id?: string | null;
  name: string;
  quantity?: number | string | null;  // recipe-side amount string OR package count number
}

/**
 * Price a basket. `items[i].quantity` may be a raw recipe amount ("2 cups")
 * or a number (treated as a hint; final packages are still computed by
 * package size when possible).
 */
export async function priceBasketWithKroger(
  admin: any,
  userId: string,
  locationId: string,
  items: PriceItemInput[],
  opts: { skipCache?: boolean; persist?: boolean } = {},
): Promise<PricedBasket> {
  const persist = opts.persist !== false;
  const lines: PricedLine[] = [];
  const insertRows: Array<Record<string, unknown>> = [];
  let subtotal = 0;
  let matched_count = 0;
  let unmatched_count = 0;
  let needs_review_count = 0;
  let confSum = 0;
  let lowConf = 0;
  const cacheCutoff = new Date(Date.now() - 24 * 3600_000).toISOString();

  for (const item of items) {
    const original = String(item.name || "").trim();
    if (!original) continue;
    const cleaned = cleanSearchTerm(original);

    // 1) Cache lookup (24h). Skip cached results below the relevance gate.
    if (!opts.skipCache) {
      const { data: cached } = await admin
        .from("kroger_product_matches")
        .select("product_id, upc, matched_name, brand, size, image_url, unit_price, confidence")
        .eq("location_id", locationId)
        .eq("status", "matched")
        .ilike("ingredient_name", original)
        .gte("matched_at", cacheCutoff)
        .order("matched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached?.product_id) {
        const conf = Number(cached.confidence ?? 0);
        if (conf >= RELEVANCE_THRESHOLD) {
          const pay = Number(cached.unit_price ?? 0);
          // We don't have full product items[] on a cache hit; fall back to
          // 1 package (cached matches are inherently a hint not a recompute).
          const packs = 1;
          const lineTotal = pay * packs;
          subtotal += lineTotal;
          matched_count += 1;
          confSum += conf;
          if (conf < 0.6) lowConf += 1;
          lines.push({
            name: original, quantity: packs, unit_price: pay, package_price: pay,
            line_total: lineTotal, matched: true, status: "matched",
            matched_name: cached.matched_name, brand: cached.brand,
            image_url: cached.image_url, size: cached.size,
            promo_price: null, regular_price: pay, availability: null,
            match_confidence: conf,
          });
          continue;
        }
        // cached but below threshold → treat as needs_review (don't sum)
      }
    }

    // 2) Live search on the cleaned term first; full term as fallback.
    const terms = cleaned !== original.toLowerCase() ? [cleaned, original] : [original];
    let results: KrogerProduct[] = [];
    for (const term of terms) {
      results = await searchKroger(term, locationId);
      if (results.length) break;
    }

    const best = pickRelevantCheapest(original, results);
    if (!best) {
      // Either zero results or none clear the relevance gate.
      const reason = results.length ? "needs_review" : "no_match";
      if (reason === "needs_review") needs_review_count += 1; else unmatched_count += 1;
      lines.push({
        name: original, quantity: 1, unit_price: 0, package_price: 0, line_total: 0,
        matched: false, status: reason,
      });
      if (persist) {
        insertRows.push({
          user_id: userId, grocery_list_item_id: item.id ?? null,
          ingredient_name: original, location_id: locationId,
          status: reason, from_cache: false,
        });
      }
      continue;
    }

    const { product, confidence } = best;
    const { promo, regular, pay } = priceOf(product);
    const unitPrice = computeUnitPrice(product);
    const packs = packagesNeeded(item.quantity ?? null, product);
    const lineTotal = pay * packs;
    subtotal += lineTotal;
    matched_count += 1;
    confSum += confidence;
    if (confidence < 0.6) lowConf += 1;
    const img = pickImage(product);
    const availability = (product.items?.[0]?.inventory?.stockLevel ?? null) as string | null;
    lines.push({
      name: original, quantity: packs,
      unit_price: unitPrice, package_price: pay, line_total: lineTotal,
      matched: true, status: "matched",
      matched_name: product.description, brand: product.brand ?? null, image_url: img,
      size: product.items?.[0]?.size ?? null,
      promo_price: promo, regular_price: regular,
      availability, match_confidence: confidence,
    });
    if (persist) {
      insertRows.push({
        user_id: userId, grocery_list_item_id: item.id ?? null,
        ingredient_name: original, location_id: locationId,
        product_id: product.productId, upc: product.upc ?? null,
        matched_name: product.description, brand: product.brand ?? null,
        size: product.items?.[0]?.size ?? null, image_url: img,
        unit_price: pay, confidence, status: "matched", from_cache: false,
      });
    }
  }

  if (persist && insertRows.length) {
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
    needs_review_count,
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
