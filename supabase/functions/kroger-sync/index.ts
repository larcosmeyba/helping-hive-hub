import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const KROGER_TOKEN_URL = "https://api.kroger.com/v1/connect/oauth2/token";
const KROGER_PRODUCTS_URL = "https://api.kroger.com/v1/products";
const KROGER_LOCATIONS_URL = "https://api.kroger.com/v1/locations";

async function getKrogerToken(): Promise<string> {
  const clientId = Deno.env.get("KROGER_CLIENT_ID");
  const clientSecret = Deno.env.get("KROGER_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Kroger API credentials not configured");
  }

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

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, zipCode, searchTerm, locationId } = body;

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
      return new Response(JSON.stringify({ products: prodData.data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- ACTION: sync-products (admin-only: search + upsert into DB) ---
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
