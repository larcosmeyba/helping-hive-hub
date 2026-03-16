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

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
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

    const zipCode = profile.zip_code || "";
    const regionInfo = getRegionInfo(zipCode);

    const systemPrompt = `You are the Hive Budget Meal Engine — an expert meal planning AI for Help The Hive. Your job is to generate a complete, realistic weekly meal plan that stays within the user's grocery budget.

CRITICAL RULES:
- Every meal must be a real, cookable recipe with common grocery store ingredients
- The total grocery cost for ALL meals must stay at or below the weekly budget
- Prioritize using pantry items the user already has to reduce costs
- Adjust portion sizes for the household size
- Respect all allergies and dietary preferences strictly

REGIONAL PRICING RULES (VERY IMPORTANT):
- The user is in ZIP code region: ${zipCode || "unknown"} (${regionInfo.region})
- Regional cost-of-living multiplier: ${regionInfo.costMultiplier}x national average
- State sales tax on groceries: ${regionInfo.groceryTaxRate}%
- Use these REAL 2026 US grocery price benchmarks (national average), then multiply by the regional cost multiplier:
  * Eggs (dozen): $4.50  * Milk (gallon): $4.20  * Bread (loaf): $3.80
  * Chicken breast (lb): $4.50  * Ground beef (lb): $5.80  * Rice (2lb bag): $3.50
  * Pasta (1lb box): $1.80  * Canned beans (15oz): $1.20  * Bananas (lb): $0.65
  * Potatoes (5lb bag): $4.50  * Onions (3lb bag): $3.50  * Frozen veggies (16oz): $2.50
  * Cheese block (8oz): $3.80  * Butter (1lb): $5.00  * Cooking oil (48oz): $5.50
  * Flour (5lb): $4.00  * Sugar (4lb): $3.50  * Canned tomatoes (28oz): $2.00
- For preferred stores, apply these approximate price adjustments:
  * Aldi/Lidl: 0.80x (20% below average)
  * Walmart: 0.90x (10% below average)
  * Kroger/Safeway/Albertsons: 1.0x (average)
  * Publix/HEB: 1.05x (5% above average)
  * Whole Foods/Trader Joe's: 1.25x (25% above average)
  * Target: 0.95x (5% below average)

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
  "taxEstimate": 2.04,
  "regionLabel": "${regionInfo.region}",
  "costOfLivingMultiplier": ${regionInfo.costMultiplier}
}`;

    const userPrompt = `Generate a weekly meal plan (Monday–Sunday, 3 meals per day: breakfast, lunch, dinner) for this household:

- Weekly grocery budget: $${budget}
- Household size: ${householdSize} people
- Allergies: ${allergies}
- Dietary preferences: ${dietPrefs}
- Cooking time preference: ${cookTimePref} (quick = under 30 min, medium = 30-60 min, any = no limit)
- Preferred stores: ${stores}
- ZIP code: ${zipCode || "unknown"} (${regionInfo.region}, cost multiplier: ${regionInfo.costMultiplier}x)
- Items already in pantry: ${pantryList || "none specified"}

Requirements:
- Apply the ${regionInfo.costMultiplier}x regional cost multiplier to all ingredient prices
- Use pantry items first to maximize savings
- Keep total grocery cost at or below $${budget}
- Each meal needs calories, protein, carbs, fats, cost, cook time, ingredients, and instructions
- Generate the grocery list from ingredients NOT already in the pantry
- Provide store price comparisons for the user's preferred stores (apply store-specific multipliers)
- Apply ${regionInfo.groceryTaxRate}% grocery tax rate for this region`;
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

interface RegionInfo {
  region: string;
  costMultiplier: number;
  groceryTaxRate: number;
}

