import { createClient } from "npm:@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { plaidFetch, getPlaidConfig } from "../_shared/plaid.ts";

Deno.serve(async (req) => {
  const cors = buildCorsHeaders(req);
  const pf = handlePreflight(req);
  if (pf) return pf;
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userRes, error: userErr } = await sb.auth.getUser();
    if (userErr || !userRes?.user) {
      console.error("[create-plaid-link-token] auth failed", userErr);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }
    const userId = userRes.user.id;

    if (!getPlaidConfig()) {
      return new Response(JSON.stringify({ error: "PLAID_NOT_CONFIGURED" }), {
        status: 503,
        headers: { ...cors, "Content-Type": "application/json" },
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

    let result: any;
    try {
      result = await plaidFetch("/link/token/create", params);
    } catch (plaidErr) {
      console.error("[create-plaid-link-token] Plaid error (hosted=" + hosted + "):", plaidErr);
      // If hosted fails (e.g. Plaid Dashboard doesn't have hosted_link enabled,
      // or completion_redirect_uri isn't whitelisted), fall back to a plain
      // link_token. The native client can open Plaid's hosted Link page via
      // cdn.plaid.com using the token directly.
      if (hosted) {
        delete params.hosted_link;
        try {
          result = await plaidFetch("/link/token/create", params);
          console.warn("[create-plaid-link-token] hosted fallback to plain link_token succeeded");
        } catch (plaidErr2) {
          console.error("[create-plaid-link-token] fallback also failed:", plaidErr2);
          return new Response(
            JSON.stringify({ error: String((plaidErr2 as Error).message ?? plaidErr2) }),
            { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
          );
        }
      } else {
        return new Response(
          JSON.stringify({ error: String((plaidErr as Error).message ?? plaidErr) }),
          { status: 502, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
    }

    // Persist link_token → user mapping so the webhook can resolve user on
    // SESSION_FINISHED. This works for both hosted_link and the plain
    // link.html fallback (Plaid sends webhooks for both flows).
    if (result?.link_token) {
      const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await admin.from("plaid_link_sessions").upsert(
        { link_token: result.link_token, user_id: userId },
        { onConflict: "link_token" },
      );
    }

    // If hosted_link wasn't returned, synthesize a hosted URL via cdn.plaid.com.
    // This is Plaid's mobile-friendly hosted Link page, which works inside
    // Capacitor's in-app browser.
    const hostedUrl = result?.hosted_link_url
      ?? (hosted && result?.link_token
        ? `https://cdn.plaid.com/link/v2/stable/link.html?isWebview=true&token=${encodeURIComponent(result.link_token)}`
        : null);

    return new Response(JSON.stringify({
      link_token: result.link_token,
      expiration: result.expiration,
      hosted_link_url: hostedUrl,
    }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[create-plaid-link-token] unexpected error:", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
