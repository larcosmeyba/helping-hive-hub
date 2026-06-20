// Match every item in a user's grocery list to a Kroger product and price.
// Persists matches + per-store pricing, returns an itemized total.
// Improvements:
//   - 24h cache via kroger_product_matches (location_id + lower(ingredient_name))
//   - Multi-pass fuzzy matching (simplifies ingredient terms on retry)
//   - Optional `simplify: true` flag to force simplified search (Try Simpler Match)

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import { getServiceClient, krogerGet } from "../_shared/kroger.ts";

import { captureEdgeError } from "../_shared/sentry.ts";
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

function pickImage(p: KrogerProduct): string | null {
  const persp = p.images?.find((i) => i.perspective === "front") ?? p.images?.[0];
  if (!persp) return null;
  return persp.sizes.find((x) => x.size === "medium")?.url ?? persp.sizes[0]?.url ?? null;
}

// Adjectives / descriptors that hurt Kroger search recall.
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

async function searchKroger(term: string, locationId: string) {
  const data = await krogerGet<{ data: KrogerProduct[] }>("/products", {
    "filter.term": term,
    "filter.locationId": locationId,
    "filter.limit": 5,
  });
  return (data.data ?? [])[0] ?? null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await userClient.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claims.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const items: Array<{ id?: string; name: string; quantity?: number }> = body.items ?? [];
    const locationId: string | undefined = body.locationId;
    const forceSimplify: boolean = body.simplify === true;
    const skipCache: boolean = body.skipCache === true;
    if (!items.length || !locationId) {
      return new Response(
        JSON.stringify({ error: "items[] and locationId required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const supabase = getServiceClient();
    const matches: Array<Record<string, unknown>> = [];
    const insertRows: Array<Record<string, unknown>> = [];
    let total = 0;
    let matched = 0;
    let failed = 0;
    let cacheHits = 0;

    const cacheCutoff = new Date(Date.now() - 24 * 3600_000).toISOString();

    for (const item of items) {
      const original = item.name;
      const qty = item.quantity ?? 1;

      // 1) Cache lookup (24h, same location + ingredient_name)
      if (!skipCache && !forceSimplify) {
        const { data: cached } = await supabase
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
          const price = Number(cached.unit_price ?? 0);
          total += price * qty;
          matched += 1;
          cacheHits += 1;
          matches.push({
            ingredient_name: original,
            status: "matched",
            matched_name: cached.matched_name,
            brand: cached.brand,
            size: cached.size,
            image_url: cached.image_url,
            unit_price: price,
            confidence: cached.confidence ?? 0.8,
            availability: null,
            from_cache: true,
          });
          insertRows.push({
            user_id: userId,
            grocery_list_item_id: item.id ?? null,
            ingredient_name: original,
            location_id: locationId,
            product_id: cached.product_id,
            upc: cached.upc ?? null,
            matched_name: cached.matched_name,
            brand: cached.brand,
            size: cached.size,
            image_url: cached.image_url,
            unit_price: price,
            confidence: cached.confidence ?? 0.8,
            status: "matched",
            from_cache: true,
          });
          continue;
        }
      }

      // 2) Live search — first pass on the full term (unless forceSimplify),
      //    second pass on a simplified term.
      try {
        const simplified = simplify(original);
        const terms = forceSimplify
          ? [simplified]
          : simplified !== original.toLowerCase()
            ? [original, simplified]
            : [original];

        let best: KrogerProduct | null = null;
        let usedTerm = terms[0];
        for (const term of terms) {
          best = await searchKroger(term, locationId);
          usedTerm = term;
          if (best) break;
        }

        if (!best) {
          failed += 1;
          matches.push({ ingredient_name: original, status: "no_match" });
          insertRows.push({
            user_id: userId,
            grocery_list_item_id: item.id ?? null,
            ingredient_name: original,
            location_id: locationId,
            status: "no_match",
            from_cache: false,
          });
          continue;
        }

        const priceObj = best.items?.[0]?.price;
        const price = priceObj?.promo ?? priceObj?.regular ?? 0;
        const stock = best.items?.[0]?.inventory?.stockLevel ?? null;
        const confidence = usedTerm === original ? 0.8 : 0.6;
        total += price * qty;
        matched += 1;
        matches.push({
          ingredient_name: original,
          status: "matched",
          matched_name: best.description,
          brand: best.brand ?? null,
          size: best.items?.[0]?.size ?? null,
          image_url: pickImage(best),
          unit_price: price,
          confidence,
          availability: stock,
          from_cache: false,
        });
        insertRows.push({
          user_id: userId,
          grocery_list_item_id: item.id ?? null,
          ingredient_name: original,
          location_id: locationId,
          product_id: best.productId,
          upc: best.upc ?? null,
          matched_name: best.description,
          brand: best.brand ?? null,
          size: best.items?.[0]?.size ?? null,
          image_url: pickImage(best),
          unit_price: price,
          confidence,
          status: "matched",
          from_cache: false,
        });
      } catch (_e) {
        failed += 1;
        matches.push({ ingredient_name: original, status: "no_match" });
      }
    }

    if (insertRows.length) {
      await supabase.from("kroger_product_matches").insert(insertRows);
    }

    return new Response(
      JSON.stringify({
        matches,
        totals: {
          matched,
          failed,
          cacheHits,
          estimatedTotal: Math.round(total * 100) / 100,
        },
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    try { captureEdgeError(e, { fn: "kroger-match-grocery-list" }); } catch { /* noop */ }
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
