// update-grocery-status: transition a meal_plan's grocery_status through
// not_generated → generated → reviewed → sent_to_instacart → purchased.
// Stores instacart_order_id + purchase_date when status = purchased.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, getUserIdFromAuth } from "../_shared/mealPlanContext.ts";

const ALLOWED = new Set([
  "not_generated",
  "generated",
  "reviewed",
  "sent_to_instacart",
  "purchased",
]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const userId = await getUserIdFromAuth(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { meal_plan_id, status, instacart_order_id } = await req.json().catch(() => ({}));

    if (!status || !ALLOWED.has(status)) {
      return new Response(
        JSON.stringify({ error: `status must be one of ${[...ALLOWED].join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const admin = adminClient();

    // Resolve plan
    let planId = meal_plan_id as string | undefined;
    if (!planId) {
      const { data: active } = await admin
        .from("meal_plans")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      planId = active?.id;
    }
    if (!planId) {
      return new Response(JSON.stringify({ error: "No meal plan to update" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const update: Record<string, unknown> = { grocery_status: status };
    if (status === "purchased") {
      update.grocery_purchase_date = new Date().toISOString();
      if (instacart_order_id) update.instacart_order_id = String(instacart_order_id);
    }

    const { error } = await admin
      .from("meal_plans")
      .update(update)
      .eq("id", planId)
      .eq("user_id", userId);

    if (error) throw error;

    // Mirror onto grocery_lists.status when applicable
    if (status === "purchased") {
      await admin
        .from("grocery_lists")
        .update({ status: "purchased" })
        .eq("meal_plan_id", planId)
        .eq("user_id", userId);
    }

    return new Response(JSON.stringify({ ok: true, status }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[update-grocery-status] error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
