import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KROGER_BASE_URL = "https://api-ce.kroger.com/v1";
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

      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // 1. Check cache: retailer_products + store_product_prices updated in last 4 hours
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
      const results: Record<string, any> = {};
      const cacheMisses: string[] = [];

      for (const item of items) {
        const key = item.toLowerCase().trim();
        // Search cached products by title match
        const { data: cached } = await serviceClient
          .from("retailer_products")
          .select(`
            retailer_product_id, retailer_product_title, retailer_brand, image_url, package_size_text,
            store_product_prices!inner(base_price, sale_price, last_verified_at)
          `)
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

      // 2. Fetch cache misses from Kroger API (max 10 to stay fast)
      const toFetch = cacheMisses.slice(0, 10);
      for (const item of toFetch) {
        try {
          const prodData = await searchProducts(krogerToken, item, locationId, 1);
          const p = prodData.data?.[0];
          if (!p) continue;

          const price = p.items?.[0]?.price;
          const imageUrl = p.images?.[0]?.sizes?.find((s: any) => s.size === "medium")?.url ||
            p.images?.[0]?.sizes?.find((s: any) => s.size === "small")?.url ||
            p.images?.[0]?.sizes?.[0]?.url || null;
          const regularPrice = price?.regular ?? price?.promo ?? 0;
          const salePrice = price?.promo && price.promo < price.regular ? price.promo : null;

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

          // 3. Write to cache (fire-and-forget)
          // Get or create Kroger retailer
          const { data: retailer } = await serviceClient
            .from("retailers")
            .select("retailer_id")
            .eq("retailer_slug", "kroger")
            .maybeSingle();

          if (retailer) {
            const { data: rp } = await serviceClient
              .from("retailer_products")
              .upsert({
                retailer_id: retailer.retailer_id,
                provider_name: "kroger_api",
                provider_product_reference: p.productId,
                retailer_product_title: p.description || "Unknown",
                retailer_brand: p.brand || null,
                gtin_upc: p.upc || null,
                image_url: imageUrl,
                package_size_text: p.items?.[0]?.size || null,
                active_status: "active",
              }, { onConflict: "retailer_id,provider_product_reference", ignoreDuplicates: false })
              .select("retailer_product_id")
              .single();

            if (rp) {
              await serviceClient.from("store_product_prices").upsert({
                retailer_product_id: rp.retailer_product_id,
                retailer_id: retailer.retailer_id,
                base_price: regularPrice,
                sale_price: salePrice,
                source_system: "kroger_api",
                freshness_status: "recent",
                last_verified_at: new Date().toISOString(),
                zip_code_context: zipCode || null,
              }, { onConflict: "retailer_product_id,retailer_id", ignoreDuplicates: false });
            }
          }
        } catch {
          // Skip failed items
        }
      }

      return new Response(JSON.stringify({
        prices: results,
        cacheHits: items.length - cacheMisses.length,
        cacheMisses: cacheMisses.length,
        fetched: toFetch.length,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }


    if (action === "sync-products") {
      const { data: isAdminData } = await supabase.rpc("is_admin", {
        _user_id: claimsData.claims.sub,
      });
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

      const serviceClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Ensure Kroger retailer exists
      const { data: existingRetailer } = await serviceClient
        .from("retailers")
        .select("retailer_id")
        .eq("retailer_slug", "kroger")
        .maybeSingle();

      let retailerId: string;
      if (existingRetailer) {
        retailerId = existingRetailer.retailer_id;
      } else {
        const { data: newRetailer, error: retErr } = await serviceClient
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
        if (retErr) throw retErr;
        retailerId = newRetailer.retailer_id;
      }

      const prodData = await searchProducts(krogerToken, searchTerm, locationId, 50);
      const products = prodData.data || [];

      let synced = 0;
      let failed = 0;

      for (const product of products) {
        try {
          const upc = product.upc || null;
          const title = product.description || "Unknown Product";
          const brand = product.brand || null;
          const category = product.categories?.[0] || null;
          const imageUrl = product.images?.[0]?.sizes?.find((s: any) => s.size === "medium")?.url ||
            product.images?.[0]?.sizes?.[0]?.url || null;
          const size = product.items?.[0]?.size || null;

          // Upsert retailer product
          const { data: rp, error: rpErr } = await serviceClient
            .from("retailer_products")
            .upsert(
              {
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
              },
              { onConflict: "retailer_id,provider_product_reference", ignoreDuplicates: false }
            )
            .select("retailer_product_id")
            .single();

          if (rpErr) {
            // Fallback: try insert if upsert fails due to missing unique constraint
            const { data: existingRp } = await serviceClient
              .from("retailer_products")
              .select("retailer_product_id")
              .eq("retailer_id", retailerId)
              .eq("provider_product_reference", product.productId)
              .maybeSingle();

            const rpId = existingRp?.retailer_product_id;
            if (!rpId) {
              const { data: insertedRp, error: insertErr } = await serviceClient
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
              if (insertErr) { failed++; continue; }
              // Sync price with insertedRp
              await syncPrice(serviceClient, insertedRp.retailer_product_id, retailerId, product, locationId, zipCode);
            } else {
              await syncPrice(serviceClient, rpId, retailerId, product, locationId, zipCode);
            }
          } else {
            await syncPrice(serviceClient, rp.retailer_product_id, retailerId, product, locationId, zipCode);
          }

          synced++;
        } catch {
          failed++;
        }
      }

      // Log the sync
      await serviceClient.from("provider_sync_logs").insert({
        provider_name: "kroger_api",
        sync_type: "product_price",
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

    return new Response(JSON.stringify({ error: "Invalid action. Use: find-locations, search-products, sync-products" }), {
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

async function syncPrice(
  serviceClient: any,
  retailerProductId: string,
  retailerId: string,
  product: any,
  locationId: string,
  zipCode?: string
) {
  const priceInfo = product.items?.[0]?.price;
  if (!priceInfo) return;

  const basePrice = priceInfo.regular ?? priceInfo.promo ?? 0;
  const salePrice = priceInfo.promo && priceInfo.promo < priceInfo.regular ? priceInfo.promo : null;

  await serviceClient.from("store_product_prices").upsert(
    {
      retailer_product_id: retailerProductId,
      retailer_id: retailerId,
      base_price: basePrice,
      sale_price: salePrice,
      source_system: "kroger_api",
      freshness_status: "recent",
      last_verified_at: new Date().toISOString(),
      zip_code_context: zipCode || null,
    },
    { onConflict: "retailer_product_id,retailer_id", ignoreDuplicates: false }
  );
}
