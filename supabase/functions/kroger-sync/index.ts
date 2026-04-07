import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Environment-driven base URL: set KROGER_ENV=production to use live API
const KROGER_ENV = Deno.env.get("KROGER_ENV") || "certification";
const KROGER_HOST = KROGER_ENV === "production"
  ? "https://api.kroger.com"
  : "https://api-ce.kroger.com";
const KROGER_BASE_URL = `${KROGER_HOST}/v1`;
const KROGER_TOKEN_URL = `${KROGER_BASE_URL}/connect/oauth2/token`;
const KROGER_PRODUCTS_URL = `${KROGER_BASE_URL}/products`;
const KROGER_LOCATIONS_URL = `${KROGER_BASE_URL}/locations`;

async function getKrogerToken(): Promise<string> {
  const clientId = Deno.env.get("KROGER_CLIENT_ID");
  const clientSecret = Deno.env.get("KROGER_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error(`Kroger API credentials not configured. ID present: ${!!clientId}, Secret present: ${!!clientSecret}`);
  }
  console.log(`Kroger auth: clientId starts with "${clientId.substring(0, 8)}...", secret length: ${clientSecret.length}`);

  const credentials = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(KROGER_TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=product.compact",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kroger token error [${res.status}]: ${text}`);
  }

  const data = await res.json();
  return data.access_token;
}

async function searchProducts(token: string, term: string, locationId: string, limit = 20) {
  const url = `${KROGER_PRODUCTS_URL}?filter.term=${encodeURIComponent(term)}&filter.locationId=${locationId}&filter.limit=${limit}&filter.fulfillment=ais`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kroger product search error [${res.status}]: ${text}`);
  }
  return await res.json();
}

async function findLocations(token: string, zipCode: string, limit = 5) {
  const url = `${KROGER_LOCATIONS_URL}?filter.zipCode.near=${zipCode}&filter.limit=${limit}&filter.radiusInMiles=15`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Kroger location search error [${res.status}]: ${text}`);
  }
  return await res.json();
}

function getServiceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getOrCreateKrogerRetailer(serviceClient: any): Promise<string> {
  const { data: existing } = await serviceClient
    .from("retailers")
    .select("retailer_id")
    .eq("retailer_slug", "kroger")
    .maybeSingle();

  if (existing) return existing.retailer_id;

  const { data: created, error } = await serviceClient
    .from("retailers")
    .insert({
      retailer_name: "Kroger",
      retailer_slug: "kroger",
      provider_name: "kroger_api",
      supports_live_pricing: true,
      supports_live_inventory: false,
    })
    .select("retailer_id")
    .single();

  if (error) throw new Error(`Failed to create Kroger retailer: ${error.message}`);
  return created.retailer_id;
}

