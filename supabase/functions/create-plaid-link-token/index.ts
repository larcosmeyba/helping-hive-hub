import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { plaidFetch, getPlaidConfig } from "../_shared/plaid.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error } = await sb.auth.getClaims(auth.replace("Bearer ", ""));
    if (error || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub;

    if (!getPlaidConfig()) {
      return new Response(JSON.stringify({ error: "PLAID_NOT_CONFIGURED" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let body: { hosted?: boolean } = {};
    try { body = await req.json(); } catch { /* no body */ }
    const hosted = body.hosted === true;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const webhookUrl = `${supabaseUrl}/functions/v1/plaid-webhook`;

    const params: Record<string, unknown> = {
      user: { client_user_id: userId },
      client_name: "Help The Hive",
      products: ["transactions"],
      country_codes: ["US"],
      language: "en",
      webhook: webhookUrl,
    };
    if (hosted) {
      params.hosted_link = {
        completion_redirect_uri: "https://helpthehive.com/dashboard/budget-snapshot/syncing",
        url_lifetime_seconds: 900,
        is_mobile_app: true,
      };
    }

    const result = await plaidFetch("/link/token/create", params);

    // For hosted flow, persist link_token → user mapping so the webhook can resolve user.
    if (hosted && result.link_token) {
      const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await admin.from("plaid_link_sessions").upsert(
        { link_token: result.link_token, user_id: userId },
        { onConflict: "link_token" },
      );
    }

    return new Response(JSON.stringify({
      link_token: result.link_token,
      expiration: result.expiration,
      hosted_link_url: result.hosted_link_url ?? null,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
