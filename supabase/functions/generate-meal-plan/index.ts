// Generate weekly meal plan via Lovable AI Gateway.
// Builds a meal_plan_context from the user's profile + pantry/fridge and asks
// the model for a structured weekly plan + grocery list, then persists it.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

interface Overrides {
  budget?: number;
  store?: string;
  dietary_preferences?: string[];
  household_size?: number;
  meal_count?: number;
}

const SYSTEM_PROMPT = `You are Help The Hive's meal planning AI.
You build budget-friendly, family-sized weekly meal plans for any household.

STRICT RULES:
- Output ONLY valid JSON matching the requested schema. No markdown, no prose.
- Prices are ESTIMATES ONLY. Never claim exact pricing. Final pricing is confirmed at Instacart checkout.
- Prioritize ingredients the user already has (pantry/fridge), especially ones marked "use_soon" or "expiring_today".
- NEVER recommend expired ingredients. If listed expired, warn: "This item may no longer be safe to use. Please check before consuming."
- Respect allergies and dietary preferences absolutely.
- Do NOT give medical advice. Do NOT guarantee SNAP eligibility.
- Stay within the weekly grocery budget. Lean on pantry items to do so.
- Every grocery item must include an instacart_search_term suitable for Instacart's catalog search.
- Use the user's preferred store if Instacart supports it.`;

const RESPONSE_SCHEMA = {
  type: "object",
  required: ["meal_plan", "grocery_list", "why_this_plan"],
  properties: {
    meal_plan: {
      type: "object",
      required: [
        "week_start_date",
        "estimated_total_cost",
        "estimated_daily_average",
        "estimated_cost_per_serving",
        "total_meals",
        "savings_estimate",
        "why_this_plan",
        "days",
      ],
      properties: {
        week_start_date: { type: "string" },
        estimated_total_cost: { type: "number" },
        estimated_daily_average: { type: "number" },
        estimated_cost_per_serving: { type: "number" },
        total_meals: { type: "integer" },
        savings_estimate: { type: "number" },
        why_this_plan: { type: "string" },
        days: {
          type: "array",
          items: {
            type: "object",
            required: ["day_name", "breakfast", "lunch", "dinner"],
            properties: {
              day_name: { type: "string" },
              breakfast: { $ref: "#/$defs/meal" },
              lunch: { $ref: "#/$defs/meal" },
              dinner: { $ref: "#/$defs/meal" },
            },
          },
        },
      },
    },
    grocery_list: {
      type: "array",
      items: {
        type: "object",
        required: ["item_name", "quantity", "unit", "category", "estimated_price", "already_have", "instacart_search_term"],
        properties: {
          item_name: { type: "string" },
          quantity: { type: "string" },
          unit: { type: "string" },
          category: { type: "string" },
          estimated_price: { type: "number" },
          already_have: { type: "boolean" },
          needed_for_meals: { type: "array", items: { type: "string" } },
          instacart_search_term: { type: "string" },
        },
      },
    },
    why_this_plan: {
      type: "object",
      properties: {
        fits_budget: { type: "boolean" },
        uses_pantry_items: { type: "boolean" },
        reduces_food_waste: { type: "boolean" },
        matches_dietary_preferences: { type: "boolean" },
        fits_household_size: { type: "boolean" },
        available_at_store: { type: "boolean" },
      },
    },
  },
  $defs: {
    meal: {
      type: "object",
      required: ["meal_name", "meal_type", "description", "estimated_cost", "ingredients_used_from_pantry", "ingredients_to_buy", "instructions"],
      properties: {
        meal_name: { type: "string" },
        meal_type: { type: "string" },
        description: { type: "string" },
        ingredients_used_from_pantry: {
          type: "array",
          items: {
            type: "object",
            properties: {
              item_name: { type: "string" },
              quantity: { type: "string" },
              unit: { type: "string" },
            },
          },
        },
        ingredients_to_buy: {
          type: "array",
          items: {
            type: "object",
            properties: {
              item_name: { type: "string" },
              quantity: { type: "string" },
              unit: { type: "string" },
              estimated_price: { type: "number" },
              instacart_search_term: { type: "string" },
            },
          },
        },
        estimated_cost: { type: "number" },
        estimated_cost_per_serving: { type: "number" },
        calories_estimate: { type: "integer" },
        protein_estimate: { type: "number" },
        prep_time_minutes: { type: "integer" },
        cook_time_minutes: { type: "integer" },
        difficulty: { type: "string" },
        instructions: { type: "array", items: { type: "string" } },
        food_waste_reason: { type: "string" },
        instacart_ready_ingredients: { type: "array", items: { type: "string" } },
      },
    },
  },
} as const;

