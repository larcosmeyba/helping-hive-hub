// Plaid webhook receiver. Handles SESSION_FINISHED events from Hosted Link
// and exchanges the resulting public_tokens for access tokens.
// No JWT verification (Plaid calls this endpoint directly).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { plaidFetch, encryptToken, getPlaidConfig } from "../_shared/plaid.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("ok", { headers: corsHeaders });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return new Response("bad payload", { status: 400, headers: corsHeaders });
  }

  const webhookType = String(payload.webhook_type ?? "");
  const webhookCode = String(payload.webhook_code ?? "");

  // We only care about hosted-link session completion.
  if (webhookType !== "LINK" || webhookCode !== "SESSION_FINISHED") {
    return new Response(JSON.stringify({ ok: true, ignored: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    if (!getPlaidConfig()) throw new Error("PLAID_NOT_CONFIGURED");

    const linkToken = String(payload.link_token ?? "");
    const status = String(payload.status ?? "");
    const publicTokens = Array.isArray(payload.public_tokens) ? payload.public_tokens as string[] : [];

    if (!linkToken) throw new Error("missing link_token");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Look up the user that started this link session.
    const { data: session, error: sessErr } = await admin
      .from("plaid_link_sessions")
      .select("user_id")
      .eq("link_token", linkToken)
      .maybeSingle();
    if (sessErr) throw sessErr;
    if (!session) {
      // Unknown link_token — likely expired or seeded elsewhere; ack so Plaid stops retrying.
      return new Response(JSON.stringify({ ok: true, unknown_token: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = session.user_id as string;

    if (status === "success" && publicTokens.length > 0) {
      for (const publicToken of publicTokens) {
        const exchange = await plaidFetch("/item/public_token/exchange", { public_token: publicToken });
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
      }
    }

    // Clean up the mapping row regardless of outcome.
    await admin.from("plaid_link_sessions").delete().eq("link_token", linkToken);

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("plaid-webhook error:", e);
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
