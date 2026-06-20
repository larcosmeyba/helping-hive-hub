// update-grocery-status: transition a meal_plan's grocery_status through
// not_generated → generated → reviewed → sent_to_instacart → purchased.
// Stores instacart_order_id + purchase_date when status = purchased.
// Accepts "shopped" as an alias of "purchased" (Shop Groceries flow).

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, getUserIdFromAuth } from "../_shared/mealPlanContext.ts";
import { captureEdgeError } from "../_shared/sentry.ts";

const ALLOWED = new Set([
  "not_generated",
  "generated",
  "reviewed",
  "sent_to_instacart",
  "shopped",
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

    const rawStatus = status as string;
    if (!rawStatus || !ALLOWED.has(rawStatus)) {
      return new Response(
        JSON.stringify({ error: `status must be one of ${[...ALLOWED].join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const normStatus = rawStatus === "shopped" ? "purchased" : rawStatus;

    const admin = adminClient();

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

    const update: Record<string, unknown> = { grocery_status: normStatus };
    if (normStatus === "purchased") {
      update.grocery_purchase_date = new Date().toISOString();
      if (instacart_order_id) update.instacart_order_id = String(instacart_order_id);
    }

    const { error } = await admin
      .from("meal_plans")
      .update(update)
      .eq("id", planId)
      .eq("user_id", userId);

    if (error) throw error;

    if (normStatus === "purchased") {
      await admin
        .from("grocery_lists")
        .update({ status: "purchased" })
        .eq("meal_plan_id", planId)
        .eq("user_id", userId);
    }

    return new Response(JSON.stringify({ ok: true, status: normStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    try { captureEdgeError(err, { fn: "update-grocery-status" }); } catch { /* */ }
    console.error("[update-grocery-status] error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
