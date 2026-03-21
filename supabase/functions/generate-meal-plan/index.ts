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
    const cityInfo = getCityFromZip(zipCode);

    const systemPrompt = `You are the Hive Budget Meal Engine — an expert meal planning AI for Help The Hive. Your job is to generate a complete, realistic 6-day meal plan (Monday–Saturday) that stays within the user's grocery budget.

CRITICAL RULES:
- Generate exactly 6 days: Monday through Saturday. Do NOT include Sunday.
- Every meal must be a real, cookable recipe with common grocery store ingredients
- The total grocery cost for ALL meals must stay at or below the weekly budget
- Prioritize using pantry items the user already has to reduce costs
- Adjust portion sizes for the household size
- Respect all allergies and dietary preferences strictly
- BATCH COOKING: Design recipes that make enough servings to stretch across multiple meals. For example:
  * A big pot of soup/chili on Monday that also covers Wednesday lunch
  * Batch-cook rice or beans that get repurposed across 2-3 meals
  * Roast a whole chicken Monday dinner → use leftovers for Tuesday lunch wraps
  * This is how real budget-conscious families cook — maximize every dollar

LOCATION:
- ZIP code: ${zipCode || "unknown"}
- City: ${cityInfo.city}, ${cityInfo.state}
- Region: ${regionInfo.region}

REAL-WORLD PRICING RULES (ABSOLUTELY CRITICAL — THIS IS THE CORE REQUIREMENT):
You must use REAL, publicly available 2025-2026 US grocery prices. These prices must reflect what a shopper would ACTUALLY pay at each specific store in ${cityInfo.city}, ${cityInfo.state}.

Reference these REAL average prices (national baseline), then adjust for ${cityInfo.city} using the ${regionInfo.costMultiplier}x regional multiplier:
  * Eggs (dozen): $4.50  * Milk (gallon): $4.20  * Bread (loaf): $3.80
  * Chicken breast (lb): $4.50  * Ground beef 80/20 (lb): $5.80  * Rice (2lb bag): $3.50
  * Pasta (1lb box): $1.80  * Canned beans (15oz): $1.20  * Bananas (lb): $0.65
  * Potatoes (5lb bag): $4.50  * Onions (3lb bag): $3.50  * Frozen veggies (16oz): $2.50
  * Cheese block (8oz): $3.80  * Butter (1lb): $5.00  * Cooking oil (48oz): $5.50
  * Flour (5lb): $4.00  * Sugar (4lb): $3.50  * Canned tomatoes (28oz): $2.00

Store-specific price tiers (multiply baseline):
  * Aldi/Lidl: 0.80x  * Walmart Supercenter: 0.90x  * Target (Good & Gather): 0.95x
  * Kroger/Ralph's/Fred Meyer: 1.0x  * Safeway/Albertsons/Vons: 1.02x
  * Publix/HEB: 1.05x  * Whole Foods (365 brand): 1.25x  * Trader Joe's: 1.15x
  * Sprouts: 1.20x  * Food4Less/WinCo: 0.82x

State sales tax on groceries: ${regionInfo.groceryTaxRate}%

STORE-SPECIFIC BRAND MAPPING (USE EXACT REAL BRANDS):
For each grocery item, use the REAL store-brand name that is actually sold at each store:
- Walmart: "Great Value" (store brand), plus national brands like Tyson, Barilla, Birds Eye
- Aldi: "Simply Nature", "Friendly Farms", "Clancy's", "Specially Selected", "Happy Farms"
- Target: "Good & Gather", "Market Pantry", "Favorite Day"
- Kroger/Ralph's: "Kroger", "Private Selection", "Simple Truth"
- Safeway/Vons/Albertsons: "O Organics", "Signature Select", "Lucerne"
- Whole Foods: "365 by Whole Foods Market"
- Trader Joe's: "Trader Joe's" (all store brand)
- HEB: "Hill Country Fare", "HEB"
- Publix: "Publix" (store brand)
- Food4Less/WinCo: national brands at discount

PRODUCT DESCRIPTION RULES:
- The "productDescription" must be the EXACT product name as it appears on the store shelf
- Include size, count, and variety (e.g., "Great Value Large White Eggs, 12 ct" not just "eggs")
- The "brand" field must be the real brand name sold at the user's preferred stores
- "storePrices" must include per-item prices for at least 3-4 stores available in ${cityInfo.city}, ${cityInfo.state}
- "storeProducts" must include those same stores with exact per-store brand + exact per-store productDescription

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
      "name": "Eggs",
      "quantity": "1 dozen",
      "estimatedPrice": 4.50,
      "section": "Dairy & Eggs",
      "brand": "Great Value",
      "productDescription": "Great Value Large White Eggs, 12 ct",
      "storePrices": {
        "Walmart": 3.98,
        "Aldi": 3.49,
        "Target": 4.29,
        "Kroger": 4.49
      },
      "storeProducts": {
        "Walmart": {
          "brand": "Great Value",
          "productDescription": "Great Value Large White Eggs, 12 ct"
        },
        "Aldi": {
          "brand": "Friendly Farms",
          "productDescription": "Friendly Farms Grade A Large Eggs, 12 ct"
        },
        "Target": {
          "brand": "Good & Gather",
          "productDescription": "Good & Gather Cage Free Grade A Large Eggs, 12 ct"
        },
        "Kroger": {
          "brand": "Kroger",
          "productDescription": "Kroger Grade A Large White Eggs, 12 ct"
        }
      }
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
  "regionLabel": "${cityInfo.city}, ${cityInfo.state}",
  "costOfLivingMultiplier": ${regionInfo.costMultiplier}
}`;

    const userPrompt = `Generate a 6-day meal plan (Monday–Saturday, 3 meals per day: breakfast, lunch, dinner) for this household. Sunday is a rest/leftover day — do NOT include Sunday. Design recipes that yield enough servings to last across multiple meals where possible (e.g., a big pot of chili for 2 dinners, batch-cook rice for several lunches). This maximizes value on a tight budget:

- Weekly grocery budget: $${budget}
- Household size: ${householdSize} people
- Allergies: ${allergies}
- Dietary preferences: ${dietPrefs}
- Cooking time preference: ${cookTimePref} (quick = under 30 min, medium = 30-60 min, any = no limit)
- Preferred stores: ${stores}
- Location: ${cityInfo.city}, ${cityInfo.state} (ZIP: ${zipCode || "unknown"}, cost multiplier: ${regionInfo.costMultiplier}x)
- Items already in pantry: ${pantryList || "none specified"}

Requirements:
- Use REAL publicly known prices for ${cityInfo.city}, ${cityInfo.state} — prices a shopper would see TODAY at each store
- Apply the ${regionInfo.costMultiplier}x regional cost multiplier to national baseline prices
- Use pantry items first to maximize savings
- Keep total grocery cost at or below $${budget}
- Each meal needs calories, protein, carbs, fats, cost, cook time, ingredients, and full step-by-step instructions
- Generate the grocery list from ingredients NOT already in the pantry
- EVERY grocery item MUST have:
  1. A real brand name actually sold at the store (Great Value at Walmart, Simply Nature at Aldi, Good & Gather at Target, etc.)
  2. Full product description as it appears on the shelf (include size, count, variety)
  3. Per-store prices for at least 3-4 stores that exist in ${cityInfo.city}, ${cityInfo.state}
  4. A "storeProducts" object keyed by store name, containing the exact "brand" and exact shelf "productDescription" for each store
- Store recommendations must reflect the real total if shopping entirely at that one store
- Apply ${regionInfo.groceryTaxRate}% grocery tax rate for ${cityInfo.state}`;
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

    // Ensure every item has store-specific brand/product naming for each priced store
    mealPlan.groceryList = (mealPlan.groceryList || []).map((item: any) => {
      const storeNames = Object.keys(item.storePrices || {});
      const storeProducts: Record<string, { brand: string; productDescription: string }> = {
        ...(item.storeProducts || {}),
      };

      for (const storeName of storeNames) {
        const existing = storeProducts[storeName] || {};
        const brand = existing.brand || inferStoreBrand(storeName, item.brand);
        const productDescription =
          existing.productDescription ||
          buildStoreProductDescription(brand, item.name, item.quantity);

        storeProducts[storeName] = { brand, productDescription };
      }

      return {
        ...item,
        storeProducts,
      };
    });

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
          plan_data: mealPlan,
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
          plan_data: mealPlan,
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

