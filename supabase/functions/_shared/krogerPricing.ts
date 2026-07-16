// Shared Kroger pricing helper used by user-facing grocery matchers.
// Meal-plan generation saves with estimated pricing first; Kroger live pricing
// runs separately so product-search latency cannot block plan creation.
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
import { KrogerApiError, krogerGet } from "./kroger.ts";

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
  status?: "matched" | "needs_review" | "no_match" | "skipped";
  matched_name?: string | null;
  brand?: string | null;
  image_url?: string | null;
  size?: string | null;
  promo_price?: number | null;
  regular_price?: number | null;
  availability?: string | null;
  match_confidence?: number;
  from_cache?: boolean;
}

export interface PricedBasket {
  lines: PricedLine[];
  subtotal: number;            // sum of matched (gated-in) line totals only
  matched_count: number;
  unmatched_count: number;
  needs_review_count: number;
  avg_match_confidence: number;
  low_confidence_count: number;
  cache_hit_count?: number;
  live_request_count?: number;
  items_priced?: number;
  items_skipped?: number;
  elapsed_ms?: number;
  partial?: boolean;
}

// --- Term cleaning ----------------------------------------------------------

const STOP_WORDS = new Set([
  "fresh","organic","natural","raw","cooked","uncooked","drained","rinsed",
  "extra-virgin","extra","virgin","pure","premium",
  "low-sodium","low","sodium","reduced","fat","fat-free","nonfat","non-fat",
  "dairy-free","dairy","free",
  "lean","lite","light","unsweetened","sweetened",
  "boneless","skinless","bone-in","skin-on",
  "chopped","sliced","diced","shredded","minced","crushed","ground","grated",
  "whole","halved","quartered","peeled","unpeeled","cubed","julienned",
  "large","small","medium","mini","jumbo","baby",
  "ripe","frozen","canned","dried","fried","roasted","toasted","seeded","pitted",
  "scant","heaping","packed","level","about","approx","approximately","optional",
  "divided","plus","more","less","room","temperature",
  "of","the","a","an","and","or","to","for","with","into",
]);

const MAX_KROGER_SEARCH_TERMS = 8;
const QUANTITY_PATTERN = String.raw`(?:\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)`;
const UNIT_WORDS = String.raw`(?:oz|ounces?|lb|lbs|pounds?|g|grams?|kg|ml|l|liters?|gal|gallons?|qt|quarts?|pt|pints?|cups?|tbsp|tsp|tablespoons?|teaspoons?|count|ct|packs?|pkgs?|cans?|jars?|box(?:es)?|bags?|bottles?|cloves?|pinch(?:es)?|dash(?:es)?)`;
const UNIT_REGEX = new RegExp(String.raw`\b${QUANTITY_PATTERN}\s*-?\s*${UNIT_WORDS}\b`, "gi");
const STANDALONE_QTY = new RegExp(String.raw`\b${QUANTITY_PATTERN}\b`, "g");
const LEADING_QTY = new RegExp(String.raw`^\s*(?:${QUANTITY_PATTERN}|[-./\s])+`);

function normalizeFractions(value: string): string {
  return value
    .replace(/\u00bc/g, " 1/4 ")
    .replace(/\u00bd/g, " 1/2 ")
    .replace(/\u00be/g, " 3/4 ")
    .replace(/\u2150/g, " 1/7 ")
    .replace(/\u2151/g, " 1/9 ")
    .replace(/\u2152/g, " 1/10 ")
    .replace(/\u2153/g, " 1/3 ")
    .replace(/\u2154/g, " 2/3 ")
    .replace(/\u2155/g, " 1/5 ")
    .replace(/\u2156/g, " 2/5 ")
    .replace(/\u2157/g, " 3/5 ")
    .replace(/\u2158/g, " 4/5 ")
    .replace(/\u2159/g, " 1/6 ")
    .replace(/\u215a/g, " 5/6 ")
    .replace(/\u215b/g, " 1/8 ")
    .replace(/\u215c/g, " 3/8 ")
    .replace(/\u215d/g, " 5/8 ")
    .replace(/\u215e/g, " 7/8 ");
}

