import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { plaidFetch, decryptToken, getPlaidConfig } from "../_shared/plaid.ts";

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
    const { delete_transactions } = await req.json().catch(() => ({ delete_transactions: false }));
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: conns } = await admin
      .from("plaid_connections")
      .select("id, access_token_encrypted")
      .eq("user_id", userId);

    if (getPlaidConfig()) {
      for (const c of conns ?? []) {
        try {
          const token = await decryptToken(c.access_token_encrypted);
          await plaidFetch("/item/remove", { access_token: token });
        } catch {
          // Swallow Plaid errors on disconnect so the user can always cut ties.
        }
      }
    }

    await admin.from("plaid_accounts").delete().eq("user_id", userId);
    await admin.from("plaid_connections").delete().eq("user_id", userId);
    if (delete_transactions) {
      await admin.from("food_transactions").delete().eq("user_id", userId);
      await admin.from("food_budget_summaries").delete().eq("user_id", userId);
      await admin.from("budget_ai_insights").delete().eq("user_id", userId);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
