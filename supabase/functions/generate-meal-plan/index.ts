import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  sugar: 3.50, salt: 1.50, "baking powder": 2.50, "baking soda": 1.50,
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
  return 2.50;
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
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = authHeader.replace("Bearer ", "");

    const anonClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    const { data: { user }, error: userError } = await anonClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ===== PARALLEL DB READS — fetch everything at once =====
    const [profileRes, pantryRes, canonicalRes, aliasRes, cachedPriceRes, ingredientsRes, nationalPricesRes, regionalPricesRes, taxRulesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("pantry_items").select("item_name, quantity, category").eq("user_id", user.id),
      supabase.from("canonical_products").select("canonical_product_id, canonical_name, default_price, default_unit, category"),
      supabase.from("canonical_product_aliases").select("alias_text, canonical_product_id"),
      supabase.from("store_product_prices")
        .select("retailer_product_id, base_price, sale_price, freshness_status, retailer_id, last_verified_at")
        .gte("last_verified_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from("ingredients").select("ingredient_id, ingredient_name, category"),
      supabase.from("national_food_prices").select("ingredient_id, national_avg_price, unit"),
      supabase.from("regional_food_prices").select("ingredient_id, region, average_price, unit"),
      supabase.from("state_tax_rules").select("state, grocery_tax_rate"),
    ]);

    const profile = profileRes.data;
    if (profileRes.error || !profile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pantryItems = pantryRes.data || [];
    const pantryList = pantryItems.map((i: any) => `${i.item_name} (${i.quantity})`).join(", ");
    const pantrySet = new Set(pantryItems.map((i: any) => i.item_name.toLowerCase().replace(/[^a-z ]/g, "").trim()));

    // Build canonical + alias maps
    const canonicalMap = new Map<string, { id: string; price: number; unit: string; category: string }>();
    for (const cp of (canonicalRes.data || [])) {
      if (cp.default_price) {
        canonicalMap.set(cp.canonical_name.toLowerCase(), {
          id: cp.canonical_product_id, price: Number(cp.default_price), unit: cp.default_unit || '', category: cp.category || '',
        });
      }
    }
    const aliasMap = new Map<string, string>();
    for (const a of (aliasRes.data || [])) {
      aliasMap.set(a.alias_text.toLowerCase(), a.canonical_product_id);
    }
    const cachedPriceMap = new Map<string, { price: number; salePrice: number | null; fresh: boolean }>();
    for (const cp of (cachedPriceRes.data || [])) {
      cachedPriceMap.set(cp.retailer_product_id, {
        price: Number(cp.base_price), salePrice: cp.sale_price ? Number(cp.sale_price) : null,
        fresh: cp.freshness_status === 'verified' || cp.freshness_status === 'recent',
      });
    }

    // === 3-Layer pricing maps (Layer 2 regional + Layer 3 national) ===
    const ingredientByName = new Map<string, string>(); // lower(name) -> ingredient_id
    for (const ing of (ingredientsRes.data || [])) {
      ingredientByName.set(ing.ingredient_name.toLowerCase(), ing.ingredient_id);
    }
    const nationalByIngredient = new Map<string, { price: number; unit: string }>();
    for (const np of (nationalPricesRes.data || [])) {
      nationalByIngredient.set(np.ingredient_id, { price: Number(np.national_avg_price), unit: np.unit });
    }
    const regionalByKey = new Map<string, { price: number; unit: string }>(); // `${ingredient_id}|${state}`
    for (const rp of (regionalPricesRes.data || [])) {
      regionalByKey.set(`${rp.ingredient_id}|${rp.region}`, { price: Number(rp.average_price), unit: rp.unit });
    }
    const taxByState = new Map<string, number>();
    for (const t of (taxRulesRes.data || [])) {
      taxByState.set(t.state, Number(t.grocery_tax_rate));
    }

    const budget = profile.weekly_budget || 75;
    const householdSize = profile.household_size || 2;
    const allergies = (profile.allergies || []).join(", ") || "none";
    const dietPrefs = (profile.dietary_preferences || []).join(", ") || "no restrictions";
    const cookTimePref = profile.cooking_time_preference || "medium";
    const stores = (profile.preferred_stores || []).join(", ") || "any store";
    const foodPrefs = (profile.food_preferences || []).join(", ") || "no preference";
    const zipCode = profile.zip_code || "";
    const userState = (profile.state || "").toUpperCase().slice(0, 2);
    const regionInfo = getRegionInfo(zipCode);
    const cityInfo = getCityFromZip(zipCode);

    // === BLS regional cost-of-living multiplier (overrides ZIP heuristic when available) ===
    let blsMultiplier = 1.0;
    let blsRegionLabel: string | null = null;
    try {
      const blsRes = await fetch(`${supabaseUrl}/functions/v1/bls-price-index`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")!}` },
        body: JSON.stringify({ state: userState }),
        signal: AbortSignal.timeout(7000),
      });
      if (blsRes.ok) {
        const blsData = await blsRes.json();
        if (blsData?.multiplier && !blsData.fallback) {
          blsMultiplier = Number(blsData.multiplier);
          blsRegionLabel = blsData.region;
        }
      }
    } catch (err) {
      console.warn("BLS fetch failed, using flat ZIP heuristic:", err);
    }
    const effectiveMultiplier = blsMultiplier !== 1.0 ? blsMultiplier : regionInfo.costMultiplier;
    // Real state grocery tax rate (decimal, e.g. 0.04 = 4%) — prefers DB, falls back to legacy region info
    const stateGroceryTaxRate = taxByState.has(userState)
      ? taxByState.get(userState)!
      : (regionInfo.groceryTaxRate || 0) / 100;

    // Compact prompt — significantly fewer tokens for faster AI response
    const systemPrompt = `You are the Hive Budget Meal Engine. Generate a 6-day meal plan (Mon–Sat, 3 meals/day) within the user's grocery budget.

RULES: Real cookable recipes, common grocery ingredients, respect allergies/diet strictly, batch-cook to share ingredients, adjust for household size.

LOCATION: ${cityInfo.city}, ${cityInfo.state} (ZIP ${zipCode || "?"}), region multiplier ${regionInfo.costMultiplier}x, tax ${regionInfo.groceryTaxRate}%.

PRICING: Use real 2025-2026 US grocery prices. Store tiers: Aldi 0.80x, Walmart 0.90x, Target 0.95x, Kroger 1.0x, Safeway 1.02x, Whole Foods 1.25x, Trader Joe's 1.15x.
Store brands: Walmart→Great Value, Aldi→Simply Nature, Target→Good & Gather, Kroger→Kroger/Simple Truth, Safeway→Signature Select, Whole Foods→365, Trader Joe's→Trader Joe's.

PIPELINE: 1) Generate 18 meals with ingredients+quantities 2) Aggregate all ingredients 3) Remove pantry items 4) Price per-store 5) Sum totals

Respond with ONLY valid JSON:
{"weeklyPlan":[{"day":"Monday","meals":[{"type":"breakfast","name":"...","calories":350,"protein":12,"carbs":45,"fats":10,"estimatedCost":1.50,"cookTimeMinutes":15,"ingredients":["1 lb chicken breast"],"instructions":["Step 1"]}]}],"groceryList":[{"name":"Chicken Breast","quantity":"3 lbs","estimatedPrice":13.50,"section":"Meat & Protein","brand":"Great Value","productDescription":"Great Value Boneless Skinless Chicken Breast, 3 lb","storePrices":{"Walmart":12.15,"Kroger":13.50},"storeProducts":{"Walmart":{"brand":"Great Value","productDescription":"..."}}}],"storeRecommendations":[{"store":"Walmart","estimatedTotal":68.00}],"totalEstimatedCost":68.00,"pantrySavings":12.00,"costPerMeal":2.50,"taxEstimate":2.04,"regionLabel":"${cityInfo.city}, ${cityInfo.state}","costOfLivingMultiplier":${regionInfo.costMultiplier}}`;

    const userPrompt = `Budget: $${budget} | Household: ${householdSize} | Allergies: ${allergies} | Diet: ${dietPrefs} | Cuisine: ${foodPrefs} | Cook time: ${cookTimePref} | Stores: ${stores} | Location: ${cityInfo.city}, ${cityInfo.state} (${regionInfo.costMultiplier}x) | Pantry: ${pantryList || "none"}

Generate 6-day plan (Mon-Sat, 18 meals). Every ingredient must appear in groceryList (minus pantry). Aggregate quantities. Include storePrices for 3+ stores. totalEstimatedCost = sum of all estimatedPrice values.`;

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
            model: "google/gemini-2.5-flash-lite",
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
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (aiResponse.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please try again later." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: "AI service error. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ error: "Empty AI response. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let mealPlan;
    try {
      const jsonStr = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      mealPlan = JSON.parse(jsonStr);
    } catch {
      console.error("Failed to parse AI response:", content.substring(0, 500));
      return new Response(JSON.stringify({ error: "Failed to parse meal plan. Please try again." }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ===== POST-AI VALIDATION =====
    const ingredientAggregator: Record<string, { totalMentions: number; rawTexts: string[] }> = {};
    for (const day of mealPlan.weeklyPlan || []) {
      for (const meal of day.meals || []) {
        for (const ing of meal.ingredients || []) {
          const normalized = ing.toLowerCase()
            .replace(/^\d+[\s\/]*\d*\s*(lb|lbs|oz|cup|cups|tbsp|tsp|can|cans|clove|cloves|bunch|bunches|head|heads|pkg|package|bag|bottle|jar|gallon|quart|pint|dozen|slice|slices|piece|pieces|stick|sticks|box|boxes)s?\s*/i, "")
            .replace(/^\d+[\.\d]*\s*/g, "").replace(/[^a-z ]/g, "").trim();
          if (!normalized || normalized.length < 2) continue;
          const inPantry = [...pantrySet].some(p => normalized.includes(p) || p.includes(normalized));
          if (inPantry) continue;
          if (!ingredientAggregator[normalized]) ingredientAggregator[normalized] = { totalMentions: 0, rawTexts: [] };
          ingredientAggregator[normalized].totalMentions++;
          ingredientAggregator[normalized].rawTexts.push(ing);
        }
      }
    }

    const existingGroceryMap = new Map<string, any>();
    for (const item of (mealPlan.groceryList || [])) {
      existingGroceryMap.set(item.name.toLowerCase().replace(/[^a-z ]/g, "").trim(), item);
    }

    for (const [normalized, info] of Object.entries(ingredientAggregator)) {
      const found = [...existingGroceryMap.keys()].some(gn => normalized.includes(gn) || gn.includes(normalized));
      if (!found) {
        const price = estimateFallbackPrice(normalized) * effectiveMultiplier;
          const roundedPrice = Math.round(price * 100) / 100;
          const displayName = normalized.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
          const newItem: any = {
            name: displayName, quantity: info.rawTexts[0] || "1", estimatedPrice: roundedPrice,
            section: inferSection(normalized), brand: inferStoreBrand(stores.split(",")[0]?.trim() || ""),
          productDescription: displayName, storePrices: {}, storeProducts: {},
        };
        for (const storeName of (profile.preferred_stores || []).slice(0, 4)) {
          const multiplier = getStoreMultiplier(storeName);
          newItem.storePrices[storeName] = Math.round(price * multiplier * 100) / 100;
          newItem.storeProducts[storeName] = { brand: inferStoreBrand(storeName), productDescription: `${inferStoreBrand(storeName)} ${displayName}` };
        }
        mealPlan.groceryList.push(newItem);
      }
    }

    // === Enrich pricing using 3-LAYER hierarchy ===
    // Layer 1 (retailer/Kroger live) — applied client-side via useKrogerPrices on the grocery page
    // Layer 2 (regional baseline) and Layer 3 (national baseline) — applied here, override AI estimates
    function findIngredientId(name: string): string | null {
      const lower = name.toLowerCase();
      if (ingredientByName.has(lower)) return ingredientByName.get(lower)!;
      // partial match: ingredient name contains query, or vice versa
      for (const [k, v] of ingredientByName.entries()) {
        if (lower.includes(k) || k.includes(lower)) return v;
      }
      return null;
    }

    mealPlan.groceryList = (mealPlan.groceryList || []).map((item: any) => {
      const lowerName = item.name.toLowerCase();
      let pricingSource = 'ai_estimate';
      let pricingConfidence = 'low';

      // Layer 2: regional baseline (preferred) — apply BLS multiplier on top
      const ingredientId = findIngredientId(lowerName);
      if (ingredientId && userState) {
        const regional = regionalByKey.get(`${ingredientId}|${userState}`);
        if (regional) {
          item.estimatedPrice = Math.round(regional.price * blsMultiplier * 100) / 100;
          pricingSource = 'regional_baseline';
          pricingConfidence = 'medium';
          item.pricingUnit = regional.unit;
        }
      }

      // Layer 3: national baseline (fallback when no regional)
      if (pricingSource === 'ai_estimate' && ingredientId) {
        const national = nationalByIngredient.get(ingredientId);
        if (national) {
          item.estimatedPrice = Math.round(national.price * effectiveMultiplier * 100) / 100;
          pricingSource = 'national_baseline';
          pricingConfidence = 'medium';
          item.pricingUnit = national.unit;
        }
      }
          pricingSource = 'national_baseline';
          pricingConfidence = 'medium';
          item.pricingUnit = national.unit;
        }
      }

      // Legacy canonical fallback (only if no ingredient match at all)
      if (pricingSource === 'ai_estimate') {
        const canonical = canonicalMap.get(lowerName) ||
          [...canonicalMap.entries()].find(([k]) => lowerName.includes(k) || k.includes(lowerName))?.[1];
        if (canonical) {
          item.estimatedPrice = Math.round(canonical.price * effectiveMultiplier * 100) / 100;
          pricingSource = 'internal_estimate';
          pricingConfidence = 'medium';
        }
      }

      if (item.storePrices && Object.keys(item.storePrices).length > 0 && pricingSource === 'ai_estimate') {
        pricingConfidence = 'medium';
      }

      item.pricingSource = pricingSource;
      item.pricingConfidence = pricingConfidence;

      const storeProducts: Record<string, { brand: string; productDescription: string }> = { ...(item.storeProducts || {}) };
      for (const storeName of Object.keys(item.storePrices || {})) {
        const existing = storeProducts[storeName] || {};
        const brand = existing.brand || inferStoreBrand(storeName, item.brand);
        storeProducts[storeName] = { brand, productDescription: existing.productDescription || `${brand} ${item.name}, ${item.quantity}`.trim() };
      }

      return { ...item, storeProducts };
    });

    // Pricing confidence summary — baseline (regional/national) prices count as "cached" tier
    const groceryList = mealPlan.groceryList || [];
    let exactCount = 0, cachedCount = 0, estimatedCount = 0;
    for (const item of groceryList) {
      if (item.pricingSource === 'live') exactCount++;
      else if (item.pricingSource === 'cached' || item.pricingSource === 'regional_baseline' || item.pricingSource === 'national_baseline' || item.pricingSource === 'internal_estimate') cachedCount++;
      else estimatedCount++;
    }
    mealPlan.pricingConfidence = {
      exactPricedCount: exactCount, cachedPricedCount: cachedCount, estimatedCount,
      totalItems: groceryList.length,
      confidencePercent: groceryList.length > 0 ? Math.round(((exactCount + cachedCount) / groceryList.length) * 100) : 0,
    };

    // costPerServing
    for (const day of (mealPlan.weeklyPlan || [])) {
      for (const meal of (day.meals || [])) {
        if (meal.estimatedCost && householdSize > 0) {
          meal.costPerServing = Math.round((meal.estimatedCost / householdSize) * 100) / 100;
        }
      }
    }

    // Recalculate totals
    const recalcTotal = groceryList.reduce((sum: number, item: any) => sum + (item.estimatedPrice || 0), 0);
    mealPlan.totalEstimatedCost = Math.round(recalcTotal * 100) / 100;

    // Persist regional adjustment metadata so UI can show "Prices adjusted for your region"
    mealPlan.costOfLivingMultiplier = effectiveMultiplier;
    if (blsRegionLabel) mealPlan.regionLabel = `${blsRegionLabel} (BLS)`;
    else if (!mealPlan.regionLabel) mealPlan.regionLabel = `${cityInfo.city}, ${cityInfo.state}`;

    if (mealPlan.storeRecommendations) {
      for (const rec of mealPlan.storeRecommendations) {
        rec.estimatedTotal = Math.round(groceryList.reduce((sum: number, item: any) => sum + (item.storePrices?.[rec.store] ?? item.estimatedPrice ?? 0), 0) * 100) / 100;
      }
    }

    const totalMealCount = (mealPlan.weeklyPlan || []).reduce((n: number, d: any) => n + (d.meals?.length || 0), 0);
    if (totalMealCount > 0) mealPlan.costPerMeal = Math.round((recalcTotal / totalMealCount) * 100) / 100;
    mealPlan.taxEstimate = Math.round(recalcTotal * stateGroceryTaxRate * 100) / 100;

    // Budget lock
    if (mealPlan.totalEstimatedCost > budget * 1.15) {
      const scaleFactor = budget / mealPlan.totalEstimatedCost;
      for (const item of groceryList) {
        item.estimatedPrice = Math.round((item.estimatedPrice || 0) * scaleFactor * 100) / 100;
        if (item.storePrices) {
          for (const store of Object.keys(item.storePrices)) {
            item.storePrices[store] = Math.round(item.storePrices[store] * scaleFactor * 100) / 100;
          }
        }
      }
      const scaledTotal = groceryList.reduce((sum: number, item: any) => sum + (item.estimatedPrice || 0), 0);
      mealPlan.totalEstimatedCost = Math.round(scaledTotal * 100) / 100;
      if (mealPlan.storeRecommendations) {
        for (const rec of mealPlan.storeRecommendations) {
          rec.estimatedTotal = Math.round(groceryList.reduce((sum: number, item: any) => sum + (item.storePrices?.[rec.store] ?? item.estimatedPrice ?? 0), 0) * 100) / 100;
        }
      }
      if (totalMealCount > 0) mealPlan.costPerMeal = Math.round((scaledTotal / totalMealCount) * 100) / 100;
      mealPlan.taxEstimate = Math.round(scaledTotal * stateGroceryTaxRate * 100) / 100;
    }

    // Savings summary
    const REGIONAL_MARKUP = 1.30;
    const actualCost = mealPlan.totalEstimatedCost || 0;
    const regionalAverage = Math.round(actualCost * REGIONAL_MARKUP * 100) / 100;
    const estimatedSavings = Math.round((regionalAverage - actualCost) * 100) / 100;
    mealPlan.savingsSummary = {
      actualGroceryCost: actualCost,
      regionalAverageCost: regionalAverage,
      estimatedSavings,
      savingsPercent: regionalAverage > 0 ? Math.round((estimatedSavings / regionalAverage) * 100) : 0,
      confidenceScore: Math.min((mealPlan.pricingConfidence?.confidencePercent || 40) + 20, 100),
    };

    // ===== PARALLEL DB WRITES =====
    const weekStart = getNextMonday();

    // Delete old data in parallel
    await Promise.all([
      supabase.from("meal_plan_items").delete().eq("user_id", user.id).gte("created_at", weekStart),
      supabase.from("grocery_list_items").delete().eq("user_id", user.id),
      supabase.from("grocery_lists").delete().eq("user_id", user.id).eq("status", "active"),
    ]);

    // Upsert meal plan
    const { data: existingPlan } = await supabase
      .from("meal_plans").select("id").eq("user_id", user.id).eq("week_start", weekStart).single();

    let mealPlanId: string;
    if (existingPlan) {
      await supabase.from("meal_plans").update({
        total_estimated_cost: mealPlan.totalEstimatedCost, status: "active", plan_data: mealPlan,
      }).eq("id", existingPlan.id);
      mealPlanId = existingPlan.id;
    } else {
      const { data: newPlan, error: planError } = await supabase
        .from("meal_plans").insert({
          user_id: user.id, week_start: weekStart,
          total_estimated_cost: mealPlan.totalEstimatedCost, status: "active", plan_data: mealPlan,
        }).select("id").single();
      if (planError) throw planError;
      mealPlanId = newPlan.id;
    }

    // Build items for parallel insert
    const dayMap: Record<string, number> = { Monday: 0, Tuesday: 1, Wednesday: 2, Thursday: 3, Friday: 4, Saturday: 5, Sunday: 6 };
    const mealItems = (mealPlan.weeklyPlan || []).flatMap((day: any) =>
      (day.meals || []).map((meal: any) => ({
        meal_plan_id: mealPlanId, user_id: user.id, day_of_week: dayMap[day.day] ?? 0,
        meal_type: meal.type || "dinner", meal_name: meal.name, calories: meal.calories,
        protein_g: meal.protein, carbs_g: meal.carbs, fats_g: meal.fats, estimated_cost: meal.estimatedCost,
      }))
    );

    // Grocery list + items + savings — all in parallel
    const groceryListInsert = supabase.from("grocery_lists").insert({
      user_id: user.id, meal_plan_id: mealPlanId,
      store_name: mealPlan.storeRecommendations?.[0]?.store || "Any",
      estimated_total: mealPlan.totalEstimatedCost, tax_rate: stateGroceryTaxRate, status: "active",
    }).select("id").single();

    const mealItemsInsert = mealItems.length > 0 ? supabase.from("meal_plan_items").insert(mealItems) : Promise.resolve();

    const savingsInsert = mealPlan.savingsSummary ? supabase.from("grocery_cost_comparisons").insert({
      user_id: user.id, meal_plan_id: mealPlanId, zip_code: zipCode || null,
      selected_store: mealPlan.storeRecommendations?.[0]?.store || null,
      actual_grocery_cost: mealPlan.savingsSummary.actualGroceryCost,
      regional_average_cost: mealPlan.savingsSummary.regionalAverageCost,
      estimated_savings: mealPlan.savingsSummary.estimatedSavings,
      confidence_score: mealPlan.savingsSummary.confidenceScore,
      store_comparisons: mealPlan.storeRecommendations || [],
    }) : Promise.resolve();

    const [glResult] = await Promise.all([groceryListInsert, mealItemsInsert, savingsInsert]);

    if (glResult?.data?.id) {
      const groceryItems = (mealPlan.groceryList || []).map((item: any) => ({
        grocery_list_id: glResult.data.id, user_id: user.id,
        ingredient_name: item.name, quantity: item.quantity,
        estimated_price: item.estimatedPrice, store_section: item.section, is_checked: false,
      }));
      if (groceryItems.length > 0) await supabase.from("grocery_list_items").insert(groceryItems);
    }

    return new Response(JSON.stringify(mealPlan), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Meal engine error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
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

interface RegionInfo { region: string; costMultiplier: number; groceryTaxRate: number; }

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
