// Begin Kroger user OAuth (authorization_code) — returns an authorize URL.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  getKrogerBaseUrl,
  getKrogerCreds,
  getKrogerEnv,
  getServiceClient,
} from "../_shared/kroger.ts";

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
    const rawRedirect: string = body.redirectAfter ?? "/dashboard/settings";
    const scope: string = body.scope ?? "product.compact profile.compact cart.basic:write";

    // Resolve redirect to an ABSOLUTE URL on an allowed app origin so the
    // callback's 302 lands on the app — not on the Supabase functions domain
    // (which returns {"error":"requested path is invalid"}).
    const ALLOWED_APP_ORIGINS = [
      "https://helpthehive.com",
      "https://www.helpthehive.com",
      "https://helping-hive-hub.lovable.app",
      "https://id-preview--bf8fd03f-0e47-4e05-b2a3-0c914e6bd586.lovable.app",
      "http://localhost:8080",
      "http://localhost:5173",
      "http://localhost:3000",
    ];
    const DEFAULT_APP_ORIGIN = "https://helpthehive.com";
    const reqOrigin = req.headers.get("Origin") ?? req.headers.get("Referer") ?? "";
    let originBase = DEFAULT_APP_ORIGIN;
    try {
      const o = new URL(reqOrigin).origin;
      if (ALLOWED_APP_ORIGINS.includes(o)) originBase = o;
    } catch { /* ignore */ }

    let redirectAfter = rawRedirect;
    if (rawRedirect.startsWith("http://") || rawRedirect.startsWith("https://")) {
      try {
        const u = new URL(rawRedirect);
        if (!ALLOWED_APP_ORIGINS.includes(u.origin)) {
          redirectAfter = `${originBase}${u.pathname}${u.search}`;
        }
      } catch {
        redirectAfter = `${originBase}/dashboard/settings`;
      }
    } else {
      const path = rawRedirect.startsWith("/") ? rawRedirect : `/${rawRedirect}`;
      redirectAfter = `${originBase}${path}`;
    }

    const state = crypto.randomUUID();
    const supabase = getServiceClient();
    await supabase.from("kroger_oauth_states").insert({
      state,
      user_id: userId,
      redirect_after: redirectAfter,
    });

    const { clientId } = getKrogerCreds();
    const env = getKrogerEnv();
    const redirectUri =
      `${Deno.env.get("SUPABASE_URL")}/functions/v1/kroger-oauth-callback`;
    const url = new URL(`${getKrogerBaseUrl(env)}/connect/oauth2/authorize`);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", scope);
    url.searchParams.set("state", state);

    return new Response(JSON.stringify({ authorizeUrl: url.toString(), redirectUri }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
