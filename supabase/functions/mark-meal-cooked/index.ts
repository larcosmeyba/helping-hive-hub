// mark-meal-cooked: marks a meal_plan_meals row as cooked, updates the
// parent meal_plan's progress + weekly_savings, decrements pantry stock
// for ingredients flagged already_have / source_location = pantry|fridge|freezer.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, getUserIdFromAuth } from "../_shared/mealPlanContext.ts";

function parseQty(q: unknown): number | null {
  if (q == null) return null;
  const m = String(q).match(/[\d.]+/);
  return m ? Number(m[0]) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const userId = await getUserIdFromAuth(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { meal_id, cooked = true } = await req.json().catch(() => ({}));
    if (!meal_id) {
      return new Response(JSON.stringify({ error: "meal_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = adminClient();

    const { data: meal } = await admin
      .from("meal_plan_meals")
      .select("id, meal_plan_id, estimated_cost, marked_cooked")
      .eq("id", meal_id)
      .eq("user_id", userId)
      .maybeSingle();

    if (!meal) {
      return new Response(JSON.stringify({ error: "Meal not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Toggle cooked
    await admin
      .from("meal_plan_meals")
      .update({ marked_cooked: cooked, cooked_at: cooked ? new Date().toISOString() : null })
      .eq("id", meal_id);

    // Decrement pantry inventory only on transition to cooked
    let wasteAvoided = 0;
    let savingsDelta = 0;
    if (cooked && !meal.marked_cooked) {
      const { data: ings } = await admin
        .from("meal_ingredients")
        .select("*")
        .eq("meal_id", meal_id);

      for (const ing of ings ?? []) {
        const fromInventory =
          ing.already_have ||
          ["pantry", "fridge", "freezer"].includes(String(ing.source_location));
        if (!fromInventory || !ing.pantry_item_id) continue;

        const { data: pi } = await admin
          .from("pantry_items")
          .select("id, quantity, expiration_date")
          .eq("id", ing.pantry_item_id)
          .eq("user_id", userId)
          .maybeSingle();
        if (!pi) continue;

        const have = parseQty(pi.quantity) ?? 0;
        const use = parseQty(ing.quantity) ?? have;
        const next = Math.max(0, have - use);
        await admin
          .from("pantry_items")
          .update({
            quantity: String(next),
            is_out_of_stock: next === 0,
            is_low_stock: next > 0 && next < 1,
          })
          .eq("id", pi.id);

        savingsDelta += Number(ing.estimated_price ?? 0);

        // Resolve expiring-soon alerts on this pantry item
        if (pi.expiration_date) {
          await admin
            .from("food_waste_alerts")
            .update({ resolved: true })
            .eq("pantry_item_id", pi.id)
            .eq("user_id", userId)
            .eq("resolved", false);
          wasteAvoided += 1;
        }
      }
    }

    // Recompute parent meal_plan progress
    const { data: planMeals } = await admin
      .from("meal_plan_meals")
      .select("marked_cooked")
      .eq("meal_plan_id", meal.meal_plan_id)
      .eq("user_id", userId);

    const completed = (planMeals ?? []).filter((m) => m.marked_cooked).length;

    const { data: plan } = await admin
      .from("meal_plans")
      .select("weekly_savings, food_waste_prevented_count")
      .eq("id", meal.meal_plan_id)
      .maybeSingle();

    await admin
      .from("meal_plans")
      .update({
        meals_completed: completed,
        weekly_savings: Number(plan?.weekly_savings ?? 0) + savingsDelta,
        food_waste_prevented_count:
          Number(plan?.food_waste_prevented_count ?? 0) + wasteAvoided,
      })
      .eq("id", meal.meal_plan_id);

    return new Response(
      JSON.stringify({
        ok: true,
        meals_completed: completed,
        savings_added: savingsDelta,
        waste_avoided_added: wasteAvoided,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[mark-meal-cooked] error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