function getRegionInfo(zip: string): RegionInfo {
  if (!zip) return { region: "National Average", costMultiplier: 1.0, groceryTaxRate: 3.0 };

  const prefix = parseInt(zip.substring(0, 3), 10);
  if (isNaN(prefix)) return { region: "National Average", costMultiplier: 1.0, groceryTaxRate: 3.0 };

  // ZIP prefix ranges mapped to regions with cost-of-living multipliers and grocery tax
  // Based on USDA regional food cost data and state grocery tax rates
  if (prefix >= 100 && prefix <= 149) return { region: "New York Metro", costMultiplier: 1.35, groceryTaxRate: 4.0 };
  if (prefix >= 150 && prefix <= 196) return { region: "Pennsylvania", costMultiplier: 1.05, groceryTaxRate: 0.0 };
  if (prefix >= 197 && prefix <= 199) return { region: "Delaware", costMultiplier: 1.0, groceryTaxRate: 0.0 };
  if (prefix >= 200 && prefix <= 205) return { region: "Washington DC", costMultiplier: 1.30, groceryTaxRate: 0.0 };
  if (prefix >= 206 && prefix <= 246) return { region: "Virginia/Maryland", costMultiplier: 1.15, groceryTaxRate: 2.5 };
  if (prefix >= 247 && prefix <= 268) return { region: "West Virginia/North Carolina", costMultiplier: 0.90, groceryTaxRate: 2.0 };
  if (prefix >= 270 && prefix <= 289) return { region: "North Carolina", costMultiplier: 0.95, groceryTaxRate: 2.0 };
  if (prefix >= 290 && prefix <= 299) return { region: "South Carolina", costMultiplier: 0.90, groceryTaxRate: 0.0 };
  if (prefix >= 300 && prefix <= 319) return { region: "Georgia", costMultiplier: 0.95, groceryTaxRate: 0.0 };
  if (prefix >= 320 && prefix <= 349) return { region: "Florida", costMultiplier: 1.05, groceryTaxRate: 0.0 };
  if (prefix >= 350 && prefix <= 369) return { region: "Alabama", costMultiplier: 0.85, groceryTaxRate: 4.0 };
  if (prefix >= 370 && prefix <= 385) return { region: "Tennessee", costMultiplier: 0.90, groceryTaxRate: 4.0 };
  if (prefix >= 386 && prefix <= 397) return { region: "Mississippi", costMultiplier: 0.82, groceryTaxRate: 7.0 };
  if (prefix >= 400 && prefix <= 427) return { region: "Kentucky", costMultiplier: 0.88, groceryTaxRate: 0.0 };
  if (prefix >= 430 && prefix <= 458) return { region: "Ohio", costMultiplier: 0.92, groceryTaxRate: 0.0 };
  if (prefix >= 460 && prefix <= 479) return { region: "Indiana", costMultiplier: 0.90, groceryTaxRate: 0.0 };
  if (prefix >= 480 && prefix <= 499) return { region: "Michigan", costMultiplier: 0.95, groceryTaxRate: 0.0 };
  if (prefix >= 500 && prefix <= 528) return { region: "Iowa", costMultiplier: 0.88, groceryTaxRate: 0.0 };
  if (prefix >= 530 && prefix <= 549) return { region: "Wisconsin", costMultiplier: 0.95, groceryTaxRate: 0.0 };
  if (prefix >= 550 && prefix <= 567) return { region: "Minnesota", costMultiplier: 1.00, groceryTaxRate: 0.0 };
  if (prefix >= 570 && prefix <= 577) return { region: "South Dakota", costMultiplier: 0.88, groceryTaxRate: 4.5 };
  if (prefix >= 580 && prefix <= 588) return { region: "North Dakota", costMultiplier: 0.90, groceryTaxRate: 0.0 };
  if (prefix >= 590 && prefix <= 599) return { region: "Montana", costMultiplier: 0.95, groceryTaxRate: 0.0 };
  if (prefix >= 600 && prefix <= 629) return { region: "Illinois", costMultiplier: 1.00, groceryTaxRate: 1.0 };
  if (prefix >= 630 && prefix <= 658) return { region: "Missouri", costMultiplier: 0.88, groceryTaxRate: 1.225 };
  if (prefix >= 660 && prefix <= 679) return { region: "Kansas", costMultiplier: 0.88, groceryTaxRate: 6.5 };
  if (prefix >= 680 && prefix <= 693) return { region: "Nebraska", costMultiplier: 0.90, groceryTaxRate: 5.5 };
  if (prefix >= 700 && prefix <= 714) return { region: "Louisiana", costMultiplier: 0.90, groceryTaxRate: 0.0 };
  if (prefix >= 716 && prefix <= 729) return { region: "Arkansas", costMultiplier: 0.82, groceryTaxRate: 0.125 };
  if (prefix >= 730 && prefix <= 749) return { region: "Oklahoma", costMultiplier: 0.85, groceryTaxRate: 4.5 };
  if (prefix >= 750 && prefix <= 799) return { region: "Texas", costMultiplier: 0.95, groceryTaxRate: 0.0 };
  if (prefix >= 800 && prefix <= 816) return { region: "Colorado", costMultiplier: 1.05, groceryTaxRate: 0.0 };
  if (prefix >= 820 && prefix <= 831) return { region: "Wyoming", costMultiplier: 0.95, groceryTaxRate: 0.0 };
  if (prefix >= 832 && prefix <= 838) return { region: "Idaho", costMultiplier: 0.92, groceryTaxRate: 6.0 };
  if (prefix >= 840 && prefix <= 847) return { region: "Utah", costMultiplier: 0.95, groceryTaxRate: 3.0 };
  if (prefix >= 850 && prefix <= 865) return { region: "Arizona", costMultiplier: 1.00, groceryTaxRate: 0.0 };
  if (prefix >= 870 && prefix <= 884) return { region: "New Mexico", costMultiplier: 0.92, groceryTaxRate: 0.0 };
  if (prefix >= 889 && prefix <= 898) return { region: "Nevada", costMultiplier: 1.05, groceryTaxRate: 0.0 };
  if (prefix >= 900 && prefix <= 961) return { region: "California", costMultiplier: 1.30, groceryTaxRate: 0.0 };
  if (prefix >= 970 && prefix <= 979) return { region: "Oregon", costMultiplier: 1.10, groceryTaxRate: 0.0 };
  if (prefix >= 980 && prefix <= 994) return { region: "Washington State", costMultiplier: 1.15, groceryTaxRate: 0.0 };
  if (prefix >= 995 && prefix <= 999) return { region: "Alaska", costMultiplier: 1.40, groceryTaxRate: 0.0 };
  if (prefix >= 967 && prefix <= 968) return { region: "Hawaii", costMultiplier: 1.55, groceryTaxRate: 4.0 };
  if (prefix >= 10 && prefix <= 69) return { region: "Northeast US", costMultiplier: 1.15, groceryTaxRate: 0.0 };

  return { region: "National Average", costMultiplier: 1.0, groceryTaxRate: 3.0 };
}
