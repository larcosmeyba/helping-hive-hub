// generate-grocery-list-from-meal-plan:
// Pulls all meal_ingredients for the active (or specified) meal_plan, filters
// out items the user already has (unless low stock), dedupes by item name,
// and inserts them as grocery_list_items linked to a grocery_lists row.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, getUserIdFromAuth } from "../_shared/mealPlanContext.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const userId = await getUserIdFromAuth(req);
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    let { meal_plan_id } = body as { meal_plan_id?: string };

    const admin = adminClient();

    if (!meal_plan_id) {
      const { data: active } = await admin
        .from("meal_plans")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "active")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      meal_plan_id = active?.id;
    }
    if (!meal_plan_id) {
      return new Response(JSON.stringify({ error: "No active meal plan" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pull all meals for this plan, then their ingredients
    const { data: meals } = await admin
      .from("meal_plan_meals")
      .select("id, meal_name")
      .eq("meal_plan_id", meal_plan_id)
      .eq("user_id", userId);

    const mealIds = (meals ?? []).map((m) => m.id);
    if (!mealIds.length) {
      return new Response(JSON.stringify({ error: "No meals in plan" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: ings } = await admin
      .from("meal_ingredients")
      .select("*")
      .in("meal_id", mealIds);

    // Low-stock pantry overrides "already_have"
    const { data: pantry } = await admin
      .from("pantry_items")
      .select("id, is_low_stock")
      .eq("user_id", userId);
    const lowStockIds = new Set(
      (pantry ?? []).filter((p) => p.is_low_stock).map((p) => p.id),
    );

    // Build dedupe map by lowercased item_name
    const grouped = new Map<string, {
      item_name: string;
      quantity: string;
      unit: string | null;
      estimated_price: number;
      instacart_search_term: string | null;
      needed_for_meals: string[];
    }>();

    const mealNameById = new Map((meals ?? []).map((m) => [m.id, m.meal_name]));

    for (const ing of ings ?? []) {
      const skipBecauseHave =
        ing.already_have &&
        !(ing.pantry_item_id && lowStockIds.has(ing.pantry_item_id));
      const needsGrocery =
        !ing.source_location || ing.source_location === "grocery_needed" || !skipBecauseHave;
      if (!needsGrocery) continue;

      const key = String(ing.item_name).trim().toLowerCase();
      const existing = grouped.get(key);
      const mealName = mealNameById.get(ing.meal_id) ?? "Meal";
      if (existing) {
        existing.estimated_price += Number(ing.estimated_price ?? 0);
        if (!existing.needed_for_meals.includes(mealName)) {
          existing.needed_for_meals.push(mealName);
        }
      } else {
        grouped.set(key, {
          item_name: ing.item_name,
          quantity: String(ing.quantity ?? "1"),
          unit: ing.unit ?? null,
          estimated_price: Number(ing.estimated_price ?? 0),
          instacart_search_term: ing.instacart_search_term ?? null,
          needed_for_meals: [mealName],
        });
      }
    }

    // Find or create active grocery_list
    let { data: list } = await admin
      .from("grocery_lists")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (!list) {
      const { data: created } = await admin
        .from("grocery_lists")
        .insert({ user_id: userId, meal_plan_id, status: "active" })
        .select("id")
        .single();
      list = created;
    }

    // Wipe prior meal_plan-sourced items for this list
    await admin
      .from("grocery_list_items")
      .delete()
      .eq("grocery_list_id", list!.id)
      .eq("user_id", userId)
      .eq("source_type", "meal_plan");

    const rows = Array.from(grouped.values()).map((g) => ({
      user_id: userId,
      grocery_list_id: list!.id,
      meal_plan_id,
      source_type: "meal_plan",
      ingredient_name: g.item_name,
      quantity: g.quantity,
      unit: g.unit,
      estimated_price: g.estimated_price || null,
      instacart_search_term: g.instacart_search_term,
      needed_for_meals: g.needed_for_meals,
      already_have: false,
      selected_for_instacart: true,
      checked: false,
    }));

    if (rows.length) await admin.from("grocery_list_items").insert(rows);

    const estimatedTotal = rows.reduce((s, r) => s + Number(r.estimated_price ?? 0), 0);
    await admin
      .from("grocery_lists")
      .update({ estimated_total: estimatedTotal })
      .eq("id", list!.id);

    await admin
      .from("meal_plans")
      .update({ grocery_status: "generated" })
      .eq("id", meal_plan_id);

    return new Response(
      JSON.stringify({
        ok: true,
        grocery_list_id: list!.id,
        item_count: rows.length,
        estimated_total: estimatedTotal,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[generate-grocery-list-from-meal-plan] error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