function freshness(item: any): string {
  if (!item.expiration_date) return item.is_low_stock ? "low_stock" : "good";
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(item.expiration_date); exp.setHours(0, 0, 0, 0);
  const days = Math.floor((exp.getTime() - today.getTime()) / 86400000);
  if (days < 0) return "expired";
  if (days === 0) return "expiring_today";
  if (days <= 3) return "use_soon";
  if (item.is_low_stock) return "low_stock";
  return "good";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const overrides: Overrides = body.overrides ?? body ?? {};

    // Fetch profile, pantry, home store, latest grocery list in parallel
    const [profileRes, pantryRes, homeStoreRes, groceryRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("pantry_items").select("*").eq("user_id", userId),
      supabase.from("instacart_home_store").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("grocery_lists").select("estimated_total, status").eq("user_id", userId).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);

    const profile = profileRes.data ?? {};
    const pantryItems = (pantryRes.data ?? []).map((p: any) => ({
      item_name: p.item_name,
      quantity: p.quantity,
      unit: p.unit,
      category: p.category,
      purchase_date: p.purchase_date,
      expiration_date: p.expiration_date,
      freshness_status: p.freshness_status ?? freshness(p),
      location: p.location ?? "pantry",
    }));

    const fridgeItems = pantryItems.filter((i) => i.location === "fridge");
    const pantryOnly = pantryItems.filter((i) => i.location !== "fridge");
    const expiringSoon = pantryItems.filter((i) => ["expiring_today", "use_soon"].includes(i.freshness_status));
    const lowStock = pantryItems.filter((i) => i.freshness_status === "low_stock" || (i as any).is_low_stock);
    const expired = pantryItems.filter((i) => i.freshness_status === "expired");

    const homeStore = homeStoreRes.data;

    const mealPlanContext = {
      user_id: userId,
      household_size: overrides.household_size ?? profile.household_size ?? 1,
      children_under_5: profile.children_under_5 ?? 0,
      children_5_to_12: profile.children_5_to_12 ?? 0,
      teenagers: profile.teenagers ?? 0,
      seniors_65_plus: profile.seniors_65_plus ?? 0,
      weekly_grocery_budget: overrides.budget ?? profile.weekly_budget ?? 75,
      zip_code: profile.zip_code ?? null,
      preferred_store: overrides.store ?? homeStore?.retailer_name ?? profile.home_store ?? null,
      preferred_store_id: homeStore?.retailer_key ?? profile.preferred_store_id ?? null,
      dietary_preferences: overrides.dietary_preferences ?? profile.dietary_preferences ?? [],
      allergies: profile.allergies ?? [],
      cooking_confidence: profile.cooking_confidence ?? profile.cooking_time_preference ?? "medium",
      pantry_items: pantryOnly,
      fridge_items: fridgeItems,
      expiring_soon_items: expiringSoon,
      low_stock_items: lowStock,
      expired_items: expired,
      meals_already_cooked_this_week: [],
      disliked_foods: [],
      preferred_meal_count: overrides.meal_count ?? 18,
      pricing_estimate_mode: "instacart_estimates",
      instacart_supported_store: !!homeStore,
      week_start_date: new Date().toISOString().slice(0, 10),
    };

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    let parsed: any;
    try {
      const { callOpenAI } = await import("../_shared/openaiClient.ts");
      const ai = await callOpenAI({
        model: "gpt-5.4-mini",
        system: SYSTEM_PROMPT,
        user: `Build this week's plan from this meal_plan_context:\n\n${JSON.stringify(mealPlanContext)}`,
        tools: [{
          type: "function",
          function: {
            name: "return_meal_plan",
            description: "Return the structured weekly meal plan and grocery list.",
            parameters: RESPONSE_SCHEMA,
          },
        }],
        tool_choice: { type: "function", function: { name: "return_meal_plan" } },
        log: { admin, user_id: userId, request_type: "meal_plan_generation" },
      });
      if (!ai.tool_arguments) {
        return new Response(JSON.stringify({ error: "Malformed AI response", raw: ai.raw }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      parsed = ai.tool_arguments;
    } catch (e: any) {
      const status = e?.status === 429 || e?.status === 402 ? e.status : 500;
      return new Response(JSON.stringify({ error: e?.message ?? "AI error" }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const mealPlan = parsed.meal_plan;
    const groceryList = parsed.grocery_list ?? [];
    const whyThisPlan = parsed.why_this_plan ?? {};

    // admin client already created above for AI logging.


    const { data: planRow, error: planErr } = await admin.from("meal_plans").insert({
      user_id: userId,
      week_start: mealPlan.week_start_date,
      week_start_date: mealPlan.week_start_date,
      total_estimated_cost: mealPlan.estimated_total_cost,
      estimated_daily_average: mealPlan.estimated_daily_average,
      estimated_cost_per_serving: mealPlan.estimated_cost_per_serving,
      total_meals: mealPlan.total_meals,
      savings_estimate: mealPlan.savings_estimate,
      why_this_plan: whyThisPlan,
      plan_data: parsed,
      status: "active",
    }).select().single();
    if (planErr) throw planErr;

    const planId = planRow.id;

    // Insert days + meals + ingredients
    for (let i = 0; i < (mealPlan.days ?? []).length; i++) {
      const day = mealPlan.days[i];
      const { data: dayRow, error: dayErr } = await admin.from("meal_plan_days").insert({
        meal_plan_id: planId,
        user_id: userId,
        day_name: day.day_name,
        sort_order: i,
      }).select().single();
      if (dayErr) throw dayErr;

      for (const mealType of ["breakfast", "lunch", "dinner"] as const) {
        const meal = day[mealType];
        if (!meal) continue;
        const { data: mealRow, error: mealErr } = await admin.from("meal_plan_meals").insert({
          meal_plan_id: planId,
          day_id: dayRow.id,
          user_id: userId,
          meal_type: mealType,
          meal_name: meal.meal_name,
          description: meal.description,
          estimated_cost: meal.estimated_cost,
          estimated_cost_per_serving: meal.estimated_cost_per_serving,
          calories_estimate: meal.calories_estimate,
          protein_estimate: meal.protein_estimate,
          prep_time_minutes: meal.prep_time_minutes,
          cook_time_minutes: meal.cook_time_minutes,
          difficulty: meal.difficulty,
          instructions: meal.instructions ?? [],
          food_waste_reason: meal.food_waste_reason,
        }).select().single();
        if (mealErr) throw mealErr;

        const ingredientRows = [
          ...(meal.ingredients_used_from_pantry ?? []).map((ing: any) => ({
            meal_id: mealRow.id,
            user_id: userId,
            item_name: ing.item_name,
            quantity: ing.quantity,
            unit: ing.unit,
            source: "pantry",
            already_have: true,
          })),
          ...(meal.ingredients_to_buy ?? []).map((ing: any) => ({
            meal_id: mealRow.id,
            user_id: userId,
            item_name: ing.item_name,
            quantity: ing.quantity,
            unit: ing.unit,
            source: "purchase",
            already_have: false,
            estimated_price: ing.estimated_price,
            instacart_search_term: ing.instacart_search_term,
          })),
        ];
        if (ingredientRows.length) {
          const { error: ingErr } = await admin.from("meal_ingredients").insert(ingredientRows);
          if (ingErr) throw ingErr;
        }
      }
    }

    // Persist grocery list (create a parent grocery_lists row + items linked to plan)
    const { data: glRow, error: glErr } = await admin.from("grocery_lists").insert({
      user_id: userId,
      meal_plan_id: planId,
      store_name: mealPlanContext.preferred_store,
      estimated_total: groceryList.reduce((s: number, i: any) => s + (Number(i.estimated_price) || 0), 0),
      status: "active",
    }).select().single();
    if (glErr) throw glErr;

    if (groceryList.length) {
      const items = groceryList.map((g: any) => ({
        user_id: userId,
        grocery_list_id: glRow.id,
        meal_plan_id: planId,
        ingredient_name: g.item_name,
        quantity: g.quantity ?? "",
        unit: g.unit,
        category: g.category,
        store_section: g.category,
        estimated_price: g.estimated_price,
        already_have: g.already_have ?? false,
        instacart_search_term: g.instacart_search_term,
        needed_for_meals: g.needed_for_meals ?? [],
      }));
      const { error: itemsErr } = await admin.from("grocery_list_items").insert(items);
      if (itemsErr) throw itemsErr;
    }

    return new Response(
      JSON.stringify({
        meal_plan_id: planId,
        grocery_list_id: glRow.id,
        meal_plan: parsed.meal_plan,
        grocery_list: parsed.grocery_list,
        why_this_plan: parsed.why_this_plan,
        pricing_disclaimer: "Estimated pricing for planning only. Final pricing and availability are confirmed at Instacart checkout.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("generate-meal-plan error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
