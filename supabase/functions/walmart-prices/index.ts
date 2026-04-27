// Walmart price lookup via SerpApi. Caches results for 4 hours to limit API spend.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

interface WalmartPrice {
  price: number | null;
  title: string;
  image: string | null;
  inStock: boolean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SERPAPI_KEY_RAW = Deno.env.get("SERPAPI_KEY");
    if (!SERPAPI_KEY_RAW) {
      return json({ error: "SERPAPI_KEY not configured" }, 500);
    }
    const SERPAPI_KEY: string = SERPAPI_KEY_RAW;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));
    const items: string[] = Array.isArray(body.items) ? body.items : [];
    const zipCode: string = (body.zipCode || "").toString().trim();

    if (!items.length || !zipCode) {
      return json({ error: "items[] and zipCode are required" }, 400);
    }

    const uniqueItems = [...new Set(items.map((i) => i.toLowerCase().trim()).filter(Boolean))];
    const prices: Record<string, WalmartPrice> = {};
    const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();

    // 1) Check cache
    const { data: cached } = await admin
      .from("walmart_price_cache")
      .select("item_name, price, title, image, in_stock, cached_at")
      .in("item_name", uniqueItems)
      .eq("zip_code", zipCode)
      .gte("cached_at", cutoff);

    const cachedSet = new Set<string>();
    for (const row of cached || []) {
      cachedSet.add(row.item_name);
      prices[row.item_name] = {
        price: row.price !== null ? Number(row.price) : null,
        title: row.title || row.item_name,
        image: row.image,
        inStock: row.in_stock ?? true,
      };
    }

    const toFetch = uniqueItems.filter((i) => !cachedSet.has(i));

    // 2) Fetch from SerpApi for cache misses (in parallel, capped concurrency 5)
    const upserts: Array<Record<string, unknown>> = [];

    async function fetchOne(item: string): Promise<void> {
      try {
        const url = new URL("https://serpapi.com/search.json");
        url.searchParams.set("engine", "walmart");
        url.searchParams.set("query", item);
        url.searchParams.set("api_key", SERPAPI_KEY);
        // SerpApi accepts either store_id or delivery zip; use ZIP for proximity-based pricing.
        url.searchParams.set("ps", "20");
        url.searchParams.set("delivery_zip", zipCode);

        const res = await fetch(url.toString());
        if (!res.ok) {
          console.error(`SerpApi ${res.status} for "${item}"`);
          return;
        }
        const data = await res.json();
        const first = data?.organic_results?.[0];
        if (!first) return;

        const price =
          typeof first.primary_offer?.offer_price === "number"
            ? first.primary_offer.offer_price
            : typeof first.price === "number"
              ? first.price
              : null;
        const title = first.title || item;
        const image = first.thumbnail || null;
        const inStock = first.out_of_stock !== true;

        prices[item] = { price, title, image, inStock };
        upserts.push({
          item_name: item,
          zip_code: zipCode,
          price,
          title,
          image,
          in_stock: inStock,
          cached_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error(`Walmart fetch failed for "${item}":`, err);
      }
    }

    // Concurrency-limited parallel fetches
    const CONCURRENCY = 5;
    for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
      await Promise.all(toFetch.slice(i, i + CONCURRENCY).map(fetchOne));
    }

    // 3) Persist new cache rows
    if (upserts.length) {
      await admin
        .from("walmart_price_cache")
        .upsert(upserts, { onConflict: "item_name,zip_code" });
    }

    return json({ prices });
  } catch (e) {
    console.error("walmart-prices error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