async function upsertProductAndPrice(
  serviceClient: any,
  retailerId: string,
  product: any,
  zipCode?: string
) {
  const title = product.description || "Unknown Product";
  const brand = product.brand || null;
  const category = product.categories?.[0] || null;
  const imageUrl = product.images?.[0]?.sizes?.find((s: any) => s.size === "medium")?.url ||
    product.images?.[0]?.sizes?.find((s: any) => s.size === "small")?.url ||
    product.images?.[0]?.sizes?.[0]?.url || null;
  const size = product.items?.[0]?.size || null;
  const upc = product.upc || null;
  const priceInfo = product.items?.[0]?.price;
  const basePrice = priceInfo?.regular ?? priceInfo?.promo ?? 0;
  const salePrice = priceInfo?.promo && priceInfo.promo < (priceInfo.regular || Infinity) ? priceInfo.promo : null;

  // Try to find existing product first
  let rpId: string | null = null;
  const { data: existingRp } = await serviceClient
    .from("retailer_products")
    .select("retailer_product_id")
    .eq("retailer_id", retailerId)
    .eq("provider_product_reference", product.productId)
    .maybeSingle();

  if (existingRp) {
    rpId = existingRp.retailer_product_id;
    // Update it
    await serviceClient
      .from("retailer_products")
      .update({
        retailer_product_title: title,
        retailer_brand: brand,
        retailer_category: category,
        gtin_upc: upc,
        image_url: imageUrl,
        package_size_text: size,
        active_status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("retailer_product_id", rpId);
  } else {
    // Insert new
    const { data: newRp, error: insertErr } = await serviceClient
      .from("retailer_products")
      .insert({
        retailer_id: retailerId,
        provider_name: "kroger_api",
        provider_product_reference: product.productId,
        retailer_product_title: title,
        retailer_brand: brand,
        retailer_category: category,
        gtin_upc: upc,
        image_url: imageUrl,
        package_size_text: size,
        active_status: "active",
      })
      .select("retailer_product_id")
      .single();

    if (insertErr) {
      console.error(`Failed to insert product "${title}": ${insertErr.message}`);
      return null;
    }
    rpId = newRp.retailer_product_id;
  }

  // Now upsert price
  if (rpId && basePrice > 0) {
    // Check if price row exists
    const { data: existingPrice } = await serviceClient
      .from("store_product_prices")
      .select("store_price_id")
      .eq("retailer_product_id", rpId)
      .eq("retailer_id", retailerId)
      .maybeSingle();

    if (existingPrice) {
      await serviceClient
        .from("store_product_prices")
        .update({
          base_price: basePrice,
          sale_price: salePrice,
          freshness_status: "recent",
          last_verified_at: new Date().toISOString(),
          zip_code_context: zipCode || null,
          source_system: "kroger_api",
        })
        .eq("store_price_id", existingPrice.store_price_id);
    } else {
      const { error: priceErr } = await serviceClient
        .from("store_product_prices")
        .insert({
          retailer_product_id: rpId,
          retailer_id: retailerId,
          base_price: basePrice,
          sale_price: salePrice,
          source_system: "kroger_api",
          freshness_status: "recent",
          last_verified_at: new Date().toISOString(),
          zip_code_context: zipCode || null,
        });

      if (priceErr) {
        console.error(`Failed to insert price for "${title}": ${priceErr.message}`);
      }
    }
  }

  return { rpId, basePrice, salePrice, imageUrl, title, brand, size };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { action, zipCode, searchTerm, locationId } = body;

    // Public test-connection action (no auth needed)
    if (action === "test-connection") {
      const krogerToken = await getKrogerToken();
      const locData = await findLocations(krogerToken, zipCode || "90210", 2);
      return new Response(JSON.stringify({
        success: true,
        message: "Kroger API connection working",
        sampleLocations: (locData.data || []).length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const krogerToken = await getKrogerToken();

    // --- ACTION: find-locations ---
    if (action === "find-locations") {
      if (!zipCode) {
        return new Response(JSON.stringify({ error: "zipCode is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const locData = await findLocations(krogerToken, zipCode);
      return new Response(JSON.stringify({ locations: locData.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- ACTION: search-products ---
    if (action === "search-products") {
      if (!searchTerm || !locationId) {
        return new Response(JSON.stringify({ error: "searchTerm and locationId are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const prodData = await searchProducts(krogerToken, searchTerm, locationId);
      const products = (prodData.data || []).map((p: any) => ({
        productId: p.productId,
        description: p.description,
        brand: p.brand,
        upc: p.upc,
        size: p.items?.[0]?.size,
        imageUrl: p.images?.[0]?.sizes?.find((s: any) => s.size === "medium")?.url ||
          p.images?.[0]?.sizes?.find((s: any) => s.size === "small")?.url ||
          p.images?.[0]?.sizes?.[0]?.url || null,
        price: p.items?.[0]?.price || null,
      }));
      return new Response(JSON.stringify({ products }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- ACTION: batch-lookup (cached: DB first, API fallback, writes cache) ---
    if (action === "batch-lookup") {
      const items: string[] = body.items;
      if (!items?.length || !locationId) {
        return new Response(JSON.stringify({ error: "items[] and locationId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      console.log(`batch-lookup: ${items.length} items, locationId=${locationId}`);

      const serviceClient = getServiceClient();
      const retailerId = await getOrCreateKrogerRetailer(serviceClient);

      // 1. Check cache: retailer_products + store_product_prices updated in last 4 hours
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const results: Record<string, any> = {};
      const cacheMisses: string[] = [];

      for (const item of items) {
        const key = item.toLowerCase().trim();
        const { data: cached } = await serviceClient
          .from("retailer_products")
          .select(`
            retailer_product_id, retailer_product_title, retailer_brand, image_url, package_size_text,
            store_product_prices!inner(base_price, sale_price, last_verified_at)
          `)
          .eq("retailer_id", retailerId)
          .ilike("retailer_product_title", `%${key}%`)
          .gte("store_product_prices.last_verified_at", fourHoursAgo)
          .limit(1);

        if (cached?.length) {
          const p = cached[0];
          const sp = (p as any).store_product_prices?.[0];
          results[key] = {
            productId: p.retailer_product_id,
            description: p.retailer_product_title,
            brand: p.retailer_brand,
            imageUrl: p.image_url,
            size: p.package_size_text || "",
            regularPrice: sp?.base_price || 0,
            salePrice: sp?.sale_price && sp.sale_price < sp.base_price ? sp.sale_price : null,
            isOnSale: !!(sp?.sale_price && sp.sale_price < sp.base_price),
            cached: true,
          };
        } else {
          cacheMisses.push(item);
        }
      }

      console.log(`batch-lookup: ${items.length - cacheMisses.length} cache hits, ${cacheMisses.length} misses`);

      // 2. Fetch cache misses from Kroger API
      const toFetch = cacheMisses.slice(0, 15);
      for (const item of toFetch) {
        try {
          const prodData = await searchProducts(krogerToken, item, locationId, 1);
          const p = prodData.data?.[0];
          if (!p) {
            console.log(`batch-lookup: no Kroger result for "${item}"`);
            continue;
          }

          const price = p.items?.[0]?.price;
          const imageUrl = p.images?.[0]?.sizes?.find((s: any) => s.size === "medium")?.url ||
            p.images?.[0]?.sizes?.find((s: any) => s.size === "small")?.url ||
            p.images?.[0]?.sizes?.[0]?.url || null;
          const regularPrice = price?.regular ?? price?.promo ?? 0;
          const salePrice = price?.promo && price.promo < (price?.regular || Infinity) ? price.promo : null;

          console.log(`batch-lookup: "${item}" → $${regularPrice} (sale: ${salePrice ?? 'none'}), image: ${imageUrl ? 'yes' : 'no'}`);

          results[item.toLowerCase().trim()] = {
            productId: p.productId,
            description: p.description,
            brand: p.brand,
            imageUrl,
            size: p.items?.[0]?.size || "",
            regularPrice,
            salePrice,
            isOnSale: !!salePrice,
            cached: false,
          };

          // 3. Write to cache
          try {
            await upsertProductAndPrice(serviceClient, retailerId, p, zipCode);
          } catch (cacheErr) {
            console.error(`Cache write failed for "${item}":`, cacheErr);
          }
        } catch (fetchErr) {
          console.error(`Kroger API fetch failed for "${item}":`, fetchErr);
        }
      }

      console.log(`batch-lookup complete: ${Object.keys(results).length} total results`);

      return new Response(JSON.stringify({
        prices: results,
        cacheHits: items.length - cacheMisses.length,
        cacheMisses: cacheMisses.length,
        fetched: toFetch.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- ACTION: sync-products (admin only) ---
    if (action === "sync-products") {
      const { data: isAdminData } = await supabase.rpc("is_admin", { _user_id: userId });
      if (!isAdminData) {
        return new Response(JSON.stringify({ error: "Admin access required" }), {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (!searchTerm || !locationId) {
        return new Response(JSON.stringify({ error: "searchTerm and locationId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const serviceClient = getServiceClient();
      const retailerId = await getOrCreateKrogerRetailer(serviceClient);

      const prodData = await searchProducts(krogerToken, searchTerm, locationId, 50);
      const products = prodData.data || [];

      console.log(`sync-products: "${searchTerm}" returned ${products.length} products`);

      let synced = 0;
      let failed = 0;

      for (const product of products) {
        try {
          const result = await upsertProductAndPrice(serviceClient, retailerId, product, zipCode);
          if (result) synced++;
          else failed++;
        } catch {
          failed++;
        }
      }

      // Log the sync
      await serviceClient.from("provider_sync_logs").insert({
        provider_name: "kroger_api",
        sync_type: `product_price: ${searchTerm}`,
        request_status: failed === 0 ? "completed" : "partial",
        records_created: synced,
        records_failed: failed,
        retailer_id: retailerId,
        completed_at: new Date().toISOString(),
      });

      return new Response(
        JSON.stringify({ success: true, synced, failed, total: products.length }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid action. Use: find-locations, search-products, sync-products, batch-lookup" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Kroger sync error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
