// Open Food Facts Open Prices — community-submitted grocery prices.
// Free, no API key. Data licensed under ODbL — attribution required client-side.
// Cache 24h per item. Only return submissions from the last 60 days.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const FRESHNESS_DAYS = 60;

interface OpenPrice {
  price: number | null;
  currency: string;
  store: string | null;
  city: string | null;
  date: string | null;
  productName: string | null;
  source: "open_prices";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const body = await req.json().catch(() => ({}));
    const items: string[] = Array.isArray(body.items) ? body.items : [];
    if (!items.length) return json({ prices: {} });

    const uniqueItems = [...new Set(items.map((i) => String(i).toLowerCase().trim()).filter(Boolean))];
    const prices: Record<string, OpenPrice> = {};
    const cutoff = new Date(Date.now() - CACHE_TTL_MS).toISOString();

    // 1) Cache lookup
    const { data: cached } = await admin
      .from("open_prices_cache")
      .select("item_name, price, currency, store, city, submitted_date, product_name, cached_at")
      .in("item_name", uniqueItems)
      .gte("cached_at", cutoff);

    const cachedSet = new Set<string>();
    for (const row of cached || []) {
      cachedSet.add(row.item_name);
      if (row.price != null) {
        prices[row.item_name] = {
          price: Number(row.price),
          currency: row.currency || "USD",
          store: row.store,
          city: row.city,
          date: row.submitted_date,
          productName: row.product_name,
          source: "open_prices",
        };
      }
    }

    const toFetch = uniqueItems.filter((i) => !cachedSet.has(i));
    const upserts: Array<Record<string, unknown>> = [];
    const freshnessCutoff = new Date(Date.now() - FRESHNESS_DAYS * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    async function fetchOne(item: string): Promise<void> {
      try {
        const url = new URL("https://prices.openfoodfacts.org/api/v1/prices");
        url.searchParams.set("product_name__like", item);
        url.searchParams.set("location_osm_country", "United States");
        url.searchParams.set("order_by", "-date");
        url.searchParams.set("size", "5");
        url.searchParams.set("date__gte", freshnessCutoff);

        const res = await fetch(url.toString(), {
          headers: { "User-Agent": "HelpTheHive/1.0 (https://helpthehive.com)" },
        });
        if (!res.ok) {
          console.error(`open-prices ${res.status} for "${item}"`);
          return;
        }
        const data = await res.json();
        const first = (data?.items || [])[0];

        if (!first || typeof first.price !== "number") {
          // Cache the miss too so we don't keep hammering the API
          upserts.push({ item_name: item, price: null, cached_at: new Date().toISOString() });
          return;
        }

        const result: OpenPrice = {
          price: Number(first.price),
          currency: first.currency || "USD",
          store: first.location_osm_name || first.location?.osm_name || null,
          city: first.location?.osm_address_city || null,
          date: first.date || null,
          productName: first.product_name || null,
          source: "open_prices",
        };
        prices[item] = result;

        upserts.push({
          item_name: item,
          price: result.price,
          currency: result.currency,
          store: result.store,
          city: result.city,
          submitted_date: result.date,
          product_name: result.productName,
          cached_at: new Date().toISOString(),
        });
      } catch (err) {
        console.error(`open-prices fetch failed for "${item}":`, err);
      }
    }

    // Concurrency-limited parallel fetches (5 at a time)
    const CONCURRENCY = 5;
    for (let i = 0; i < toFetch.length; i += CONCURRENCY) {
      await Promise.all(toFetch.slice(i, i + CONCURRENCY).map(fetchOne));
    }

    if (upserts.length) {
      await admin.from("open_prices_cache").upsert(upserts, { onConflict: "item_name" });
    }

    return json({ prices });
  } catch (e) {
    console.error("open-prices error:", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
