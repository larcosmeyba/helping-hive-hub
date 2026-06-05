import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { plaidFetch, decryptToken, categorizeFoodTransaction, getPlaidConfig } from "../_shared/plaid.ts";

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
    const { data: claims, error: cErr } = await sb.auth.getClaims(auth.replace("Bearer ", ""));
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub;
    if (!getPlaidConfig()) {
      return new Response(JSON.stringify({ error: "PLAID_NOT_CONFIGURED" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: connections, error: connErr } = await admin
      .from("plaid_connections")
      .select("id, access_token_encrypted")
      .eq("user_id", userId)
      .eq("status", "active");
    if (connErr) throw connErr;
    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({ error: "NO_CONNECTION" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let imported = 0;
    let scanned = 0;
    for (const c of connections) {
      const accessToken = await decryptToken(c.access_token_encrypted);
      let cursor: string | undefined;
      let hasMore = true;
      while (hasMore) {
        const page = await plaidFetch("/transactions/sync", {
          access_token: accessToken,
          cursor,
          count: 500,
        });
        const added: any[] = page.added ?? [];
        const modified: any[] = page.modified ?? [];
        scanned += added.length + modified.length;
        const upserts = [...added, ...modified]
          .map((tx) => {
            const cat = categorizeFoodTransaction(tx);
            if (!cat) return null;
            return {
              user_id: userId,
              plaid_transaction_id: tx.transaction_id,
              account_id: tx.account_id,
              merchant_name: tx.merchant_name ?? null,
              transaction_name: tx.name ?? null,
              amount: tx.amount,
              date: tx.date,
              category: (tx.personal_finance_category?.detailed ?? (tx.category ?? []).join(" / ")) || null,
              normalized_category: cat,
              source: "plaid",
              pending: !!tx.pending,
            };
          })
          .filter(Boolean);
        if (upserts.length) {
          const { error: upErr } = await admin
            .from("food_transactions")
            .upsert(upserts as any[], { onConflict: "user_id,plaid_transaction_id" });
          if (upErr) throw upErr;
          imported += upserts.length;
        }
        const removed: any[] = page.removed ?? [];
        if (removed.length) {
          await admin
            .from("food_transactions")
            .delete()
            .eq("user_id", userId)
            .in(
              "plaid_transaction_id",
              removed.map((r) => r.transaction_id),
            );
        }
        cursor = page.next_cursor;
        hasMore = page.has_more;
      }
    }

    return new Response(JSON.stringify({ success: true, imported, scanned }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