/** Strip prep words + units so the search term is the grocery noun. */
function cleanSearchTerm(name: string): string {
  let s = normalizeFractions(String(name || "").toLowerCase());
  s = s.replace(UNIT_REGEX, " ");
  s = s.replace(LEADING_QTY, " ");
  s = s.replace(STANDALONE_QTY, " ");
  s = s.replace(/[,()/;-]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  const tokens = s
    .split(" ")
    .filter((t) => t && !STOP_WORDS.has(t))
    .slice(0, MAX_KROGER_SEARCH_TERMS);
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

interface PriceBasketOptions {
  skipCache?: boolean;
  persist?: boolean;
  deadlineAt?: number;
  concurrency?: number;
  allowPartial?: boolean;
}

function safeLogJson(value: unknown): string {
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function envNumber(name: string, fallback: number): number {
  const raw = Number(Deno.env.get(name));
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

const KROGER_PRICING_DEFAULT_DEADLINE_MS = envNumber("KROGER_PRICING_DEADLINE_MS", 25_000);
const KROGER_PRICING_CONCURRENCY = Math.max(
  1,
  Math.min(8, envNumber("KROGER_PRICING_CONCURRENCY", 4)),
);
const KROGER_PRICING_DEADLINE_RESERVE_MS = envNumber("KROGER_PRICING_DEADLINE_RESERVE_MS", 1_500);

function zipDiagnostics(zip: unknown): { configured: boolean; length: number; prefix: string | null } {
  const s = String(zip ?? "").trim();
  return {
    configured: !!s,
    length: s.length,
    prefix: s ? s.slice(0, 3) : null,
  };
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
  opts: PriceBasketOptions = {},
): Promise<PricedBasket> {
  const started = Date.now();
  const persist = opts.persist !== false;
  const allowPartial = opts.allowPartial !== false;
  const deadlineAt = opts.deadlineAt ?? started + KROGER_PRICING_DEFAULT_DEADLINE_MS;
  const concurrency = Math.max(1, Math.min(8, Math.floor(opts.concurrency ?? KROGER_PRICING_CONCURRENCY)));
  const lines: PricedLine[] = [];
  const insertRows: Array<Record<string, unknown>> = [];
  let subtotal = 0;
  let matched_count = 0;
  let unmatched_count = 0;
  let needs_review_count = 0;
  let confSum = 0;
  let lowConf = 0;
  let cacheHitCount = 0;
  let liveRequestCount = 0;
  let skippedCount = 0;
  let partial = false;
  const cacheCutoff = new Date(Date.now() - 24 * 3600_000).toISOString();

  type PreparedItem = PriceItemInput & { index: number; original: string; cleaned: string };
  type MatchOutcome =
    | { kind: "matched"; product: KrogerProduct; confidence: number; fromCache?: false }
    | { kind: "cached"; cached: any; confidence: number; fromCache: true }
    | { kind: "needs_review" }
    | { kind: "no_match" }
    | { kind: "skipped"; reason: string };

  const prepared = items
    .map((item, index): PreparedItem | null => {
      const original = String(item.name || "").trim();
      if (!original) return null;
      return {
        ...item,
        index,
        original,
        cleaned: cleanSearchTerm(original),
      };
    })
    .filter((item): item is PreparedItem => item !== null);

  const itemGroups = new Map<string, PreparedItem[]>();
  for (const item of prepared) {
    const key = item.cleaned || item.original.toLowerCase();
    const group = itemGroups.get(key);
    if (group) group.push(item);
    else itemGroups.set(key, [item]);
  }

  const outcomes = new Map<string, MatchOutcome>();
  const liveTerms: string[] = [];

  function remainingMs() {
    return deadlineAt - Date.now();
  }

  function nearDeadline() {
    return remainingMs() <= KROGER_PRICING_DEADLINE_RESERVE_MS;
  }

  function softDeadlineError(processed: number) {
    const err = new Error(`Kroger pricing soft deadline exceeded after ${processed}/${prepared.length} items`) as Error & {
      code?: string;
      itemIndex?: number;
      itemCount?: number;
      remainingMs?: number;
    };
    err.code = "kroger_pricing_soft_deadline";
    err.itemIndex = processed;
    err.itemCount = prepared.length;
    err.remainingMs = remainingMs();
    return err;
  }

  async function lookupCached(original: string, cleaned: string) {
    const terms = Array.from(new Set([cleaned, original].map((v) => String(v || "").trim()).filter(Boolean)));
    for (const term of terms) {
      const { data: cached } = await admin
        .from("kroger_product_matches")
        .select("product_id, upc, matched_name, brand, size, image_url, unit_price, confidence")
        .eq("location_id", locationId)
        .eq("status", "matched")
        .ilike("ingredient_name", term)
        .gte("matched_at", cacheCutoff)
        .order("matched_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached?.product_id) {
        const conf = Number(cached.confidence ?? 0);
        if (conf >= RELEVANCE_THRESHOLD) return { cached, confidence: conf };
      }
    }
    return null;
  }

  for (const [key, group] of itemGroups) {
    if (nearDeadline()) {
      partial = true;
      if (!allowPartial) throw softDeadlineError(lines.length);
      outcomes.set(key, { kind: "skipped", reason: "deadline_before_cache_lookup" });
      continue;
    }

    if (!opts.skipCache) {
      const representative = group[0];
      const cached = await lookupCached(representative.original, representative.cleaned);
      if (cached) {
        cacheHitCount += group.length;
        outcomes.set(key, { kind: "cached", cached: cached.cached, confidence: cached.confidence, fromCache: true });
        continue;
      }
    }

    liveTerms.push(key);
  }

  let nextTermIndex = 0;
  async function liveWorker() {
    while (nextTermIndex < liveTerms.length) {
      if (nearDeadline()) {
        partial = true;
        return;
      }
      const term = liveTerms[nextTermIndex++];
      liveRequestCount++;
      const results = await searchKroger(term, locationId);
      const best = pickRelevantCheapest(term, results);
      outcomes.set(
        term,
        best
          ? { kind: "matched", product: best.product, confidence: best.confidence }
          : { kind: results.length ? "needs_review" : "no_match" },
      );
    }
  }

  await Promise.all(Array.from({ length: Math.min(concurrency, liveTerms.length) }, () => liveWorker()));

  for (const term of liveTerms) {
    if (!outcomes.has(term)) {
      partial = true;
      outcomes.set(term, { kind: "skipped", reason: "deadline_before_live_search" });
    }
  }

  for (const item of prepared) {
    const key = item.cleaned || item.original.toLowerCase();
    const outcome = outcomes.get(key) ?? { kind: "skipped", reason: "no_outcome" };

    if (outcome.kind === "cached") {
      const cached = outcome.cached;
      const pay = Number(cached.unit_price ?? 0);
      // We don't have full product items[] on a cache hit; fall back to
      // 1 package (cached matches are inherently a hint not a recompute).
      const packs = 1;
      const lineTotal = pay * packs;
      subtotal += lineTotal;
      matched_count += 1;
      confSum += outcome.confidence;
      if (outcome.confidence < 0.6) lowConf += 1;
      lines.push({
        name: item.original, quantity: packs, unit_price: pay, package_price: pay,
        line_total: lineTotal, matched: true, status: "matched",
        matched_name: cached.matched_name, brand: cached.brand,
        image_url: cached.image_url, size: cached.size,
        promo_price: null, regular_price: pay, availability: null,
        match_confidence: outcome.confidence, from_cache: true,
      });
      continue;
    }

    if (outcome.kind === "matched") {
      const { product, confidence } = outcome;
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
        name: item.original, quantity: packs,
        unit_price: unitPrice, package_price: pay, line_total: lineTotal,
        matched: true, status: "matched",
        matched_name: product.description, brand: product.brand ?? null, image_url: img,
        size: product.items?.[0]?.size ?? null,
        promo_price: promo, regular_price: regular,
        availability, match_confidence: confidence, from_cache: false,
      });
      if (persist) {
        insertRows.push({
          user_id: userId, grocery_list_item_id: item.id ?? null,
          ingredient_name: item.cleaned, location_id: locationId,
          product_id: product.productId, upc: product.upc ?? null,
          matched_name: product.description, brand: product.brand ?? null,
          size: product.items?.[0]?.size ?? null, image_url: img,
          unit_price: pay, confidence, status: "matched", from_cache: false,
        });
      }
      continue;
    }

    if (outcome.kind === "needs_review") {
      needs_review_count += 1;
    } else if (outcome.kind === "skipped") {
      partial = true;
      skippedCount += 1;
      unmatched_count += 1;
    } else {
      unmatched_count += 1;
    }

    const status = outcome.kind === "needs_review"
      ? "needs_review"
      : outcome.kind === "skipped"
        ? "skipped"
        : "no_match";
    lines.push({
      name: item.original, quantity: 1, unit_price: 0, package_price: 0, line_total: 0,
      matched: false, status,
    });
    if (persist) {
      insertRows.push({
        user_id: userId, grocery_list_item_id: item.id ?? null,
        ingredient_name: item.cleaned, location_id: locationId,
        status, from_cache: false,
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

  const elapsed = Date.now() - started;
  const itemsPriced = Math.max(0, lines.length - skippedCount);
  console.log("[krogerPricing] basket priced", safeLogJson({
    event: "kroger_pricing_basket_priced",
    items_total: prepared.length,
    cache_hits: cacheHitCount,
    live_requests: liveRequestCount,
    items_priced: itemsPriced,
    items_skipped: skippedCount,
    elapsed_ms: elapsed,
    partial,
    concurrency,
    deadline_ms: deadlineAt - started,
  }));

  return {
    lines,
    subtotal: Math.round(subtotal * 100) / 100,
    matched_count,
    unmatched_count,
    needs_review_count,
    avg_match_confidence: matched_count ? Math.round((confSum / matched_count) * 100) / 100 : 0,
    low_confidence_count: lowConf,
    cache_hit_count: cacheHitCount,
    live_request_count: liveRequestCount,
    items_priced: itemsPriced,
    items_skipped: skippedCount,
    elapsed_ms: elapsed,
    partial,
  };
}

/**
 * Resolve a Kroger pricing location for a user.
 *
 * Order of preference:
 *   1. profile.kroger_location_id (legacy — user previously picked a store)
 *   2. Nearest Kroger to profile.zip_code (resolved via app-token /locations call)
 *
 * Kroger is a HIDDEN pricing backend now: pricing uses the app-level token
 * (client_credentials) and only needs a locationId. No user OAuth required.
 * `connected` is always reported true so existing callers fall through.
 */
export async function getUserKrogerLocation(
  admin: any,
  userId: string,
): Promise<{ locationId: string | null; storeName: string | null; connected: boolean }> {
  const { data: profile } = await admin
    .from("profiles")
    .select("kroger_location_id, kroger_store_name, zip_code")
    .eq("user_id", userId)
    .maybeSingle();

  let locationId = (profile?.kroger_location_id as string | null) ?? null;
  let storeName = (profile?.kroger_store_name as string | null) ?? null;

  if (!locationId && profile?.zip_code) {
    try {
      const data = await krogerGet<{ data: Array<{ locationId: string; name: string; chain?: string }> }>(
        "/locations",
        {
          "filter.zipCode.near": String(profile.zip_code),
          "filter.radiusInMiles": 25,
          "filter.limit": 10,
        },
      );
      const first = (data.data ?? [])[0];
      if (first) {
        locationId = first.locationId;
        storeName = first.name;
      }
    } catch (e) {
      console.warn("[krogerPricing] ZIP location lookup failed", safeLogJson({
        event: "kroger_zip_location_lookup_failed",
        userRef: userId.slice(0, 8),
        hasSavedLocation: !!profile?.kroger_location_id,
        zip: zipDiagnostics(profile.zip_code),
        errorName: (e as Error).name,
        errorMessage: (e as Error).message,
        krogerStatus: e instanceof KrogerApiError ? e.status ?? null : null,
        krogerOperation: e instanceof KrogerApiError ? e.operation : null,
      }));
    }
  }

  return { locationId, storeName, connected: true };
}
