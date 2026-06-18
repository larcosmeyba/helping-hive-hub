// Admin-only smoke test for the Kroger integration.
// Validates OAuth config, app token, store lookup, product search, and the
// grocery-matching pipeline against the currently active environment.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  getAppToken,
  getKrogerBaseUrl,
  getKrogerCreds,
  getKrogerEnv,
  getServiceClient,
  krogerGet,
} from "../_shared/kroger.ts";

type CheckStatus = "pass" | "fail" | "skip";
interface Check {
  name: string;
  status: CheckStatus;
  detail?: string;
  durationMs?: number;
}

async function run(name: string, fn: () => Promise<string>): Promise<Check> {
  const start = Date.now();
  try {
    const detail = await fn();
    return { name, status: "pass", detail, durationMs: Date.now() - start };
  } catch (e) {
    return {
      name,
      status: "fail",
      detail: (e as Error).message,
      durationMs: Date.now() - start,
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    if (!authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: claims } = await userClient.auth.getClaims(
      authHeader.replace("Bearer ", ""),
    );
    const uid = claims?.claims?.sub;
    if (!uid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabase = getServiceClient();
    const { data: isAdminData } = await supabase.rpc("is_admin", {
      _user_id: uid,
    });
    if (!isAdminData) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const env = getKrogerEnv();
    const baseUrl = getKrogerBaseUrl(env);

    const checks: Check[] = [];

    // 1. OAuth config (client creds present)
    checks.push(
      await run("OAuth configuration", async () => {
        const creds = getKrogerCreds(env);
        if (!creds.clientId || !creds.clientSecret) {
          throw new Error(
            `Missing ${env === "production" ? "KROGER_PROD_*" : "KROGER_CERT_*"} secrets`,
          );
        }
        return `${env} client_id configured (${creds.clientId.slice(0, 6)}…)`;
      }),
    );

    // 2. App token (client_credentials)
    let token = "";
    checks.push(
      await run("Token generation", async () => {
        token = await getAppToken("product.compact");
        return `Bearer token issued (${token.length} chars)`;
      }),
    );

    // 3. Store lookup
    let locationId = "";
    checks.push(
      await run("Store lookup", async () => {
        if (!token) throw new Error("Skipped — no token");
        const data = await krogerGet<{ data?: Array<{ locationId: string; name: string; address?: { city?: string; state?: string } }> }>(
          "/locations",
          { "filter.zipCode.near": "45202", "filter.limit": 3 },
          token,
        );
        const first = data?.data?.[0];
        if (!first?.locationId) throw new Error("No locations returned");
        locationId = first.locationId;
        return `${first.name} (${first.address?.city ?? ""}, ${first.address?.state ?? ""}) #${first.locationId}`;
      }),
    );

    // 4. Product search
    let productCount = 0;
    checks.push(
      await run("Product search", async () => {
        if (!token) throw new Error("Skipped — no token");
        const data = await krogerGet<{ data?: Array<{ productId: string; description: string }> }>(
          "/products",
          {
            "filter.term": "milk",
            "filter.locationId": locationId || undefined,
            "filter.limit": 5,
          },
          token,
        );
        productCount = data?.data?.length ?? 0;
        if (productCount === 0) throw new Error("No products returned for 'milk'");
        return `${productCount} products returned for "milk"`;
      }),
    );

    // 5. Grocery matching pipeline (invoke kroger-match-grocery-list in dry-run)
    checks.push(
      await run("Grocery matching pipeline", async () => {
        const url = `${Deno.env.get("SUPABASE_URL")}/functions/v1/kroger-match-grocery-list`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
            apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
          },
          body: JSON.stringify({
            smokeTest: true,
            locationId: locationId || undefined,
            items: [
              { name: "milk", quantity: 1, unit: "gallon" },
              { name: "eggs", quantity: 12, unit: "count" },
              { name: "bread", quantity: 1, unit: "loaf" },
            ],
          }),
        });
        const text = await res.text();
        if (!res.ok) {
          throw new Error(`match function ${res.status}: ${text.slice(0, 200)}`);
        }
        let parsed: any = null;
        try { parsed = JSON.parse(text); } catch { /* ignore */ }
        const matched = parsed?.summary?.matched ?? parsed?.matched?.length ?? 0;
        const total = parsed?.summary?.total ?? 3;
        return `${matched}/${total} sample items matched`;
      }),
    );

    // Last successful API call from cache
    const { data: lastMatch } = await supabase
      .from("kroger_product_matches")
      .select("matched_at")
      .eq("status", "matched")
      .order("matched_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const overall: CheckStatus = checks.every((c) => c.status === "pass")
      ? "pass"
      : "fail";

    return new Response(
      JSON.stringify({
        environment: env,
        baseUrl,
        overall,
        ranAt: new Date().toISOString(),
        lastSuccessfulApiCall: lastMatch?.matched_at ?? null,
        checks,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
