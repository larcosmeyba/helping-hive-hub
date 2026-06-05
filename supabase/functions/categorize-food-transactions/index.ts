// Re-runs the food-category classifier against any food_transactions whose
// normalized_category looks stale. Useful after we update merchant heuristics.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { categorizeFoodTransaction } from "../_shared/plaid.ts";

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
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: rows, error } = await admin
      .from("food_transactions")
      .select("id, merchant_name, transaction_name, category, normalized_category")
      .eq("user_id", userId);
    if (error) throw error;

    let updated = 0;
    for (const r of rows ?? []) {
      const detailed = (r.category ?? "").toUpperCase();
      const cat = categorizeFoodTransaction({
        merchant_name: r.merchant_name,
        name: r.transaction_name,
        personal_finance_category: { detailed, primary: detailed.split("_")[0] },
        category: r.category ? [r.category] : [],
      });
      if (cat && cat !== r.normalized_category) {
        await admin.from("food_transactions").update({ normalized_category: cat }).eq("id", r.id);
        updated++;
      }
    }
    return new Response(JSON.stringify({ success: true, updated }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
