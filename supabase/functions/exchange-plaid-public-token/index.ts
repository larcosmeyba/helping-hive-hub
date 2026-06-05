import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { plaidFetch, encryptToken, getPlaidConfig } from "../_shared/plaid.ts";

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
    const { data: claims, error: claimErr } = await sb.auth.getClaims(auth.replace("Bearer ", ""));
    if (claimErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub;
    const { public_token } = await req.json();
    if (!public_token || typeof public_token !== "string") {
      return new Response(JSON.stringify({ error: "public_token required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!getPlaidConfig()) {
      return new Response(JSON.stringify({ error: "PLAID_NOT_CONFIGURED" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const exchange = await plaidFetch("/item/public_token/exchange", { public_token });
    const accessToken: string = exchange.access_token;
    const itemId: string = exchange.item_id;

    const item = await plaidFetch("/item/get", { access_token: accessToken });
    const institutionId = item.item?.institution_id ?? null;
    let institutionName: string | null = null;
    if (institutionId) {
      try {
        const inst = await plaidFetch("/institutions/get_by_id", {
          institution_id: institutionId,
          country_codes: ["US"],
        });
        institutionName = inst.institution?.name ?? null;
      } catch {
        institutionName = null;
      }
    }

    const accountsRes = await plaidFetch("/accounts/get", { access_token: accessToken });
    const accounts: Array<{
      account_id: string;
      name: string;
      type: string;
      subtype?: string;
      mask?: string;
    }> = accountsRes.accounts ?? [];

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const encrypted = await encryptToken(accessToken);

    const { data: conn, error: connErr } = await admin
      .from("plaid_connections")
      .upsert(
        {
          user_id: userId,
          item_id: itemId,
          institution_id: institutionId,
          institution_name: institutionName,
          access_token_encrypted: encrypted,
          status: "active",
        },
        { onConflict: "user_id,item_id" },
      )
      .select("id")
      .single();
    if (connErr) throw connErr;

    if (accounts.length > 0) {
      await admin.from("plaid_accounts").upsert(
        accounts.map((a) => ({
          user_id: userId,
          plaid_connection_id: conn.id,
          account_id: a.account_id,
          account_name: a.name,
          account_type: a.type,
          account_subtype: a.subtype ?? null,
          mask: a.mask ?? null,
          connected: true,
        })),
        { onConflict: "user_id,account_id" },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        institution_name: institutionName,
        connected_account_id: accounts[0]?.account_id ?? null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
