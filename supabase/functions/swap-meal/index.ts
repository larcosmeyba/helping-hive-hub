// swap-meal: replace one selected meal in the active plan using OpenAI (gpt-5.4-mini).

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, buildMealPlanContext, getUserIdFromAuth } from "../_shared/mealPlanContext.ts";
import { callOpenAI } from "../_shared/openaiClient.ts";

import { captureEdgeError } from "../_shared/sentry.ts";
const SYSTEM_PROMPT = `You are Help The Hive's meal-swap assistant.
Replace ONE meal in the user's current week plan with a new, budget-friendly recipe
that fits their household size, dietary preferences, allergies, pantry inventory,
and the meal type being swapped (breakfast/lunch/dinner).

STRICT RULES:
- Output ONLY via the return_meal tool. No prose.
- Prices are ESTIMATES ONLY. Final pricing confirmed at Instacart checkout.
- Prefer ingredients the user already has, especially expiring items.
- Honor allergies and dietary preferences absolutely.
- Keep the swap roughly similar in cost and calories to the original meal.`;

const TOOL = {
  type: "function" as const,
  function: {
    name: "return_meal",
    description: "Return a single replacement meal.",
    parameters: {
      type: "object",
      required: ["meal_name", "ingredients", "instructions"],
      properties: {
        meal_name: { type: "string" },
        description: { type: "string" },
        calories_estimate: { type: "number" },
        protein_estimate: { type: "number" },
        estimated_cost: { type: "number" },
        estimated_cost_per_serving: { type: "number" },
        prep_time_minutes: { type: "number" },
        cook_time_minutes: { type: "number" },
        difficulty: { type: "string" },
        food_waste_reason: { type: "string" },
        instructions: { type: "array", items: { type: "string" } },
        ingredients: {
          type: "array",
          items: {
            type: "object",
            required: ["item_name"],
            properties: {
              item_name: { type: "string" },
              quantity: { type: "string" },
              unit: { type: "string" },
              already_have: { type: "boolean" },
              source_location: {
                type: "string",
                enum: ["pantry", "fridge", "freezer", "grocery_needed"],
              },
              estimated_price: { type: "number" },
            },
          },
        },
      },
    },
  },
};

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
    const { meal_id, meal_type } = body as { meal_id?: string; meal_type?: string };

    if (!meal_id && !meal_type) {
      return new Response(JSON.stringify({ error: "meal_id or meal_type required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = adminClient();
    const context = await buildMealPlanContext(admin, userId);

    let resolvedType = meal_type;
    let originalMeal: any = null;
    if (meal_id) {
      const { data: existing } = await admin
        .from("meal_plan_meals")
        .select("*")
        .eq("id", meal_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!existing) {
        return new Response(JSON.stringify({ error: "Meal not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      resolvedType = existing.meal_type;
      originalMeal = existing;
    }

    const userPrompt = JSON.stringify({
      meal_type_being_swapped: resolvedType,
      original_meal: originalMeal
        ? { meal_name: originalMeal.meal_name, estimated_cost: originalMeal.estimated_cost, calories_estimate: originalMeal.calories_estimate }
        : null,
      context,
    });

    let replacement: any;
    try {
      const ai = await callOpenAI({
        model: "gpt-5.4-mini",
        system: SYSTEM_PROMPT,
        user: userPrompt,
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "return_meal" } },
        log: { admin, user_id: userId, request_type: "meal_swap" },
      });
      if (!ai.tool_arguments) {
        return new Response(JSON.stringify({ error: "No replacement returned" }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      replacement = { ...ai.tool_arguments, meal_type: resolvedType };
    } catch (err: any) {
      const status = err?.status === 429 || err?.status === 402 ? err.status : 500;
      return new Response(JSON.stringify({ error: err?.message ?? "AI request failed" }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (meal_id) {
      await admin
        .from("meal_plan_meals")
        .update({
          meal_name: replacement.meal_name,
          description: replacement.description ?? null,
          calories_estimate: replacement.calories_estimate ?? null,
          protein_estimate: replacement.protein_estimate ?? null,
          estimated_cost: replacement.estimated_cost ?? null,
          estimated_cost_per_serving: replacement.estimated_cost_per_serving ?? null,
          prep_time_minutes: replacement.prep_time_minutes ?? null,
          cook_time_minutes: replacement.cook_time_minutes ?? null,
          difficulty: replacement.difficulty ?? null,
          food_waste_reason: replacement.food_waste_reason ?? null,
          instructions: replacement.instructions ?? [],
        })
        .eq("id", meal_id)
        .eq("user_id", userId);

      await admin.from("meal_ingredients").delete().eq("meal_id", meal_id);
      const ingRows = (replacement.ingredients ?? []).map((ing: any) => ({
        meal_id,
        user_id: userId,
        item_name: ing.item_name,
        quantity: ing.quantity ?? null,
        unit: ing.unit ?? null,
        source_location: ing.source_location ?? (ing.already_have ? "pantry" : "grocery_needed"),
        already_have: !!ing.already_have,
        estimated_price: ing.estimated_price ?? null,
      }));
      if (ingRows.length) await admin.from("meal_ingredients").insert(ingRows);
    }

    return new Response(
      JSON.stringify({ replacement, pricing_disclaimer: "Estimated pricing for planning only. Final pricing and availability are confirmed at Instacart checkout." }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    try { captureEdgeError(err, { fn: "swap-meal" }); } catch { /* noop */ }
    console.error("[swap-meal] error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
