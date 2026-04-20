import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// State -> BLS Region mapping
const STATE_TO_REGION: Record<string, { region: string; code: string }> = {};
const NORTHEAST = ["CT","ME","MA","NH","RI","VT","NJ","NY","PA"];
const MIDWEST = ["IL","IN","MI","OH","WI","IA","KS","MN","MO","NE","ND","SD"];
const SOUTH = ["DE","MD","DC","FL","GA","NC","SC","VA","WV","AL","KY","MS","TN","AR","LA","OK","TX"];
const WEST = ["AZ","CO","ID","MT","NV","NM","UT","WY","AK","CA","HI","OR","WA"];

NORTHEAST.forEach(s => STATE_TO_REGION[s] = { region: "Northeast", code: "S100" });
MIDWEST.forEach(s => STATE_TO_REGION[s] = { region: "Midwest", code: "S200" });
SOUTH.forEach(s => STATE_TO_REGION[s] = { region: "South", code: "S300" });
WEST.forEach(s => STATE_TO_REGION[s] = { region: "West", code: "S400" });

const CACHE_DAYS = 30;
const FETCH_TIMEOUT_MS = 6000;

// Approximate national average baseline so we can compute a relative multiplier.
// Real-world recent BLS CPI for "Food at home" is around 300; we treat this as the national reference.
const NATIONAL_REFERENCE_CPI = 300;

async function fetchRegionalCPI(regionCode: string): Promise<number | null> {
  const seriesId = `CUUR${regionCode}SA0L1`;
  const url = `https://api.bls.gov/publicAPI/v2/timeseries/data/${seriesId}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = await res.json();
    const series = data?.Results?.series?.[0]?.data;
    if (!Array.isArray(series) || series.length === 0) return null;
    // Average the latest 12 months
    const latest = series.slice(0, 12).map((d: any) => parseFloat(d.value)).filter((n: number) => !isNaN(n));
    if (latest.length === 0) return null;
    return latest.reduce((a, b) => a + b, 0) / latest.length;
  } catch (err) {
    clearTimeout(timeout);
    console.error(`BLS fetch failed for ${regionCode}:`, err);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { state } = await req.json().catch(() => ({ state: "" }));
    const stateUpper = (state || "").toString().toUpperCase().slice(0, 2);
    const regionInfo = STATE_TO_REGION[stateUpper];

    if (!regionInfo) {
      return new Response(
        JSON.stringify({ region: "National", multiplier: 1.0, lastUpdated: null, fallback: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check cache
    const { data: cached } = await supabase
      .from("bls_regional_cpi_cache")
      .select("*")
      .eq("region", regionInfo.region)
      .maybeSingle();

    const cacheAgeMs = cached ? Date.now() - new Date(cached.cached_at).getTime() : Infinity;
    if (cached && cacheAgeMs < CACHE_DAYS * 24 * 60 * 60 * 1000) {
      return new Response(
        JSON.stringify({
          region: cached.region,
          multiplier: Number(cached.multiplier),
          lastUpdated: cached.cached_at,
          cached: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch live BLS data for this region + a sample national ref by averaging all 4
    const regionalCpi = await fetchRegionalCPI(regionInfo.code);

    let multiplier = 1.0;
    if (regionalCpi && regionalCpi > 0) {
      multiplier = Math.round((regionalCpi / NATIONAL_REFERENCE_CPI) * 100) / 100;
      // Sanity clamp
      if (multiplier < 0.7) multiplier = 0.7;
      if (multiplier > 1.5) multiplier = 1.5;
    } else if (cached) {
      // Stale cache fallback
      return new Response(
        JSON.stringify({
          region: cached.region,
          multiplier: Number(cached.multiplier),
          lastUpdated: cached.cached_at,
          cached: true,
          stale: true,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Upsert cache
    await supabase.from("bls_regional_cpi_cache").upsert(
      {
        region: regionInfo.region,
        region_code: regionInfo.code,
        multiplier,
        last_cpi_value: regionalCpi,
        national_avg_cpi: NATIONAL_REFERENCE_CPI,
        cached_at: new Date().toISOString(),
      },
      { onConflict: "region" }
    );

    return new Response(
      JSON.stringify({
        region: regionInfo.region,
        multiplier,
        lastUpdated: new Date().toISOString(),
        cached: false,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("bls-price-index error:", err);
    return new Response(
      JSON.stringify({ region: "National", multiplier: 1.0, lastUpdated: null, fallback: true, error: String(err) }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
