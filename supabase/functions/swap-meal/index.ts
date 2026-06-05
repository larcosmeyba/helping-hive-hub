// swap-meal: replace one selected meal in the active plan.
// Mock for now; structure ready for OpenAI.

import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { adminClient, buildMealPlanContext, getUserIdFromAuth } from "../_shared/mealPlanContext.ts";

const MOCK_BY_TYPE: Record<string, Array<Record<string, unknown>>> = {
  breakfast: [
    { name: "Greek Yogurt Parfait", calories: 320, protein: 18, cookTime: 5, estimatedCost: 2.5,
      ingredients: ["Greek yogurt", "Granola", "Berries", "Honey"],
      instructions: ["Layer yogurt", "Add granola + berries", "Drizzle honey"] },
    { name: "Veggie Scramble", calories: 340, protein: 22, cookTime: 10, estimatedCost: 2.1,
      ingredients: ["Eggs", "Spinach", "Bell pepper", "Cheddar"],
      instructions: ["Sauté veg", "Add eggs", "Top with cheese"] },
  ],
  lunch: [
    { name: "Chickpea Salad Bowl", calories: 420, protein: 18, cookTime: 10, estimatedCost: 2.8,
      ingredients: ["Chickpeas", "Cucumber", "Tomatoes", "Feta"],
      instructions: ["Combine", "Toss with vinaigrette"] },
    { name: "Turkey & Avocado Wrap", calories: 450, protein: 28, cookTime: 10, estimatedCost: 3.5,
      ingredients: ["Tortilla", "Turkey", "Avocado", "Lettuce"],
      instructions: ["Layer", "Roll tightly"] },
  ],
  dinner: [
    { name: "Sheet Pan Sausage & Veggies", calories: 510, protein: 24, cookTime: 30, estimatedCost: 3.4,
      ingredients: ["Sausage", "Potatoes", "Peppers", "Olive oil"],
      instructions: ["Toss with oil", "Roast 25-30 min at 425°F"] },
    { name: "White Bean & Kale Soup", calories: 380, protein: 18, cookTime: 25, estimatedCost: 2.2,
      ingredients: ["White beans", "Kale", "Onion", "Broth"],
      instructions: ["Sauté", "Simmer 15 min", "Stir in kale"] },
  ],
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

    // Build context (will be passed to OpenAI later)
    const context = await buildMealPlanContext(admin, userId);

    let resolvedType = meal_type;
    if (meal_id) {
      const { data: existing } = await admin
        .from("meal_plan_meals")
        .select("meal_type, meal_plan_id, day_id")
        .eq("id", meal_id)
        .eq("user_id", userId)
        .maybeSingle();
      if (!existing) {
        return new Response(JSON.stringify({ error: "Meal not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      resolvedType = existing.meal_type;
    }

    const pool = MOCK_BY_TYPE[(resolvedType ?? "dinner").toLowerCase()] ?? MOCK_BY_TYPE.dinner;
    const choice = pool[Math.floor(Math.random() * pool.length)];

    const replacement = {
      meal_type: resolvedType,
      meal_name: choice.name,
      calories_estimate: choice.calories,
      protein_estimate: choice.protein,
      estimated_cost: choice.estimatedCost,
      cook_time_minutes: choice.cookTime,
      instructions: choice.instructions,
      ingredients: choice.ingredients,
    };

    // If meal_id provided, persist replacement in meal_plan_meals
    if (meal_id) {
      await admin
        .from("meal_plan_meals")
        .update({
          meal_name: replacement.meal_name,
          calories_estimate: replacement.calories_estimate,
          protein_estimate: replacement.protein_estimate,
          estimated_cost: replacement.estimated_cost,
          cook_time_minutes: replacement.cook_time_minutes,
          instructions: replacement.instructions,
        })
        .eq("id", meal_id)
        .eq("user_id", userId);

      // Replace ingredient rows
      await admin.from("meal_ingredients").delete().eq("meal_id", meal_id);
      const ingRows = (choice.ingredients as string[]).map((name) => ({
        meal_id, user_id: userId, item_name: name,
        source_location: "grocery_needed", already_have: false,
      }));
      if (ingRows.length) await admin.from("meal_ingredients").insert(ingRows);
    }

    return new Response(
      JSON.stringify({ replacement, context_keys: Object.keys(context) }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("[swap-meal] error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
