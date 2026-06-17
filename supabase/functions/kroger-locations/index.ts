// Kroger store lookup — by ZIP, city, or state.
// Caches every returned store in kroger_locations.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { getServiceClient, krogerGet } from "../_shared/kroger.ts";

interface LocationItem {
  locationId: string;
  name: string;
  address?: {
    addressLine1?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  geolocation?: { latitude?: number; longitude?: number };
  phone?: string;
  hours?: unknown;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const url = new URL(req.url);
    const zip = body.zip ?? url.searchParams.get("zip") ?? undefined;
    const city = body.city ?? url.searchParams.get("city") ?? undefined;
    const state = body.state ?? url.searchParams.get("state") ?? undefined;
    const radius = Number(body.radiusInMiles ?? url.searchParams.get("radius") ?? 25);
    const limit = Math.min(Number(body.limit ?? 25), 50);

    if (!zip && !city && !state) {
      return new Response(
        JSON.stringify({ error: "Provide zip, city, or state" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const params: Record<string, string | number> = {
      "filter.limit": limit,
      "filter.radiusInMiles": radius,
    };
    if (zip) params["filter.zipCode.near"] = zip;
    if (city) params["filter.city"] = city;
    if (state) params["filter.state"] = state;

    const data = await krogerGet<{ data: LocationItem[] }>("/locations", params);
    const items = data.data ?? [];

    const supabase = getServiceClient();
    if (items.length) {
      const rows = items.map((l) => ({
        location_id: l.locationId,
        name: l.name,
        address: l.address?.addressLine1 ?? null,
        city: l.address?.city ?? null,
        state: l.address?.state ?? null,
        zip_code: l.address?.zipCode ?? null,
        latitude: l.geolocation?.latitude ?? null,
        longitude: l.geolocation?.longitude ?? null,
        phone: l.phone ?? null,
        hours: l.hours ?? null,
        raw: l as unknown as Record<string, unknown>,
        cached_at: new Date().toISOString(),
      }));
      await supabase.from("kroger_locations").upsert(rows, { onConflict: "location_id" });
    }

    return new Response(JSON.stringify({ stores: items }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
