import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Internal fallback price estimates per ingredient keyword
const FALLBACK_PRICES: Record<string, number> = {
  chicken: 4.50, beef: 5.80, pork: 4.00, turkey: 4.50, salmon: 8.00, fish: 6.00, shrimp: 7.00, tofu: 2.50,
  bacon: 5.50, sausage: 4.00, "ground beef": 5.80, "ground turkey": 4.50,
  egg: 4.50, eggs: 4.50, milk: 4.20, cheese: 3.80, butter: 5.00, yogurt: 3.50, cream: 3.00, "sour cream": 2.50,
  rice: 3.50, pasta: 1.80, bread: 3.80, tortilla: 3.00, flour: 4.00, oat: 3.50, oats: 3.50, cereal: 4.00, noodle: 2.00,
  tomato: 1.50, onion: 1.20, potato: 4.50, garlic: 0.75, pepper: 1.00, broccoli: 2.00, carrot: 1.50, spinach: 2.50,
  lettuce: 2.00, cucumber: 1.00, corn: 1.50, mushroom: 2.50, avocado: 1.50, zucchini: 1.50, cabbage: 2.00,
  bean: 1.20, beans: 1.20, "black bean": 1.20, chickpea: 1.50, lentil: 1.50,
  banana: 0.65, apple: 1.50, orange: 1.00, lemon: 0.50, lime: 0.50, berry: 3.50, strawberry: 3.50,
  oil: 5.50, "olive oil": 5.50, vinegar: 3.00, "soy sauce": 2.50, ketchup: 3.00, mustard: 2.50, honey: 5.00,
  sugar: 3.50, salt: 1.50, flour: 4.00, "baking powder": 2.50, "baking soda": 1.50,
  spice: 2.00, seasoning: 2.00, cumin: 2.50, paprika: 2.50, oregano: 2.50, cinnamon: 3.00,
  broth: 2.50, "tomato sauce": 1.50, "tomato paste": 1.00, salsa: 3.00,
  "peanut butter": 3.50, jam: 3.50, jelly: 3.00,
  juice: 3.50, coffee: 7.00, tea: 4.00,
};

function estimateFallbackPrice(ingredientName: string): number {
  const lower = ingredientName.toLowerCase();
  for (const [keyword, price] of Object.entries(FALLBACK_PRICES)) {
    if (lower.includes(keyword)) return price;
  }
  return 2.50; // generic fallback
}

function inferSection(ingredientName: string): string {
  const lower = ingredientName.toLowerCase();
  if (/chicken|beef|pork|turkey|salmon|fish|shrimp|bacon|sausage|tofu/.test(lower)) return "Meat & Protein";
  if (/egg|milk|cheese|butter|yogurt|cream|sour cream/.test(lower)) return "Dairy & Eggs";
  if (/rice|pasta|bread|tortilla|flour|oat|cereal|noodle/.test(lower)) return "Grains & Bread";
  if (/banana|apple|orange|lemon|lime|berry|strawberry|grape|fruit/.test(lower)) return "Fruits";
  if (/tomato|onion|potato|garlic|pepper|broccoli|carrot|spinach|lettuce|cucumber|corn|mushroom|avocado|zucchini|cabbage|celery|bean|pea/.test(lower)) return "Vegetables";
  if (/oil|vinegar|soy sauce|ketchup|mustard|honey|mayo|sauce|salsa/.test(lower)) return "Oils & Condiments";
  if (/sugar|salt|spice|seasoning|cumin|paprika|oregano|cinnamon|baking/.test(lower)) return "Baking & Spices";
  if (/broth|soup|canned|tomato sauce|tomato paste|bean/.test(lower)) return "Canned & Pantry";
  if (/juice|coffee|tea/.test(lower)) return "Beverages";
  return "Other";
}

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

    const { data: pantryItems } = await supabase
      .from("pantry_items")
      .select("item_name, quantity, category")
      .eq("user_id", user.id);

    const pantryList = (pantryItems || [])
      .map((i: any) => `${i.item_name} (${i.quantity})`)
      .join(", ");

    const pantrySet = new Set(
      (pantryItems || []).map((i: any) => i.item_name.toLowerCase().replace(/[^a-z ]/g, "").trim())
    );

    const budget = profile.weekly_budget || 75;
    const householdSize = profile.household_size || 2;
    const allergies = (profile.allergies || []).join(", ") || "none";
    const dietPrefs = (profile.dietary_preferences || []).join(", ") || "no restrictions";
    const cookTimePref = profile.cooking_time_preference || "medium";
    const stores = (profile.preferred_stores || []).join(", ") || "any store";
    const foodPrefs = (profile.food_preferences || []).join(", ") || "no preference";

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
- BATCH COOKING: Design recipes that share ingredients to minimize the grocery list size and cost.