interface CityInfo {
  city: string;
  state: string;
}

function getCityFromZip(zip: string): CityInfo {
  if (!zip) return { city: "Unknown", state: "US" };

  // Common ZIP code to city mapping for accurate location display
  const zipCityMap: Record<string, CityInfo> = {
    // California
    "900": { city: "Los Angeles", state: "CA" }, "901": { city: "Los Angeles", state: "CA" },
    "902": { city: "Inglewood", state: "CA" }, "903": { city: "Inglewood", state: "CA" },
    "904": { city: "Santa Monica", state: "CA" }, "905": { city: "Torrance", state: "CA" },
    "906": { city: "Whittier", state: "CA" }, "907": { city: "Long Beach", state: "CA" },
    "908": { city: "Long Beach", state: "CA" }, "910": { city: "Pasadena", state: "CA" },
    "911": { city: "Pasadena", state: "CA" }, "912": { city: "Glendale", state: "CA" },
    "913": { city: "Van Nuys", state: "CA" }, "914": { city: "Sherman Oaks", state: "CA" },
    "915": { city: "Burbank", state: "CA" }, "916": { city: "North Hollywood", state: "CA" },
    "917": { city: "Alhambra", state: "CA" }, "918": { city: "Alhambra", state: "CA" },
    "919": { city: "San Diego", state: "CA" }, "920": { city: "San Diego", state: "CA" },
    "921": { city: "San Diego", state: "CA" }, "922": { city: "Palm Springs", state: "CA" },
    "923": { city: "San Bernardino", state: "CA" }, "924": { city: "San Bernardino", state: "CA" },
    "925": { city: "Riverside", state: "CA" }, "926": { city: "Santa Ana", state: "CA" },
    "927": { city: "Santa Ana", state: "CA" }, "928": { city: "Anaheim", state: "CA" },
    "930": { city: "Oxnard", state: "CA" }, "931": { city: "Santa Barbara", state: "CA" },
    "932": { city: "Bakersfield", state: "CA" }, "933": { city: "Bakersfield", state: "CA" },
    "934": { city: "Santa Barbara", state: "CA" }, "935": { city: "Mojave", state: "CA" },
    "936": { city: "Fresno", state: "CA" }, "937": { city: "Fresno", state: "CA" },
    "939": { city: "Salinas", state: "CA" }, "940": { city: "San Francisco", state: "CA" },
    "941": { city: "San Francisco", state: "CA" }, "942": { city: "Sacramento", state: "CA" },
    "943": { city: "Palo Alto", state: "CA" }, "944": { city: "San Mateo", state: "CA" },
    "945": { city: "Oakland", state: "CA" }, "946": { city: "Oakland", state: "CA" },
    "947": { city: "Berkeley", state: "CA" }, "948": { city: "Richmond", state: "CA" },
    "949": { city: "San Rafael", state: "CA" }, "950": { city: "San Jose", state: "CA" },
    "951": { city: "San Jose", state: "CA" }, "952": { city: "Stockton", state: "CA" },
    "953": { city: "Stockton", state: "CA" }, "954": { city: "Santa Rosa", state: "CA" },
    "955": { city: "Eureka", state: "CA" }, "956": { city: "Sacramento", state: "CA" },
    "957": { city: "Sacramento", state: "CA" }, "958": { city: "Sacramento", state: "CA" },
    "959": { city: "Marysville", state: "CA" }, "960": { city: "Redding", state: "CA" },
    "961": { city: "Reno", state: "NV" },
    // New York
    "100": { city: "New York", state: "NY" }, "101": { city: "New York", state: "NY" },
    "102": { city: "New York", state: "NY" }, "103": { city: "Staten Island", state: "NY" },
    "104": { city: "Bronx", state: "NY" }, "110": { city: "Queens", state: "NY" },
    "111": { city: "Brooklyn", state: "NY" }, "112": { city: "Brooklyn", state: "NY" },
    "113": { city: "Flushing", state: "NY" }, "114": { city: "Jamaica", state: "NY" },
    "115": { city: "Western Nassau", state: "NY" }, "116": { city: "Far Rockaway", state: "NY" },
    "117": { city: "Hicksville", state: "NY" }, "118": { city: "Hicksville", state: "NY" },
    "119": { city: "Riverhead", state: "NY" },
    // Texas
    "750": { city: "Dallas", state: "TX" }, "751": { city: "Dallas", state: "TX" },
    "752": { city: "Dallas", state: "TX" }, "753": { city: "Dallas", state: "TX" },
    "760": { city: "Fort Worth", state: "TX" }, "761": { city: "Fort Worth", state: "TX" },
    "770": { city: "Houston", state: "TX" }, "771": { city: "Houston", state: "TX" },
    "772": { city: "Houston", state: "TX" }, "773": { city: "Huntsville", state: "TX" },
    "780": { city: "San Antonio", state: "TX" }, "781": { city: "San Antonio", state: "TX" },
    "782": { city: "San Antonio", state: "TX" }, "786": { city: "Austin", state: "TX" },
    "787": { city: "Austin", state: "TX" }, "799": { city: "El Paso", state: "TX" },
    // Florida
    "320": { city: "Jacksonville", state: "FL" }, "321": { city: "Daytona Beach", state: "FL" },
    "322": { city: "Jacksonville", state: "FL" }, "323": { city: "Tallahassee", state: "FL" },
    "324": { city: "Panama City", state: "FL" }, "325": { city: "Pensacola", state: "FL" },
    "326": { city: "Gainesville", state: "FL" }, "327": { city: "Orlando", state: "FL" },
    "328": { city: "Orlando", state: "FL" }, "329": { city: "Melbourne", state: "FL" },
    "330": { city: "Miami", state: "FL" }, "331": { city: "Miami", state: "FL" },
    "332": { city: "Miami", state: "FL" }, "333": { city: "Fort Lauderdale", state: "FL" },
    "334": { city: "West Palm Beach", state: "FL" }, "335": { city: "Tampa", state: "FL" },
    "336": { city: "Tampa", state: "FL" }, "337": { city: "St. Petersburg", state: "FL" },
    "338": { city: "Lakeland", state: "FL" }, "339": { city: "Fort Myers", state: "FL" },
    "340": { city: "St. Thomas", state: "VI" }, "341": { city: "Naples", state: "FL" },
    "342": { city: "Sarasota", state: "FL" },
    // Illinois
    "600": { city: "Chicago", state: "IL" }, "601": { city: "Chicago", state: "IL" },
    "602": { city: "Evanston", state: "IL" }, "603": { city: "Oak Park", state: "IL" },
    "604": { city: "Aurora", state: "IL" }, "605": { city: "Joliet", state: "IL" },
    "606": { city: "Chicago", state: "IL" },
    // Georgia
    "300": { city: "Atlanta", state: "GA" }, "301": { city: "Atlanta", state: "GA" },
    "302": { city: "Atlanta", state: "GA" }, "303": { city: "Atlanta", state: "GA" },
    "310": { city: "Augusta", state: "GA" }, "312": { city: "Macon", state: "GA" },
    "314": { city: "Savannah", state: "GA" },
    // Other major cities
    "200": { city: "Washington", state: "DC" }, "201": { city: "Washington", state: "DC" },
    "206": { city: "Waldorf", state: "MD" }, "208": { city: "Laurel", state: "MD" },
    "210": { city: "Baltimore", state: "MD" }, "211": { city: "Baltimore", state: "MD" },
    "150": { city: "Pittsburgh", state: "PA" }, "151": { city: "Pittsburgh", state: "PA" },
    "190": { city: "Philadelphia", state: "PA" }, "191": { city: "Philadelphia", state: "PA" },
    "480": { city: "Detroit", state: "MI" }, "481": { city: "Detroit", state: "MI" },
    "550": { city: "Minneapolis", state: "MN" }, "551": { city: "St. Paul", state: "MN" },
    "430": { city: "Columbus", state: "OH" }, "441": { city: "Cleveland", state: "OH" },
    "460": { city: "Indianapolis", state: "IN" }, "461": { city: "Indianapolis", state: "IN" },
    "530": { city: "Milwaukee", state: "WI" }, "531": { city: "Milwaukee", state: "WI" },
    "630": { city: "St. Louis", state: "MO" }, "631": { city: "St. Louis", state: "MO" },
    "640": { city: "Kansas City", state: "MO" },
    "660": { city: "Kansas City", state: "KS" },
    "680": { city: "Omaha", state: "NE" },
    "800": { city: "Denver", state: "CO" }, "801": { city: "Denver", state: "CO" }, "802": { city: "Denver", state: "CO" },
    "840": { city: "Salt Lake City", state: "UT" }, "841": { city: "Salt Lake City", state: "UT" },
    "850": { city: "Phoenix", state: "AZ" }, "851": { city: "Phoenix", state: "AZ" }, "852": { city: "Phoenix", state: "AZ" },
    "853": { city: "Phoenix", state: "AZ" }, "855": { city: "Globe", state: "AZ" },
    "856": { city: "Tucson", state: "AZ" }, "857": { city: "Tucson", state: "AZ" },
    "889": { city: "Las Vegas", state: "NV" }, "890": { city: "Las Vegas", state: "NV" }, "891": { city: "Las Vegas", state: "NV" },
    "970": { city: "Portland", state: "OR" }, "971": { city: "Portland", state: "OR" }, "972": { city: "Portland", state: "OR" },
    "980": { city: "Seattle", state: "WA" }, "981": { city: "Seattle", state: "WA" },
    "982": { city: "Everett", state: "WA" }, "983": { city: "Tacoma", state: "WA" },
    "984": { city: "Tacoma", state: "WA" },
    "995": { city: "Anchorage", state: "AK" }, "996": { city: "Anchorage", state: "AK" },
    "967": { city: "Honolulu", state: "HI" }, "968": { city: "Honolulu", state: "HI" },
    // North Carolina
    "270": { city: "Greensboro", state: "NC" }, "271": { city: "Winston-Salem", state: "NC" },
    "272": { city: "Greensboro", state: "NC" }, "273": { city: "Greensboro", state: "NC" },
    "274": { city: "Greensboro", state: "NC" }, "275": { city: "Raleigh", state: "NC" },
    "276": { city: "Raleigh", state: "NC" }, "277": { city: "Charlotte", state: "NC" },
    "278": { city: "Rocky Mount", state: "NC" }, "279": { city: "Rocky Mount", state: "NC" },
    "280": { city: "Charlotte", state: "NC" }, "281": { city: "Charlotte", state: "NC" },
    "282": { city: "Charlotte", state: "NC" }, "283": { city: "Fayetteville", state: "NC" },
    "284": { city: "Wilmington", state: "NC" }, "285": { city: "Kinston", state: "NC" },
    "286": { city: "Hickory", state: "NC" }, "287": { city: "Asheville", state: "NC" },
    "288": { city: "Asheville", state: "NC" }, "289": { city: "Asheville", state: "NC" },
    // Tennessee
    "370": { city: "Nashville", state: "TN" }, "371": { city: "Nashville", state: "TN" },
    "372": { city: "Nashville", state: "TN" }, "373": { city: "Chattanooga", state: "TN" },
    "374": { city: "Chattanooga", state: "TN" }, "376": { city: "Johnson City", state: "TN" },
    "377": { city: "Knoxville", state: "TN" }, "378": { city: "Knoxville", state: "TN" },
    "379": { city: "Knoxville", state: "TN" }, "380": { city: "Memphis", state: "TN" },
    "381": { city: "Memphis", state: "TN" },
  };

  const prefix3 = zip.substring(0, 3);
  if (zipCityMap[prefix3]) return zipCityMap[prefix3];

  // Fallback: use region name
  const regionInfo = getRegionInfo(zip);
  return { city: regionInfo.region, state: "" };
}
