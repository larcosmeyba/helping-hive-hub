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
    const redirectAfter: string = body.redirectAfter ?? "/dashboard/settings";
    const scope: string = body.scope ?? "product.compact profile.compact cart.basic:write";

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