LOCATION:
- ZIP code: ${zipCode || "unknown"}
- City: ${cityInfo.city}, ${cityInfo.state}
- Region: ${regionInfo.region}

REAL-WORLD PRICING RULES:
Use REAL 2025-2026 US grocery prices adjusted for ${cityInfo.city} using the ${regionInfo.costMultiplier}x regional multiplier.

Reference baseline prices:
  * Eggs (dozen): $4.50  * Milk (gallon): $4.20  * Bread (loaf): $3.80
  * Chicken breast (lb): $4.50  * Ground beef 80/20 (lb): $5.80  * Rice (2lb bag): $3.50
  * Pasta (1lb box): $1.80  * Canned beans (15oz): $1.20  * Bananas (lb): $0.65
  * Potatoes (5lb bag): $4.50  * Onions (3lb bag): $3.50  * Frozen veggies (16oz): $2.50
  * Cheese block (8oz): $3.80  * Butter (1lb): $5.00  * Cooking oil (48oz): $5.50

Store-specific price tiers:
  * Aldi/Lidl: 0.80x  * Walmart: 0.90x  * Target: 0.95x  * Kroger: 1.0x
  * Safeway/Albertsons: 1.02x  * Whole Foods: 1.25x  * Trader Joe's: 1.15x

State grocery tax: ${regionInfo.groceryTaxRate}%

STORE-SPECIFIC BRAND MAPPING (USE EXACT REAL BRANDS):
- Walmart: "Great Value"  - Aldi: "Simply Nature", "Friendly Farms"
- Target: "Good & Gather"  - Kroger: "Kroger", "Simple Truth"
- Safeway: "Signature Select"  - Whole Foods: "365 by Whole Foods Market"
- Trader Joe's: "Trader Joe's"

CRITICAL PIPELINE — YOU MUST FOLLOW THIS EXACT ORDER:
1. Generate 18 meals (6 days × 3 meals), each with a complete ingredients list
2. Collect EVERY ingredient from ALL 18 meals into one master list
3. Combine duplicates (e.g., "chicken breast" from 3 meals → total quantity)
4. Remove any items the user already has in their pantry
5. Price each remaining item per-store
6. Sum all item prices to get store totals
7. The groceryList MUST contain EVERY ingredient from step 2 (minus pantry items)

You must respond with ONLY valid JSON in exactly this structure:
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
          "ingredients": ["1 lb chicken breast", "2 cups rice", "1 tbsp olive oil"],
          "instructions": ["Step 1", "Step 2"]
        }
      ]
    }
  ],
  "groceryList": [
    {
      "name": "Chicken Breast",
      "quantity": "3 lbs",
      "estimatedPrice": 13.50,
      "section": "Meat & Protein",
      "brand": "Great Value",
      "productDescription": "Great Value Boneless Skinless Chicken Breast, 3 lb",
      "storePrices": { "Walmart": 12.15, "Kroger": 13.50, "Aldi": 10.80 },
      "storeProducts": {
        "Walmart": { "brand": "Great Value", "productDescription": "Great Value Boneless Skinless Chicken Breast, 3 lb" },
        "Kroger": { "brand": "Kroger", "productDescription": "Kroger Boneless Skinless Chicken Breast, 3 lb" }
      }
    }
  ],
  "storeRecommendations": [
    { "store": "Walmart", "estimatedTotal": 68.00 }
  ],
  "totalEstimatedCost": 68.00,
  "pantrySavings": 12.00,
  "costPerMeal": 2.50,
  "taxEstimate": 2.04,
  "regionLabel": "${cityInfo.city}, ${cityInfo.state}",
  "costOfLivingMultiplier": ${regionInfo.costMultiplier}
}`;

    const userPrompt = `Generate a 6-day meal plan (Monday–Saturday, 3 meals per day: breakfast, lunch, dinner) for this household:

