import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Get user from auth token
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get pantry items
    const { data: pantryItems } = await supabase
      .from("pantry_items")
      .select("item_name, quantity, category")
      .eq("user_id", user.id);

    const pantryList = (pantryItems || [])
      .map((i: any) => `${i.item_name} (${i.quantity})`)
      .join(", ");

    const budget = profile.weekly_budget || 75;
    const householdSize = profile.household_size || 2;
    const allergies = (profile.allergies || []).join(", ") || "none";
    const dietPrefs = (profile.dietary_preferences || []).join(", ") || "no restrictions";
    const cookTimePref = profile.cooking_time_preference || "medium";
    const stores = (profile.preferred_stores || []).join(", ") || "any store";

    const systemPrompt = `You are the Hive Budget Meal Engine — an expert meal planning AI for Help The Hive. Your job is to generate a complete, realistic weekly meal plan that stays within the user's grocery budget.

CRITICAL RULES:
- Every meal must be a real, cookable recipe with common grocery store ingredients
- The total grocery cost for ALL meals must stay at or below the weekly budget
- Prioritize using pantry items the user already has to reduce costs
- Adjust portion sizes for the household size
- Respect all allergies and dietary preferences strictly
- Estimate realistic US grocery prices for 2026

You must respond with ONLY valid JSON in exactly this structure, no markdown, no explanation:
{
  "weeklyPlan": [
    {
      "day": "Monday",
      "meals": [
        {
          "type": "breakfast",
          "name": "Meal Name",
          "calories": 350,
          "protein": 12,
          "carbs": 45,
          "fats": 10,
          "estimatedCost": 1.50,
          "cookTimeMinutes": 15,
          "ingredients": ["ingredient 1", "ingredient 2"],
          "instructions": ["Step 1", "Step 2"]
        }
      ]
    }
  ],
  "groceryList": [
    {
      "name": "Chicken Breast",
      "quantity": "2 lbs",
      "estimatedPrice": 6.50,
      "section": "Meat"
    }
  ],
  "storeRecommendations": [
    { "store": "Walmart", "estimatedTotal": 68.00 },
    { "store": "Aldi", "estimatedTotal": 62.00 }
  ],
  "totalEstimatedCost": 68.00,
  "pantrySavings": 12.00,
  "costPerMeal": 2.50,
  "taxEstimate": 2.04
}`;

    const userPrompt = `Generate a weekly meal plan (Monday–Sunday, 3 meals per day: breakfast, lunch, dinner) for this household:

- Weekly grocery budget: $${budget}
- Household size: ${householdSize} people
- Allergies: ${allergies}
- Dietary preferences: ${dietPrefs}
- Cooking time preference: ${cookTimePref} (quick = under 30 min, medium = 30-60 min, any = no limit)
- Preferred stores: ${stores}
- ZIP code region: ${profile.zip_code || "national average"}
- Items already in pantry: ${pantryList || "none specified"}

Requirements:
- Use pantry items first to maximize savings
- Keep total grocery cost at or below $${budget}
- Include realistic 2026 US grocery prices
- Each meal needs calories, protein, carbs, fats, cost, cook time, ingredients, and instructions
- Generate the grocery list from ingredients NOT already in the pantry
- Provide store price comparisons for the user's preferred stores
- Apply estimated state tax (use 3% if unknown)`;

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
        }),
      }
    );

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      throw new Error(`AI gateway error: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse JSON from AI response (strip markdown fences if present)
    let mealPlan;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      mealPlan = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse meal plan from AI");
    }

    // Save meal plan to database
    const weekStart = getNextMonday();

    // Delete existing plan for this week
    await supabase
      .from("meal_plan_items")
      .delete()
      .eq("user_id", user.id)
      .gte("created_at", weekStart);

    const { data: existingPlan } = await supabase
      .from("meal_plans")
      .select("id")
      .eq("user_id", user.id)
      .eq("week_start", weekStart)
      .single();

    let mealPlanId: string;

    if (existingPlan) {
      await supabase
        .from("meal_plans")
        .update({
          total_estimated_cost: mealPlan.totalEstimatedCost,
          status: "active",
        })
        .eq("id", existingPlan.id);
      mealPlanId = existingPlan.id;
    } else {
      const { data: newPlan, error: planError } = await supabase
        .from("meal_plans")
        .insert({
          user_id: user.id,
          week_start: weekStart,
          total_estimated_cost: mealPlan.totalEstimatedCost,
          status: "active",
        })
        .select("id")
        .single();

      if (planError) throw planError;
      mealPlanId = newPlan.id;
    }

    // Insert meal plan items
    const dayMap: Record<string, number> = {
      Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3,
      Friday: 4, Saturday: 5, Sunday: 6,
    };

    const mealItems = (mealPlan.weeklyPlan || []).flatMap((day: any) =>
      (day.meals || []).map((meal: any) => ({
        meal_plan_id: mealPlanId,
        user_id: user.id,
        day_of_week: dayMap[day.day] ?? 0,
        meal_type: meal.type || "dinner",
        meal_name: meal.name,
        calories: meal.calories,
        protein_g: meal.protein,
        carbs_g: meal.carbs,
        fats_g: meal.fats,
        estimated_cost: meal.estimatedCost,
      }))
    );

    if (mealItems.length > 0) {
      await supabase.from("meal_plan_items").insert(mealItems);
    }

    // Save grocery list
    await supabase
      .from("grocery_list_items")
      .delete()
      .eq("user_id", user.id);

    await supabase
      .from("grocery_lists")
      .delete()
      .eq("user_id", user.id)
      .eq("status", "active");

    const { data: groceryList, error: glError } = await supabase
      .from("grocery_lists")
      .insert({
        user_id: user.id,
        meal_plan_id: mealPlanId,
        store_name: mealPlan.storeRecommendations?.[0]?.store || "Any",
        estimated_total: mealPlan.totalEstimatedCost,
        tax_rate: 0.03,
        status: "active",
      })
      .select("id")
      .single();

    if (!glError && groceryList) {
      const groceryItems = (mealPlan.groceryList || []).map((item: any) => ({
        grocery_list_id: groceryList.id,
        user_id: user.id,
        ingredient_name: item.name,
        quantity: item.quantity,
        estimated_price: item.estimatedPrice,
        store_section: item.section,
        is_checked: false,
      }));

      if (groceryItems.length > 0) {
        await supabase.from("grocery_list_items").insert(groceryItems);
      }
    }

    return new Response(JSON.stringify(mealPlan), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Meal engine error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function getNextMonday(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 1 : day === 1 ? 0 : 8 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().split("T")[0];
}
