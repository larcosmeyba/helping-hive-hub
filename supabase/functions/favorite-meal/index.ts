// favorite-meal: toggle the favorited flag on a meal_plan_meals row.

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
    const { meal_id, favorited } = await req.json().catch(() => ({}));
    if (!meal_id) {
      return new Response(JSON.stringify({ error: "meal_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = adminClient();
    const { data: meal } = await admin
      .from("meal_plan_meals")
      .select("id, favorited")
      .eq("id", meal_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!meal) {
      return new Response(JSON.stringify({ error: "Meal not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const next = typeof favorited === "boolean" ? favorited : !meal.favorited;
    await admin.from("meal_plan_meals").update({ favorited: next }).eq("id", meal_id);

    return new Response(JSON.stringify({ ok: true, favorited: next }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[favorite-meal] error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