- Weekly grocery budget: $${budget}
- Household size: ${householdSize} people
- Allergies: ${allergies}
- Dietary preferences: ${dietPrefs}
- Cuisine preferences: ${foodPrefs}
- Cooking time: ${cookTimePref}
- Preferred stores: ${stores}
- Location: ${cityInfo.city}, ${cityInfo.state} (ZIP: ${zipCode || "unknown"}, cost multiplier: ${regionInfo.costMultiplier}x)
- Items in pantry: ${pantryList || "none"}

CRITICAL REQUIREMENTS:
1. Every meal's "ingredients" must list SPECIFIC items with quantities (e.g., "1 lb chicken breast", not just "chicken")
2. The "groceryList" must contain EVERY SINGLE ingredient from ALL 18 meals that is NOT in the pantry
3. Aggregate quantities: if chicken breast appears in 3 meals (1lb + 1lb + 0.5lb), the grocery list entry should say "2.5 lbs"
4. "totalEstimatedCost" MUST equal the EXACT sum of all groceryList items' "estimatedPrice" values
5. Each store's "estimatedTotal" MUST equal the sum of that store's prices across ALL grocery items
6. Every grocery item needs storePrices for at least 3 stores available in ${cityInfo.city}
7. Include storeProducts with exact brand + product description per store
8. Apply ${regionInfo.groceryTaxRate}% grocery tax for ${cityInfo.state}`;

    let aiResponse;
    try {
      aiResponse = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
          }),
        }
      );
    } catch (fetchErr) {
      console.error("AI fetch error:", fetchErr);
      return new Response(
        JSON.stringify({ error: "Failed to connect to AI service. Please try again." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      return new Response(
        JSON.stringify({ error: "AI service error. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(
        JSON.stringify({ error: "Empty AI response. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let mealPlan;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      mealPlan = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to parse meal plan. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ===== POST-AI VALIDATION: Enforce 1:1 ingredient→grocery mapping =====

    // Step 1: Extract ALL ingredients from ALL meals
    const ingredientAggregator: Record<string, { totalMentions: number; rawTexts: string[] }> = {};
    for (const day of mealPlan.weeklyPlan || []) {
      for (const meal of day.meals || []) {
        for (const ing of meal.ingredients || []) {
          // Normalize: strip quantities to get base ingredient name
          const normalized = ing.toLowerCase()
            .replace(/^\d+[\s\/]*\d*\s*(lb|lbs|oz|cup|cups|tbsp|tsp|can|cans|clove|cloves|bunch|bunches|head|heads|pkg|package|bag|bottle|jar|gallon|quart|pint|dozen|slice|slices|piece|pieces|stick|sticks|box|boxes)s?\s*/i, "")
            .replace(/^\d+[\.\d]*\s*/g, "")
            .replace(/[^a-z ]/g, "")
            .trim();
          
          if (!normalized || normalized.length < 2) continue;
          
          // Skip pantry items
          const inPantry = [...pantrySet].some(p => normalized.includes(p) || p.includes(normalized));
          if (inPantry) continue;

          if (!ingredientAggregator[normalized]) {
            ingredientAggregator[normalized] = { totalMentions: 0, rawTexts: [] };
          }
          ingredientAggregator[normalized].totalMentions++;
          ingredientAggregator[normalized].rawTexts.push(ing);
        }
      }
    }

    // Step 2: Build a map of existing grocery list items
    const existingGroceryMap = new Map<string, any>();
    for (const item of (mealPlan.groceryList || [])) {
      const key = item.name.toLowerCase().replace(/[^a-z ]/g, "").trim();
      existingGroceryMap.set(key, item);
    }

    // Step 3: Find missing ingredients and add them
    const missingIngredients: string[] = [];
    for (const [normalized, info] of Object.entries(ingredientAggregator)) {
      const found = [...existingGroceryMap.keys()].some(
        gn => normalized.includes(gn) || gn.includes(normalized)
      );
      if (!found) {
        missingIngredients.push(normalized);
        // Add missing item with fallback pricing
        const price = estimateFallbackPrice(normalized) * regionInfo.costMultiplier;
        const roundedPrice = Math.round(price * 100) / 100;
        const displayName = normalized.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
        
        const newItem: any = {
          name: displayName,
          quantity: info.rawTexts[0] || "1",
          estimatedPrice: roundedPrice,
          section: inferSection(normalized),
          brand: inferStoreBrand(stores.split(",")[0]?.trim() || ""),
          productDescription: displayName,
          storePrices: {},
          storeProducts: {},
        };

        // Add store prices for user's preferred stores
        const userStores = (profile.preferred_stores || []);
        for (const storeName of userStores.slice(0, 4)) {
          const multiplier = getStoreMultiplier(storeName);
          newItem.storePrices[storeName] = Math.round(price * multiplier * 100) / 100;
          newItem.storeProducts[storeName] = {
            brand: inferStoreBrand(storeName),
            productDescription: `${inferStoreBrand(storeName)} ${displayName}`,
          };
        }

        mealPlan.groceryList.push(newItem);
      }
    }

    if (missingIngredients.length > 0) {
      console.warn("Added missing ingredients to grocery list:", missingIngredients);
    }

    // Step 4: Ensure store-specific brand/product naming
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

      return { ...item, storeProducts };
    });

    // Step 5: Recalculate ALL totals from actual grocery items (single source of truth)
    const recalcTotal = (mealPlan.groceryList || []).reduce(
      (sum: number, item: any) => sum + (item.estimatedPrice || 0), 0
    );
    mealPlan.totalEstimatedCost = Math.round(recalcTotal * 100) / 100;

    // Recalculate store recommendation totals
    if (mealPlan.storeRecommendations) {
      for (const rec of mealPlan.storeRecommendations) {
        const storeTotal = (mealPlan.groceryList || []).reduce((sum: number, item: any) => {
          const sp = item.storePrices?.[rec.store];
          return sum + (sp ?? item.estimatedPrice ?? 0);
        }, 0);
        rec.estimatedTotal = Math.round(storeTotal * 100) / 100;
      }
    }

    // Recalculate costPerMeal
    const totalMealCount = (mealPlan.weeklyPlan || []).reduce(
      (n: number, d: any) => n + (d.meals?.length || 0), 0
    );
    if (totalMealCount > 0) {
      mealPlan.costPerMeal = Math.round((recalcTotal / totalMealCount) * 100) / 100;
    }

    // Recalculate tax
    mealPlan.taxEstimate = Math.round(recalcTotal * (regionInfo.groceryTaxRate / 100) * 100) / 100;

    // Save meal plan to database
    const weekStart = getNextMonday();

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
        tax_rate: regionInfo.groceryTaxRate / 100,
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

function getStoreMultiplier(storeName: string): number {
  const lower = storeName.toLowerCase();
  if (lower.includes("aldi") || lower.includes("lidl")) return 0.80;
  if (lower.includes("walmart")) return 0.90;
  if (lower.includes("target")) return 0.95;
  if (lower.includes("kroger") || lower.includes("ralph") || lower.includes("fred meyer")) return 1.0;
  if (lower.includes("safeway") || lower.includes("albertsons") || lower.includes("vons")) return 1.02;
  if (lower.includes("whole foods")) return 1.25;
  if (lower.includes("trader joe")) return 1.15;
  if (lower.includes("sprouts")) return 1.20;
  if (lower.includes("food4less") || lower.includes("winco")) return 0.82;
  if (lower.includes("publix") || lower.includes("heb")) return 1.05;
  if (lower.includes("costco") || lower.includes("sam")) return 0.85;
  return 1.0;
}

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

interface CityInfo { city: string; state: string; }

function getCityFromZip(zip: string): CityInfo {
  if (!zip) return { city: "Unknown", state: "US" };
  const zipCityMap: Record<string, CityInfo> = {
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
    "100": { city: "New York", state: "NY" }, "101": { city: "New York", state: "NY" },
    "102": { city: "New York", state: "NY" }, "103": { city: "Staten Island", state: "NY" },
    "104": { city: "Bronx", state: "NY" }, "110": { city: "Queens", state: "NY" },
    "111": { city: "Brooklyn", state: "NY" }, "112": { city: "Brooklyn", state: "NY" },
    "113": { city: "Flushing", state: "NY" }, "114": { city: "Jamaica", state: "NY" },
    "750": { city: "Dallas", state: "TX" }, "751": { city: "Dallas", state: "TX" },
    "752": { city: "Dallas", state: "TX" }, "753": { city: "Dallas", state: "TX" },
    "760": { city: "Fort Worth", state: "TX" }, "761": { city: "Fort Worth", state: "TX" },
    "770": { city: "Houston", state: "TX" }, "771": { city: "Houston", state: "TX" },
    "772": { city: "Houston", state: "TX" }, "780": { city: "San Antonio", state: "TX" },
    "781": { city: "San Antonio", state: "TX" }, "786": { city: "Austin", state: "TX" },
    "787": { city: "Austin", state: "TX" }, "799": { city: "El Paso", state: "TX" },
    "320": { city: "Jacksonville", state: "FL" }, "321": { city: "Daytona Beach", state: "FL" },
    "327": { city: "Orlando", state: "FL" }, "328": { city: "Orlando", state: "FL" },
    "330": { city: "Miami", state: "FL" }, "331": { city: "Miami", state: "FL" },
    "332": { city: "Miami", state: "FL" }, "333": { city: "Fort Lauderdale", state: "FL" },
    "335": { city: "Tampa", state: "FL" }, "336": { city: "Tampa", state: "FL" },
    "600": { city: "Chicago", state: "IL" }, "601": { city: "Chicago", state: "IL" },
    "606": { city: "Chicago", state: "IL" },
    "300": { city: "Atlanta", state: "GA" }, "301": { city: "Atlanta", state: "GA" },
    "302": { city: "Atlanta", state: "GA" }, "303": { city: "Atlanta", state: "GA" },
    "200": { city: "Washington", state: "DC" }, "201": { city: "Washington", state: "DC" },
    "210": { city: "Baltimore", state: "MD" }, "211": { city: "Baltimore", state: "MD" },
    "150": { city: "Pittsburgh", state: "PA" }, "151": { city: "Pittsburgh", state: "PA" },
    "190": { city: "Philadelphia", state: "PA" }, "191": { city: "Philadelphia", state: "PA" },
    "480": { city: "Detroit", state: "MI" }, "481": { city: "Detroit", state: "MI" },
    "550": { city: "Minneapolis", state: "MN" }, "551": { city: "St. Paul", state: "MN" },
    "430": { city: "Columbus", state: "OH" }, "441": { city: "Cleveland", state: "OH" },
    "460": { city: "Indianapolis", state: "IN" }, "461": { city: "Indianapolis", state: "IN" },
    "800": { city: "Denver", state: "CO" }, "801": { city: "Denver", state: "CO" },
    "850": { city: "Phoenix", state: "AZ" }, "851": { city: "Phoenix", state: "AZ" },
    "889": { city: "Las Vegas", state: "NV" }, "890": { city: "Las Vegas", state: "NV" },
    "970": { city: "Portland", state: "OR" }, "971": { city: "Portland", state: "OR" },
    "980": { city: "Seattle", state: "WA" }, "981": { city: "Seattle", state: "WA" },
    "995": { city: "Anchorage", state: "AK" }, "967": { city: "Honolulu", state: "HI" },
    "270": { city: "Greensboro", state: "NC" }, "275": { city: "Raleigh", state: "NC" },
    "280": { city: "Charlotte", state: "NC" }, "281": { city: "Charlotte", state: "NC" },
    "370": { city: "Nashville", state: "TN" }, "371": { city: "Nashville", state: "TN" },
    "380": { city: "Memphis", state: "TN" }, "381": { city: "Memphis", state: "TN" },
  };
  const prefix3 = zip.substring(0, 3);
  if (zipCityMap[prefix3]) return zipCityMap[prefix3];
  const regionInfo = getRegionInfo(zip);
  return { city: regionInfo.region, state: "" };
}

function inferStoreBrand(storeName: string, fallbackBrand?: string): string {
  const lower = storeName.toLowerCase();
  if (lower.includes("walmart")) return "Great Value";
  if (lower.includes("aldi")) return "Simply Nature";
  if (lower.includes("target")) return "Good & Gather";
  if (lower.includes("kroger") || lower.includes("ralph")) return "Kroger";
  if (lower.includes("safeway") || lower.includes("vons") || lower.includes("albertsons")) return "Signature Select";
  if (lower.includes("whole foods")) return "365 by Whole Foods Market";
  if (lower.includes("trader joe")) return "Trader Joe's";
  if (lower.includes("heb") || lower.includes("h-e-b")) return "HEB";
  if (lower.includes("publix")) return "Publix";
  return fallbackBrand || storeName;
}

function buildStoreProductDescription(brand: string, itemName: string, quantity: string): string {
  return `${brand} ${itemName}, ${quantity}`.trim();
}
