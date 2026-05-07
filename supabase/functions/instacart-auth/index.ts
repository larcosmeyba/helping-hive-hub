// Instacart Connect OAuth — issues and caches access tokens (service-role only)
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SANDBOX_BASE = "https://connect.dev.instacart.tools";
const PROD_BASE = "https://connect.instacart.com";

interface CachedToken {
  access_token: string;
  token_type: string;
  scope: string | null;
  expires_at: string;
}

async function mintToken(env: "sandbox" | "production") {
  const clientId = Deno.env.get("INSTACART_CLIENT_ID");
  const clientSecret = Deno.env.get("INSTACART_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error("Missing INSTACART_CLIENT_ID or INSTACART_CLIENT_SECRET");
  }

  const base = env === "production" ? PROD_BASE : SANDBOX_BASE;
  const basic = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch(`${base}/v2/oauth/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basic}`,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: "grant_type=client_credentials",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`Instacart OAuth failed (${res.status}): ${text}`);
  }
  const json = JSON.parse(text);
  // expected: { access_token, token_type, expires_in, scope? }
  const expiresIn = Number(json.expires_in ?? 3600);
  // Refresh 60s early to avoid edge-of-window failures
  const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000).toISOString();

  return {
    access_token: json.access_token as string,
    token_type: (json.token_type as string) ?? "Bearer",
    scope: (json.scope as string) ?? null,
    expires_at: expiresAt,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let body: { environment?: string; force_refresh?: boolean } = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const env: "sandbox" | "production" =
      body.environment === "production" ? "production" : "sandbox";
    const forceRefresh = !!body.force_refresh;

    // Try cache first
    if (!forceRefresh) {
      const { data: cached } = await supabase
        .from("instacart_access_tokens")
        .select("access_token, token_type, scope, expires_at")
        .eq("environment", env)
        .gt("expires_at", new Date().toISOString())
        .order("expires_at", { ascending: false })
        .limit(1)
        .maybeSingle<CachedToken>();

      if (cached) {
        return new Response(
          JSON.stringify({ ...cached, cached: true, environment: env }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Mint a new one
    const fresh = await mintToken(env);

    // Persist (service role bypasses RLS)
    const { error: insErr } = await supabase
      .from("instacart_access_tokens")
      .insert({
        environment: env,
        access_token: fresh.access_token,
        token_type: fresh.token_type,
        scope: fresh.scope,
        expires_at: fresh.expires_at,
      });
    if (insErr) console.error("Token cache insert failed:", insErr);

    // Best-effort cleanup of expired rows
    await supabase
      .from("instacart_access_tokens")
      .delete()
      .lt("expires_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    return new Response(
      JSON.stringify({ ...fresh, cached: false, environment: env }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("instacart-auth error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
