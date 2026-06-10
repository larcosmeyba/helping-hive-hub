// Generate weekly meal plan — HYBRID engine.
// Flow: library candidate pool → AI ranks/assigns → AI creates only as fallback.
// Server is the source of truth for meal data, cost, ingredients, and grocery list.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { enforceRateLimit } from "../_shared/rateLimit.ts";

interface Overrides {
  budget?: number;
  store?: string;
  dietary_preferences?: string[];
  household_size?: number;
  meal_count?: number;
}

type JobStage = "preparing" | "generating" | "saving" | "done";

type GenerationErrorCode =
  | "missing_context"
  | "openai_timeout"
  | "invalid_ai_json"
  | "database_insert_failed"
  | "grocery_list_failed";

const BACKEND_STEPS: Record<JobStage, string[]> = {
  preparing: ["profile loaded", "pantry_items loaded", "fridge_items loaded", "recipe candidates fetched", "meal_plan_context created"],
  generating: ["OpenAI request started", "OpenAI response received"],
  saving: ["grocery_list_items generated", "estimated totals calculated"],
  done: ["meal_plan saved", "meal_plan_meals saved", "grocery list saved", "navigate to Meal Plan page"],
};

const SYSTEM_PROMPT = `You are Help The Hive's meal planning AI using a HYBRID library-first strategy.

You are given a pool of CURATED RECIPES (each with id, title, meal_type, cost_per_serving, brief tags).
Your job is to SELECT recipes from the pool to fill each day's breakfast/lunch/dinner slots.

ABSOLUTE SAFETY RULES — VIOLATION CAN HARM THE USER:
- The user's "allergies" array lists ingredients they CANNOT eat. NEVER select or create a meal containing ANY allergen — including derivatives (e.g. "nuts" forbids almond, walnut, pecan, peanut, cashew, hazelnut, pistachio, macadamia, brazil nut, pine nut, nut butter; "dairy" forbids milk, cheese, butter, yogurt, cream, whey; "gluten" forbids wheat, flour, bread, pasta, barley, rye).
- The user's "dietary_preferences" array is BINDING. "vegan" = NO meat, poultry, fish, seafood, eggs, dairy, honey, gelatin. "vegetarian" = NO meat, poultry, fish, seafood, gelatin. "pescatarian" = NO meat or poultry. Pot roast, beef, chicken, pork, bacon, etc. are FORBIDDEN for vegan/vegetarian users.
- If a recipe's title, description, or any ingredient could violate these rules, SKIP IT. Better to return fewer meals than to harm the user.

OTHER RULES:
- PREFER library recipes. For each meal slot, choose a recipe from candidates_<meal_type> by returning its library_recipe_id.
- Vary protein/cuisine across the week — don't pick the same recipe twice.
- Only create a new_meal when NO candidate fits the user's dietary/allergy needs. New meals must include meal_name, description, short ingredients list, instructions, cost_per_serving estimate, prep/cook minutes — and must also follow every allergy and dietary rule above.
- Prioritize candidates that use ingredients the user already has (pantry/fridge), especially expiring_today or use_soon items.
- NEVER recommend expired ingredients.
- Stay within the weekly grocery budget.
- Output ONLY the structured tool call.`;

const RESPONSE_SCHEMA = {
  type: "object",
  required: ["days", "why_this_plan"],
  properties: {
    days: {
      type: "array",
      items: {
        type: "object",
        required: ["day_name"],
        properties: {
          day_name: { type: "string" },
          breakfast: { $ref: "#/$defs/slot" },
          lunch: { $ref: "#/$defs/slot" },
          dinner: { $ref: "#/$defs/slot" },
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
        summary: { type: "string" },
      },
    },
  },
  $defs: {
    slot: {
      type: "object",
      properties: {
        library_recipe_id: { type: "string", description: "UUID of a recipe from the provided candidate pool. Prefer this." },
        new_meal: {
          type: "object",
          description: "Only when no candidate fits.",
          properties: {
            meal_name: { type: "string" },
            description: { type: "string" },
            ingredients: { type: "array", items: { type: "string" } },
            instructions: { type: "array", items: { type: "string" } },
            estimated_cost_per_serving: { type: "number" },
            calories_estimate: { type: "integer" },
            protein_estimate: { type: "number" },
            prep_time_minutes: { type: "integer" },
            cook_time_minutes: { type: "integer" },
            difficulty: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
          },
        },
        reason: { type: "string", description: "Brief reason for choice." },
      },
    },
  },
} as const;

// ===== Allergy + dietary safety helpers =====
const ALLERGY_EXPANSIONS: Record<string, string[]> = {
  nuts: ["nut", "nuts", "almond", "walnut", "pecan", "peanut", "cashew", "hazelnut", "pistachio", "macadamia", "brazil nut", "pine nut", "nutella", "marzipan", "praline"],
  "tree nuts": ["almond", "walnut", "pecan", "cashew", "hazelnut", "pistachio", "macadamia", "brazil nut", "pine nut"],
  peanuts: ["peanut", "peanuts", "peanut butter", "groundnut"],
  dairy: ["milk", "cheese", "butter", "yogurt", "yoghurt", "cream", "whey", "casein", "lactose", "ghee", "parmesan", "mozzarella", "cheddar", "feta", "ricotta"],
  milk: ["milk", "cheese", "butter", "yogurt", "cream", "whey", "casein", "lactose"],
  gluten: ["wheat", "flour", "bread", "pasta", "barley", "rye", "couscous", "semolina", "farro", "spelt", "bulgur", "seitan", "soy sauce"],
  wheat: ["wheat", "flour", "bread", "pasta", "couscous", "semolina"],
  eggs: ["egg", "eggs", "mayonnaise", "mayo", "meringue"],
  soy: ["soy", "soya", "tofu", "tempeh", "edamame", "miso", "soy sauce", "tamari"],
  shellfish: ["shrimp", "prawn", "crab", "lobster", "crawfish", "crayfish", "scallop", "clam", "mussel", "oyster"],
  fish: ["fish", "salmon", "tuna", "cod", "tilapia", "trout", "anchovy", "sardine", "halibut", "mackerel"],
  sesame: ["sesame", "tahini"],
};
const DIET_FORBIDDEN: Record<string, string[]> = {
  vegan: ["beef", "steak", "pot roast", "pork", "bacon", "ham", "sausage", "chicken", "turkey", "lamb", "veal", "duck", "fish", "salmon", "tuna", "cod", "tilapia", "shrimp", "prawn", "crab", "lobster", "scallop", "clam", "oyster", "mussel", "anchovy", "milk", "cheese", "butter", "yogurt", "cream", "whey", "casein", "egg", "eggs", "honey", "gelatin", "lard", "tallow", "ghee", "parmesan", "mozzarella", "cheddar", "feta"],
  vegetarian: ["beef", "steak", "pot roast", "pork", "bacon", "ham", "sausage", "chicken", "turkey", "lamb", "veal", "duck", "fish", "salmon", "tuna", "cod", "tilapia", "shrimp", "prawn", "crab", "lobster", "scallop", "clam", "oyster", "mussel", "anchovy", "gelatin", "lard", "tallow"],
  pescatarian: ["beef", "steak", "pot roast", "pork", "bacon", "ham", "sausage", "chicken", "turkey", "lamb", "veal", "duck", "gelatin", "lard", "tallow"],
  "gluten-free": ["wheat", "flour", "bread", "pasta", "barley", "rye", "couscous", "semolina", "farro", "spelt", "bulgur", "seitan", "soy sauce", "breadcrumbs", "tortilla", "noodle", "noodles"],
  "dairy-free": ["milk", "cheese", "butter", "yogurt", "yoghurt", "cream", "whey", "casein", "lactose", "ghee", "parmesan", "mozzarella", "cheddar", "feta", "ricotta"],
  "nut-free": ["nut", "nuts", "almond", "walnut", "pecan", "peanut", "cashew", "hazelnut", "pistachio", "macadamia", "brazil nut", "pine nut", "nutella", "marzipan", "praline", "nut butter"],
  keto: ["sugar", "bread", "pasta", "rice", "potato", "potatoes", "corn", "flour", "tortilla", "noodle", "noodles", "oats", "cereal", "banana", "honey", "syrup"],
  paleo: ["bread", "pasta", "rice", "flour", "tortilla", "noodle", "noodles", "oats", "cereal", "beans", "lentil", "chickpea", "peanut", "soy", "tofu", "milk", "cheese", "butter", "yogurt", "cream", "sugar"],
  halal: ["pork", "bacon", "ham", "sausage", "pepperoni", "prosciutto", "lard", "wine", "beer", "rum", "vodka", "whiskey", "alcohol"],
  kosher: ["pork", "bacon", "ham", "sausage", "pepperoni", "prosciutto", "lard", "shrimp", "prawn", "crab", "lobster", "scallop", "clam", "oyster", "mussel", "catfish", "shark", "eel"],
};
export function expandAllergies(allergies: string[]): string[] {
  const out = new Set<string>();
  for (const a of allergies || []) {
    const k = (a || "").toLowerCase().trim();
    if (!k) continue;
    out.add(k);
    for (const term of ALLERGY_EXPANSIONS[k] || []) out.add(term);
  }
  return Array.from(out);
}
export function forbiddenForDiets(prefs: string[]): string[] {
  const out = new Set<string>();
  for (const p of prefs || []) {
    const k = (p || "").toLowerCase().trim();
    for (const term of DIET_FORBIDDEN[k] || []) out.add(term);
  }
  return Array.from(out);
}
export function recipeContainsAny(recipe: any, terms: string[]): boolean {
  if (!terms.length) return false;
  const haystacks: string[] = [];
  if (recipe?.title) haystacks.push(String(recipe.title));
  if (recipe?.description) haystacks.push(String(recipe.description));
  if (Array.isArray(recipe?.ingredients)) {
    for (const i of recipe.ingredients) {
      if (typeof i === "string") haystacks.push(i);
      else if (i?.item_name) haystacks.push(String(i.item_name));
    }
  }
  const hay = haystacks.join(" \n ").toLowerCase();
  return terms.some((t) => {
    const term = t.toLowerCase();
    const re = new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    return re.test(hay);
  });
}

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

async function updateJob(
  admin: ReturnType<typeof createClient>,
  jobId: string,
  patch: Record<string, unknown>,
) {
  const cleanPatch = Object.fromEntries(
    Object.entries({ ...patch, last_heartbeat_at: new Date().toISOString() }).filter(([, value]) => value !== undefined),
  );
  const { error } = await admin
    .from("meal_plan_generation_jobs")
    .update(cleanPatch)
    .eq("id", jobId);
  if (error) console.error("[generate-meal-plan] failed to update job", error);
}

function missingContextFields(ctx: Record<string, unknown>) {
  const required = ["household_size", "weekly_grocery_budget", "dietary_preferences", "allergies", "pantry_items", "fridge_items", "week_start_date"];
  return required.filter((key) => ctx[key] === undefined || ctx[key] === null);
}

function structuredError(code: GenerationErrorCode, message: string, extra?: Record<string, unknown>) {
  return { ok: false, error: message, error_code: code, ...extra };
}

function normalizeName(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/\d+(\.\d+)?/g, "")
    .replace(/\b(cup|cups|tbsp|tsp|oz|lb|lbs|g|kg|ml|l|can|cans|cloves?|inch|inches|pkg|package|small|medium|large|fresh|frozen|chopped|diced|minced|sliced|grated|drained|cooked|raw)\b/g, "")
    .replace(/[(),./]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseIngredientString(raw: string): { display: string; normalized: string; quantity: string; item: string } {
  const display = raw.trim();
  const qtyMatch = display.match(/^([\d/.\s]+\s*(?:cup|cups|tbsp|tsp|oz|lb|lbs|g|kg|ml|l|can|cans|cloves?|inch|inches|pkg|package)?)\s+(.*)$/i);
  const quantity = qtyMatch ? qtyMatch[1].trim() : "";
  const item = qtyMatch ? qtyMatch[2].trim() : display;
  return { display, normalized: normalizeName(item), quantity, item };
}

function pantryHas(normalizedIngredient: string, pantryNormalized: Set<string>): boolean {
  if (!normalizedIngredient) return false;
  for (const p of pantryNormalized) {
    if (!p) continue;
    if (normalizedIngredient.includes(p) || p.includes(normalizedIngredient)) return true;
  }
  return false;
}

const STAPLE_KEYWORDS = ["salt", "pepper", "olive oil", "water", "oil"];

function categorizeIngredient(name: string): string {
  const n = name.toLowerCase();
  if (/(chicken|beef|pork|turkey|salmon|fish|shrimp|tofu|tempeh|bacon|sausage|egg)/.test(n)) return "Protein";
  if (/(milk|cheese|yogurt|butter|cream)/.test(n)) return "Dairy";
  if (/(lettuce|tomato|onion|garlic|pepper|carrot|spinach|broccoli|kale|cucumber|avocado|potato|celery|mushroom|zucchini|cabbage|asparagus)/.test(n)) return "Produce";
  if (/(apple|banana|orange|berry|berries|grape|lemon|lime|fruit|peach|mango|pineapple)/.test(n)) return "Produce";
  if (/(rice|pasta|bread|oats|flour|tortilla|noodle|quinoa|cereal)/.test(n)) return "Pantry";
  if (/(can|beans|lentil|chickpea|soup|sauce|broth|stock)/.test(n)) return "Pantry";
  if (/(salt|pepper|spice|herb|seasoning|cumin|paprika|oregano|basil|cinnamon|garlic powder)/.test(n)) return "Spices";
  if (/(oil|vinegar|soy sauce|ketchup|mayo|mustard|dressing|honey|syrup)/.test(n)) return "Condiments";
  if (/(frozen)/.test(n)) return "Frozen";
  return "Other";
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

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Rate limit: 10 full meal-plan generations per user per hour (very expensive).
    // fail-closed: if the limiter RPC itself errors, reject with 429 rather than
    // let the most expensive endpoint flood the DB during pressure.
    const rl = await enforceRateLimit({
      admin,
      userId,
      endpoint: "generate-meal-plan",
      maxPerHour: 10,
      corsHeaders,
      failClosed: true,
    });
    if (rl) return rl;

    const body = await req.json().catch(() => ({}));
    const overrides: Overrides = body.overrides ?? body ?? {};

    const { data: jobRow, error: jobErr } = await admin
      .from("meal_plan_generation_jobs")
      .insert({
        user_id: userId,
        status: "processing",
        current_stage: "preparing",
        current_step: BACKEND_STEPS.preparing[0],
        status_message: "Reviewing your profile & pantry",
        metadata: { source: "generate-meal-plan", engine: "hybrid_v1" },
      })
      .select("id")
      .single();
    if (jobErr || !jobRow?.id) {
      throw new Error(jobErr?.message || "Unable to start meal plan generation job.");
    }
    const jobId = jobRow.id as string;
    const completedSteps: string[] = [];

    const advance = async (stage: JobStage, step: string, statusMessage?: string, extra?: Record<string, unknown>) => {
      if (!completedSteps.includes(step)) completedSteps.push(step);
      await updateJob(admin, jobId, {
        status: "processing",
        current_stage: stage,
        current_step: step,
        completed_steps: completedSteps,
        status_message: statusMessage ?? step,
        metadata: extra ? { ...extra } : undefined,
      });
    };

    const failJob = async (code: GenerationErrorCode, message: string, extra?: Record<string, unknown>) => {
      await updateJob(admin, jobId, {
        status: "failed",
        error_code: code,
        error_message: message,
        completed_at: new Date().toISOString(),
        metadata: extra ? { ...extra } : undefined,
      });
    };

    await advance("preparing", "profile loaded", "Reviewing your profile & pantry");

    const [profileRes, pantryRes, homeStoreRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("pantry_items").select("*").eq("user_id", userId),
      supabase.from("instacart_home_store").select("*").eq("user_id", userId).maybeSingle(),
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
      normalized_name: p.normalized_item_name ?? normalizeName(p.item_name),
    }));

    const fridgeItems = pantryItems.filter((i) => i.location === "fridge");
    const pantryOnly = pantryItems.filter((i) => i.location !== "fridge");
    const expiringSoon = pantryItems.filter((i) => ["expiring_today", "use_soon"].includes(i.freshness_status));
    const expired = pantryItems.filter((i) => i.freshness_status === "expired");
    const pantryNormalized = new Set(pantryItems.map((i) => i.normalized_name).filter(Boolean));
    const homeStore = homeStoreRes.data;

    await advance("preparing", "pantry_items loaded", "Reviewing your profile & pantry", {
      pantry_items_count: pantryOnly.length,
    });
    await advance("preparing", "fridge_items loaded", "Reviewing your profile & pantry", {
      fridge_items_count: fridgeItems.length,
    });

    const householdSize = overrides.household_size ?? profile.household_size ?? 2;
    const weeklyBudget = overrides.budget ?? profile.weekly_budget ?? 75;
    const dietaryPrefs: string[] = (overrides.dietary_preferences ?? profile.dietary_preferences ?? []) as string[];
    const allergies: string[] = (profile.allergies ?? []) as string[];
    const mealCount = overrides.meal_count ?? 18;
    const daysCount = 6; // 6-day batch cook
    const mealsPerType = Math.max(1, Math.ceil(mealCount / 3));

    // Budget tier preference based on per-serving budget
    const targetCostPerServing = weeklyBudget / (mealCount * Math.max(1, householdSize));
    let preferredTiers: string[];
    if (targetCostPerServing <= 1.5) preferredTiers = ["ultra_budget"];
    else if (targetCostPerServing <= 3) preferredTiers = ["ultra_budget", "budget"];
    else if (targetCostPerServing <= 5) preferredTiers = ["ultra_budget", "budget", "standard"];
    else preferredTiers = ["ultra_budget", "budget", "standard", "premium"];

    // Variety: exclude recipes used in last 4 weeks unless favorited
    const fourWeeksAgo = new Date(); fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const { data: recentUsage } = await admin
      .from("recipe_usage")
      .select("recipe_id, favorited")
      .eq("user_id", userId)
      .gte("week_start", fourWeeksAgo.toISOString().slice(0, 10));
    const excludeIds = new Set<string>(
      (recentUsage ?? []).filter((r: any) => !r.favorited).map((r: any) => r.recipe_id),
    );

    // Fetch candidate pool per meal type
    async function fetchCandidates(mealType: "breakfast" | "lunch" | "dinner"): Promise<any[]> {
      // Pull a broad pool; we'll filter dietary/budget client-side for flexibility
      const { data, error } = await admin
        .from("recipes")
        .select("id, title, description, meal_type, cost_per_serving, budget_tier, serving_size, calories, protein_g, ingredients, instructions, image_url, tags, prep_time_minutes, cook_time_minutes, avg_rating, times_used, source, created_by_user_id")
        .eq("meal_type", mealType)
        .or(`is_public.eq.true,created_by_user_id.eq.${userId}`)
        .limit(120);
      if (error) {
        console.error("[generate-meal-plan] candidate fetch failed", mealType, error);
        return [];
      }
      let pool = (data ?? []).filter((r: any) => !excludeIds.has(r.id));

      // Allergy filter (HARD — checks title, description, ingredients)
      const allergyTerms = expandAllergies(allergies);
      if (allergyTerms.length) {
        pool = pool.filter((r: any) => !recipeContainsAny(r, allergyTerms));
      }

      // Dietary preference filter (HARD for vegan/vegetarian/pescatarian — safety)
      const dietForbidden = forbiddenForDiets(dietaryPrefs);
      if (dietForbidden.length) {
        pool = pool.filter((r: any) => !recipeContainsAny(r, dietForbidden));
      }
      // Soft tag-match preference for non-restrictive prefs
      if (dietaryPrefs.length && !dietForbidden.length) {
        const prefsLower = dietaryPrefs.map((p) => p.toLowerCase());
        const matched = pool.filter((r: any) => {
          const tags = (r.tags ?? []).map((t: string) => t.toLowerCase());
          return prefsLower.some((p) => tags.includes(p));
        });
        if (matched.length >= mealsPerType * 2) pool = matched;
      }

      // Budget tier preference (soft)
      const tierMatched = pool.filter((r: any) => !r.budget_tier || preferredTiers.includes(r.budget_tier));
      if (tierMatched.length >= mealsPerType * 2) pool = tierMatched;

      // Rank: rating desc, times_used asc, then shuffle stable-ish
      pool.sort((a: any, b: any) => {
        const ra = Number(a.avg_rating ?? 0);
        const rb = Number(b.avg_rating ?? 0);
        if (rb !== ra) return rb - ra;
        return (a.times_used ?? 0) - (b.times_used ?? 0);
      });

      return pool.slice(0, 12);
    }

    const [breakfastCandidates, lunchCandidates, dinnerCandidates] = await Promise.all([
      fetchCandidates("breakfast"),
      fetchCandidates("lunch"),
      fetchCandidates("dinner"),
    ]);

    await advance("preparing", "recipe candidates fetched", "Picking from your recipe library", {
      breakfast_candidates: breakfastCandidates.length,
      lunch_candidates: lunchCandidates.length,
      dinner_candidates: dinnerCandidates.length,
    });

    const candidatesById = new Map<string, any>();
    for (const r of [...breakfastCandidates, ...lunchCandidates, ...dinnerCandidates]) candidatesById.set(r.id, r);

    function compactCandidate(r: any) {
      // Identify pantry-overlap count for AI signal
      const ings = Array.isArray(r.ingredients) ? r.ingredients : [];
      let pantryOverlap = 0;
      for (const ing of ings) {
        if (typeof ing !== "string") continue;
        const norm = parseIngredientString(ing).normalized;
        if (pantryHas(norm, pantryNormalized)) pantryOverlap++;
      }
      return {
        id: r.id,
        title: r.title,
        cost_per_serving: r.cost_per_serving,
        budget_tier: r.budget_tier,
        tags: r.tags ?? [],
        prep_min: r.prep_time_minutes,
        cook_min: r.cook_time_minutes,
        ingredients_preview: ings.slice(0, 4),
        pantry_overlap: pantryOverlap,
      };
    }

    const mealPlanContext = {
      user_id: userId,
      household_size: householdSize,
      weekly_grocery_budget: weeklyBudget,
      zip_code: profile.zip_code ?? null,
      preferred_store: overrides.store ?? homeStore?.retailer_name ?? profile.home_store ?? null,
      dietary_preferences: dietaryPrefs,
      allergies,
      cooking_confidence: profile.cooking_confidence ?? "medium",
      pantry_items: pantryOnly.slice(0, 50),
      fridge_items: fridgeItems.slice(0, 30),
      expiring_soon_items: expiringSoon,
      expired_items: expired,
      preferred_meal_count: mealCount,
      meals_per_type: mealsPerType,
      days_count: daysCount,
      week_start_date: new Date().toISOString().slice(0, 10),
      candidates_breakfast: breakfastCandidates.map(compactCandidate),
      candidates_lunch: lunchCandidates.map(compactCandidate),
      candidates_dinner: dinnerCandidates.map(compactCandidate),
    };

    const missingFields = missingContextFields({
      ...mealPlanContext,
      household_size: mealPlanContext.household_size,
      weekly_grocery_budget: mealPlanContext.weekly_grocery_budget,
    } as Record<string, unknown>);
    if (missingFields.length) {
      const message = `Missing required meal plan context: ${missingFields.join(", ")}`;
      await failJob("missing_context", message, { missing_fields: missingFields });
      return new Response(JSON.stringify(structuredError("missing_context", message, { job_id: jobId })), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await advance("preparing", "meal_plan_context created", "Reviewing your profile & pantry");

    const { callOpenAI } = await import("../_shared/openaiClient.ts");
    let lastAttemptError: { code: GenerationErrorCode; message: string; details?: Record<string, unknown> } | null = null;

    async function attempt(attemptNum: number): Promise<any | null> {
      await advance("generating", "OpenAI request started", "Building your weekly meal plan", { attempt: attemptNum });
      try {
        const ai = await callOpenAI({
          model: "gpt-5.4-mini",
          system: SYSTEM_PROMPT,
          user: `Select recipes from candidates_breakfast / candidates_lunch / candidates_dinner to fill ${daysCount} days. Return library_recipe_id when possible. Context:\n\n${JSON.stringify(mealPlanContext)}`,
          tools: [{
            type: "function",
            function: {
              name: "return_meal_plan",
              description: "Return the day-by-day meal plan referencing library recipes.",
              parameters: RESPONSE_SCHEMA,
            },
          }],
          tool_choice: { type: "function", function: { name: "return_meal_plan" } },
          max_tokens: 5000,
          timeout_ms: 45000,
          log: { admin, user_id: userId, request_type: `meal_plan_generation_attempt_${attemptNum}` },
        });

        const finishReason = ai.raw?.choices?.[0]?.finish_reason;
        console.log(`[generate-meal-plan] attempt ${attemptNum} finish_reason=`, finishReason);

        if (finishReason === "length") {
          lastAttemptError = { code: "invalid_ai_json", message: "Meal planner response was cut off.", details: { attempt: attemptNum } };
          return null;
        }

        const p = ai.tool_arguments as any;
        if (!p?.days || !Array.isArray(p.days) || p.days.length < 1) {
          lastAttemptError = { code: "invalid_ai_json", message: "Meal planner returned invalid data.", details: { attempt: attemptNum } };
          return null;
        }

        await advance("generating", "OpenAI response received", "Building your weekly meal plan", { attempt: attemptNum });
        return p;
      } catch (e: any) {
        console.error(`[generate-meal-plan] attempt ${attemptNum} threw`, e?.status, e?.message);
        if (e?.status === 429 || e?.status === 402) throw e;
        lastAttemptError = {
          code: e?.code === "openai_timeout" ? "openai_timeout" : "invalid_ai_json",
          message: e?.code === "openai_timeout" ? "The meal planner timed out." : (e?.message || "AI response invalid."),
          details: { attempt: attemptNum },
        };
        return null;
      }
    }

    // Load-test stub: bypass the AI call entirely when the request opts in AND
    // the environment explicitly allows it (staging only). Everything else —
    // auth, rate limit, DB inserts, grocery list generation — still runs.
    // NEVER set LOADTEST_STUB_ALLOWED=true in production.
    const stubAllowed = Deno.env.get("LOADTEST_STUB_ALLOWED") === "true";
    const stubRequested = req.headers.get("x-loadtest-stub") === "true";
    let parsed: any;
    if (stubAllowed && stubRequested) {
      await advance("generating", "OpenAI response received", "Building your weekly meal plan (loadtest stub)", { stub: true });
      parsed = buildServerFallback(daysCount, breakfastCandidates, lunchCandidates, dinnerCandidates);
    } else {
      parsed = await attempt(1);
      if (!parsed) parsed = await attempt(2);
    }

    if (!parsed) {
      // Server-side fallback: just pick top candidates ourselves
      console.warn("[generate-meal-plan] AI failed both attempts — using server-side library fallback");
      parsed = buildServerFallback(daysCount, breakfastCandidates, lunchCandidates, dinnerCandidates);
      if (!parsed.days.length) {
        const errorCode = lastAttemptError?.code ?? "invalid_ai_json";
        const errorMessage = lastAttemptError?.message ?? "We couldn't generate your meal plan.";
        await failJob(errorCode, errorMessage, lastAttemptError?.details);
        return new Response(JSON.stringify(structuredError(errorCode, errorMessage, { job_id: jobId })), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ===== RESOLVE meals into server-truth data =====
    // For each day/slot: if library_recipe_id → load from recipes table.
    // Else if new_meal → insert a private recipe row owned by user.
    const resolvedDays: Array<{
      day_name: string;
      meals: Array<{ meal_type: "breakfast" | "lunch" | "dinner"; recipe: any; reason?: string }>;
    }> = [];

    const allergyTerms = expandAllergies(allergies);
    const dietForbidden = forbiddenForDiets(dietaryPrefs);
    const safetyTerms = [...allergyTerms, ...dietForbidden];

    function findSafeCandidate(mealType: "breakfast" | "lunch" | "dinner", usedIds: Set<string>): any | null {
      const pool = mealType === "breakfast" ? breakfastCandidates : mealType === "lunch" ? lunchCandidates : dinnerCandidates;
      for (const c of pool) {
        if (usedIds.has(c.id)) continue;
        if (safetyTerms.length && recipeContainsAny(c, safetyTerms)) continue;
        return c;
      }
      return null;
    }

    const usedIds = new Set<string>();
    for (const day of parsed.days.slice(0, daysCount)) {
      const dayMeals: any[] = [];
      for (const mealType of ["breakfast", "lunch", "dinner"] as const) {
        const slot = day[mealType];
        if (!slot) continue;

        let recipe: any = null;
        let reason: string | undefined = slot.reason;

        if (slot.library_recipe_id && candidatesById.has(slot.library_recipe_id)) {
          const cand = candidatesById.get(slot.library_recipe_id);
          if (safetyTerms.length && recipeContainsAny(cand, safetyTerms)) {
            console.warn("[generate-meal-plan] AI chose unsafe library recipe — replacing", cand.title);
            recipe = findSafeCandidate(mealType, usedIds);
            reason = "Swapped to honor your dietary preferences and allergies.";
          } else {
            recipe = cand;
          }
        } else if (slot.new_meal) {
          const nm = slot.new_meal;
          const pseudo = { title: nm.meal_name, description: nm.description, ingredients: nm.ingredients };
          if (safetyTerms.length && recipeContainsAny(pseudo, safetyTerms)) {
            console.warn("[generate-meal-plan] AI new_meal violates allergy/diet — replacing", nm.meal_name);
            recipe = findSafeCandidate(mealType, usedIds);
            reason = "Swapped to honor your dietary preferences and allergies.";
          } else {
            const cost = Number(nm.estimated_cost_per_serving) || null;
            const servings = householdSize;
            const { data: inserted, error: insErr } = await admin
              .from("recipes")
              .insert({
                title: String(nm.meal_name || "Custom meal").slice(0, 200),
                description: nm.description ?? null,
                meal_type: mealType,
                ingredients: Array.isArray(nm.ingredients) ? nm.ingredients : [],
                instructions: Array.isArray(nm.instructions) ? nm.instructions : [],
                calories: nm.calories_estimate ?? null,
                protein_g: nm.protein_estimate ?? null,
                prep_time_minutes: nm.prep_time_minutes ?? null,
                cook_time_minutes: nm.cook_time_minutes ?? null,
                serving_size: servings,
                estimated_recipe_cost: cost ? cost * servings : null,
                source: "ai_generated",
                is_public: false,
                created_by_user_id: userId,
                tags: Array.isArray(nm.tags) ? nm.tags : [],
              })
              .select("id, title, description, meal_type, cost_per_serving, budget_tier, serving_size, calories, protein_g, ingredients, instructions, image_url, tags, prep_time_minutes, cook_time_minutes")
              .single();
            if (insErr) {
              console.error("[generate-meal-plan] failed to insert AI recipe", insErr);
              continue;
            }
            recipe = inserted;
          }
        } else {
          continue;
        }

        if (!recipe) continue; // no safe substitute available — skip slot rather than serve unsafe food
        if (recipe.id) usedIds.add(recipe.id);
        dayMeals.push({ meal_type: mealType, recipe, reason });
      }
      // Backfill missing meal slots — families need a full 3 meals per day.
      // If the AI returned fewer than 3 slots (or omitted a meal_type), pull
      // the next safe unused candidate of the missing type from the pool.
      const present = new Set(dayMeals.map((m) => m.meal_type));
      for (const mealType of ["breakfast", "lunch", "dinner"] as const) {
        if (present.has(mealType)) continue;
        const fill = findSafeCandidate(mealType, usedIds);
        if (!fill) continue;
        usedIds.add(fill.id);
        dayMeals.push({
          meal_type: mealType,
          recipe: fill,
          reason: "Added to round out your day with breakfast, lunch, and dinner.",
        });
      }
      // Keep meals in canonical breakfast → lunch → dinner order.
      dayMeals.sort((a, b) => {
        const order = { breakfast: 0, lunch: 1, dinner: 2 } as Record<string, number>;
        return (order[a.meal_type] ?? 9) - (order[b.meal_type] ?? 9);
      });
      resolvedDays.push({ day_name: day.day_name || `Day ${resolvedDays.length + 1}`, meals: dayMeals });
    }

    // ===== Budget enforcement (hard cap) =====
    // The estimated grocery total must NEVER exceed the user's weekly budget.
    // Swap the most expensive selected meals with the cheapest unused candidate
    // of the same meal_type until projected cost <= budget, or no swap helps.
    const candidatesByType: Record<string, any[]> = {
      breakfast: breakfastCandidates,
      lunch: lunchCandidates,
      dinner: dinnerCandidates,
    };
    const FALLBACK_COST_PER_SERVING = 3.5; // conservative for missing prices
    const mealCost = (r: any): number =>
      (Number(r?.cost_per_serving) || FALLBACK_COST_PER_SERVING) * householdSize;
    const projectedTotal = () =>
      resolvedDays.reduce((s, d) => s + d.meals.reduce((s2, m) => s2 + mealCost(m.recipe), 0), 0);

    const usedRecipeIdSet = new Set<string>();
    for (const d of resolvedDays) for (const m of d.meals) if (m.recipe?.id) usedRecipeIdSet.add(m.recipe.id);

    let swapGuard = 0;
    while (projectedTotal() > weeklyBudget && swapGuard < 24) {
      swapGuard++;
      // Find most expensive meal in plan that has a cheaper unused alternative.
      let bestSwap: {
        dayIdx: number;
        mealIdx: number;
        replacement: any;
        delta: number;
      } | null = null;

      for (let di = 0; di < resolvedDays.length; di++) {
        const day = resolvedDays[di];
        for (let mi = 0; mi < day.meals.length; mi++) {
          const meal = day.meals[mi];
          const pool = candidatesByType[meal.meal_type] || [];
          const currentCost = mealCost(meal.recipe);
          for (const cand of pool) {
            if (usedRecipeIdSet.has(cand.id)) continue;
            const candCost = mealCost(cand);
            const delta = currentCost - candCost; // positive = savings
            if (delta <= 0) continue;
            if (!bestSwap || delta > bestSwap.delta) {
              bestSwap = { dayIdx: di, mealIdx: mi, replacement: cand, delta };
            }
          }
        }
      }

      if (!bestSwap) break; // no cheaper option available
      const old = resolvedDays[bestSwap.dayIdx].meals[bestSwap.mealIdx];
      if (old.recipe?.id) usedRecipeIdSet.delete(old.recipe.id);
      usedRecipeIdSet.add(bestSwap.replacement.id);
      resolvedDays[bestSwap.dayIdx].meals[bestSwap.mealIdx] = {
        meal_type: old.meal_type,
        recipe: bestSwap.replacement,
        reason: "Swapped to keep your plan within your weekly grocery budget.",
      };
    }

    // ===== Build grocery list (helper, callable repeatedly during enforcement) =====
    // Category averages MUST mirror src/lib/pricingService.ts so the server's
    // budget enforcement uses the SAME numbers the UI displays. Otherwise the
    // engine can declare a plan "within budget" while the client renders a
    // higher range and shows "Over budget" — exactly what users were seeing.
    const CATEGORY_AVG: Record<string, number> = {
      Produce: 1.75,
      Protein: 6.5,
      Dairy: 4.0,
      Pantry: 3.0,
      Spices: 3.0,
      Condiments: 3.5,
      Frozen: 4.0,
      Other: 3.0,
    };
    // 1.15 mirrors the client's high-end range multiplier when no DB price
    // is hit. We enforce against the HIGH end so the displayed range never
    // exceeds the user's budget.
    const HIGH_MULT = 1.15;

    // ---- DB-pricing parity with the client ----
    // The Grocery screen calls estimateBasketRangeFromDB which sums per-item
    // prices from grocery_price_reference × store/state multipliers. If we
    // enforce the budget against category averages instead, the server will
    // happily declare a plan "within budget" while the UI renders a much
    // higher range and shows "Over budget" — the exact bug just reported.
    // We mirror the client's lookup here so the cap = what the user sees.
    const storeCodeForPricing: string | null =
      (homeStore?.retailer_name as string | undefined) ??
      ((profile as any).home_store as string | undefined) ??
      null;
    const stateCodeForPricing: string | null =
      ((profile as any).state as string | undefined) ?? null;

    let cachedStoreMult: number | null = null;
    let cachedStateMult: number | null = null;
    async function getMultipliers(): Promise<number> {
      if (cachedStoreMult === null) {
        if (storeCodeForPricing) {
          const { data } = await admin
            .from("store_price_multipliers")
            .select("multiplier")
            .ilike("store_code", storeCodeForPricing.trim().toLowerCase())
            .maybeSingle();
          cachedStoreMult = data?.multiplier != null ? Number(data.multiplier) : 1.0;
        } else {
          cachedStoreMult = 1.0;
        }
      }
      if (cachedStateMult === null) {
        if (stateCodeForPricing) {
          const { data } = await admin
            .from("state_price_multipliers")
            .select("multiplier")
            .ilike("state_code", stateCodeForPricing.trim().toLowerCase())
            .maybeSingle();
          cachedStateMult = data?.multiplier != null ? Number(data.multiplier) : 1.0;
        } else {
          cachedStateMult = 1.0;
        }
      }
      return (cachedStoreMult ?? 1) * (cachedStateMult ?? 1);
    }

    // ===== Deterministic pricing engine (single source of truth) =====
    // Every grocery item resolves to a price detail via lookup_ingredient_price.
    // If no DB row matches we fall back to a conservative category median AND
    // log the miss so the catalog can be expanded. The LLM never computes the
    // total — the engine does.
    const INGREDIENT_ALIASES: Record<string, string> = {
      scallions: "green onion",
      scallion: "green onion",
      "green onions": "green onion",
      cilantro: "coriander",
      capsicum: "bell pepper",
      eggplant: "aubergine",
      "ground beef": "beef ground",
      "ground turkey": "turkey ground",
      "olive oil": "oil olive",
    };
    const mappedAlias = (key: string) => INGREDIENT_ALIASES[key] ?? key;

    const dbPriceCache = new Map<string, { avg: number; low: number; high: number; matched: boolean } | null>();
    async function priceItemDetail(
      name: string,
      category: string,
    ): Promise<{ avg: number; low: number; high: number; matched: boolean }> {
      const rawKey = (name || "").trim().toLowerCase();
      const key = mappedAlias(rawKey);
      const cached = dbPriceCache.get(key);
      if (cached !== undefined && cached !== null) return cached;

      try {
        const { data } = await admin.rpc("lookup_ingredient_price", { _query: key });
        if (Array.isArray(data) && data.length > 0) {
          const top: any = data[0];
          if (Number(top.similarity ?? 0) >= 0.3) {
            const avg = Number(top.avg_price);
            const lowDb = top.low_price != null ? Number(top.low_price) : avg * 0.85;
            const highDb = top.high_price != null ? Number(top.high_price) : avg * 1.15;
            const entry = { avg, low: lowDb, high: highDb, matched: true };
            dbPriceCache.set(key, entry);
            return entry;
          }
        }
      } catch (e) {
        console.warn("[generate-meal-plan] lookup_ingredient_price failed", e);
      }
      // Unmatched — log and fall back to category median (conservative, never $0).
      try {
        await admin.rpc("log_missing_ingredient", {
          _name: name,
          _store_code: storeCodeForPricing,
          _state_code: stateCodeForPricing,
        });
      } catch { /* best-effort log */ }
      const catAvg = CATEGORY_AVG[category] ?? CATEGORY_AVG.Other;
      const entry = { avg: catAvg, low: catAvg * 0.9, high: catAvg * HIGH_MULT, matched: false };
      dbPriceCache.set(key, entry);
      return entry;
    }

    async function priceBasket(buy: any[]): Promise<{
      low: number;
      avg: number;
      high: number;
      drivers: Array<{ name: string; high: number }>;
      unmatched: number;
    }> {
      const mult = await getMultipliers();
      let low = 0, avg = 0, high = 0, unmatched = 0;
      const drivers: Array<{ name: string; high: number }> = [];
      for (const g of buy) {
        const p = await priceItemDetail(g.ingredient_name, g.category);
        const lineHigh = p.high * mult;
        low += p.low * mult;
        avg += p.avg * mult;
        high += lineHigh;
        if (!p.matched) unmatched++;
        drivers.push({ name: g.ingredient_name, high: lineHigh });
        // Mutate the grocery line so the UI shows the real DB price, not "Other $3.00".
        g.estimated_price = Math.round(p.avg * mult * 100) / 100;
        g.price_low = Math.round(p.low * mult * 100) / 100;
        g.price_high = Math.round(p.high * mult * 100) / 100;
        g.price_matched = p.matched;
      }
      drivers.sort((a, b) => b.high - a.high);
      return { low, avg, high, drivers: drivers.slice(0, 5), unmatched };
    }

    function buildGroceryListAndBasket(days: typeof resolvedDays) {
      const agg = new Map<string, {
        ingredient_name: string;
        quantity: string;
        category: string;
        estimated_price: number;
        already_have: boolean;
        needed_for_meals: string[];
        instacart_search_term: string;
      }>();
      for (const day of days) {
        for (const meal of day.meals) {
          const ings = Array.isArray(meal.recipe.ingredients) ? meal.recipe.ingredients : [];
          for (const raw of ings) {
            if (typeof raw !== "string") continue;
            const parsed = parseIngredientString(raw);
            if (!parsed.normalized) continue;
            const isStaple = STAPLE_KEYWORDS.some((s) => parsed.normalized.includes(s));
            const alreadyHave = pantryHas(parsed.normalized, pantryNormalized) || isStaple;
            const category = categorizeIngredient(parsed.item);
            const catAvg = CATEGORY_AVG[category] ?? CATEGORY_AVG.Other;
            const existing = agg.get(parsed.normalized);
            if (existing) {
              if (!existing.needed_for_meals.includes(meal.recipe.title)) {
                existing.needed_for_meals.push(meal.recipe.title);
              }
            } else {
              agg.set(parsed.normalized, {
                ingredient_name: parsed.item || parsed.display,
                quantity: parsed.quantity || "1",
                category,
                estimated_price: Math.round(catAvg * 100) / 100,
                already_have: alreadyHave,
                needed_for_meals: [meal.recipe.title],
                instacart_search_term: parsed.item,
              });
            }
          }
        }
      }
      const list = Array.from(agg.values());
      const buy = list.filter((g) => !g.already_have);
      return { list, buy };
    }

    // DB-priced cost of a single recipe (excluding already-on-hand items).
    async function recipeDbCost(recipe: any): Promise<number> {
      const ings = Array.isArray(recipe?.ingredients) ? recipe.ingredients : [];
      const mult = await getMultipliers();
      let total = 0;
      for (const raw of ings) {
        if (typeof raw !== "string") continue;
        const parsed = parseIngredientString(raw);
        if (!parsed.normalized) continue;
        const isStaple = STAPLE_KEYWORDS.some((s) => parsed.normalized.includes(s));
        if (isStaple || pantryHas(parsed.normalized, pantryNormalized)) continue;
        const category = categorizeIngredient(parsed.item);
        const p = await priceItemDetail(parsed.item, category);
        total += p.high * mult;
      }
      return total;
    }

    let { list: groceryList, buy: buyItems } = buildGroceryListAndBasket(resolvedDays);
    let basket = await priceBasket(buyItems);

    // ===== DB-priced budget repair loop =====
    // The earlier swap pass uses recipe.cost_per_serving, which can disagree
    // with the DB-priced basket the UI actually shows. Run a second pass that
    // optimizes against the SAME number the user sees, swapping the meal whose
    // DB-priced ingredients contribute the most to the basket for the cheapest
    // unused safe candidate of the same meal_type. Target the budget itself —
    // we want estimate_high <= budget so the displayed upper bound never exceeds.
    const MAX_REPAIR_ATTEMPTS = 6;
    const usedRecipeIds2 = new Set<string>();
    for (const d of resolvedDays) for (const m of d.meals) if (m.recipe?.id) usedRecipeIds2.add(m.recipe.id);

    for (let attempt = 0; attempt < MAX_REPAIR_ATTEMPTS; attempt++) {
      if (basket.high <= weeklyBudget) break;

      // Pre-compute DB cost for every placed meal + every unused candidate.
      const placedCosts: Array<{ di: number; mi: number; meal: any; cost: number }> = [];
      for (let di = 0; di < resolvedDays.length; di++) {
        const day = resolvedDays[di];
        for (let mi = 0; mi < day.meals.length; mi++) {
          placedCosts.push({ di, mi, meal: day.meals[mi], cost: await recipeDbCost(day.meals[mi].recipe) });
        }
      }
      // Most expensive placed meals first — that's where the biggest savings live.
      placedCosts.sort((a, b) => b.cost - a.cost);

      let bestSwap: { di: number; mi: number; candidate: any; savings: number } | null = null;
      for (const slot of placedCosts) {
        const pool = candidatesByType[slot.meal.meal_type] || [];
        for (const cand of pool) {
          if (usedRecipeIds2.has(cand.id)) continue;
          if (safetyTerms.length && recipeContainsAny(cand, safetyTerms)) continue;
          const candCost = await recipeDbCost(cand);
          const savings = slot.cost - candCost;
          if (savings <= 0.01) continue;
          if (!bestSwap || savings > bestSwap.savings) {
            bestSwap = { di: slot.di, mi: slot.mi, candidate: cand, savings };
          }
        }
        // Greedy: once we have a swap on the most expensive meal that helps, take it.
        if (bestSwap && bestSwap.di === slot.di && bestSwap.mi === slot.mi) break;
      }

      if (!bestSwap) break;
      const old = resolvedDays[bestSwap.di].meals[bestSwap.mi];
      if (old.recipe?.id) usedRecipeIds2.delete(old.recipe.id);
      usedRecipeIds2.add(bestSwap.candidate.id);
      resolvedDays[bestSwap.di].meals[bestSwap.mi] = {
        meal_type: old.meal_type,
        recipe: bestSwap.candidate,
        reason: "Swapped to keep your plan within your weekly grocery budget.",
      };

      const rebuilt = buildGroceryListAndBasket(resolvedDays);
      groceryList = rebuilt.list;
      buyItems = rebuilt.buy;
      basket = await priceBasket(buyItems);
    }

    const overBudgetAfterAdjust = basket.high > weeklyBudget;
    // Persist the basket-high number (what the UI shows as the upper bound)
    // so Budget / Remaining math agrees with the displayed range.
    const estimatedTotalCost = Math.round(basket.high * 100) / 100;
    const estimatedTotalLow = Math.round(basket.low * 100) / 100;
    const estimatedTotalAvg = Math.round(basket.avg * 100) / 100;
    const totalMeals = resolvedDays.reduce((s, d) => s + d.meals.length, 0);
    const estimatedCostPerServing = totalMeals > 0 ? estimatedTotalCost / (totalMeals * householdSize) : 0;

    await advance("saving", "grocery_list_items generated", "Pricing your grocery list", {
      grocery_items_count: groceryList.length,
      unmatched_price_items: basket.unmatched,
    });
    await advance("saving", "estimated totals calculated", "Pricing your grocery list", {
      estimated_total_cost: estimatedTotalCost,
      estimated_total_low: estimatedTotalLow,
      estimated_total_avg: estimatedTotalAvg,
      budget_exceeded: overBudgetAfterAdjust,
      top_cost_drivers: basket.drivers,
    });

    // ===== Persist meal_plan =====
    const weekStart = new Date().toISOString().slice(0, 10);
    const normalized = normalizePlanForClient(resolvedDays, groceryList, householdSize);
    // Expose budget context to the client so the Grocery screen can show
    // Budget / Remaining without an extra round-trip.
    (normalized as any).weeklyBudget = weeklyBudget;
    (normalized as any).budgetRemaining = Math.max(0, Math.round((weeklyBudget - estimatedTotalCost) * 100) / 100);
    (normalized as any).budgetExceeded = overBudgetAfterAdjust;
    (normalized as any).estimateLow = estimatedTotalLow;
    (normalized as any).estimateAvg = estimatedTotalAvg;
    (normalized as any).estimateHigh = estimatedTotalCost;
    (normalized as any).topCostDrivers = basket.drivers;
    (normalized as any).unmatchedPriceItems = basket.unmatched;

    const { data: planRow, error: planErr } = await admin.from("meal_plans").insert({
      user_id: userId,
      week_start: weekStart,
      week_start_date: weekStart,
      total_estimated_cost: estimatedTotalCost,
      estimated_daily_average: estimatedTotalCost / Math.max(1, daysCount),
      estimated_cost_per_serving: estimatedCostPerServing,
      total_meals: totalMeals,
      savings_estimate: 0,
      why_this_plan: parsed.why_this_plan ?? {},
      plan_data: { engine: "hybrid_v1", ...normalized, why_this_plan: parsed.why_this_plan ?? {} },
      status: "active",
    }).select().single();
    if (planErr) {
      await failJob("database_insert_failed", planErr.message, { table: "meal_plans" });
      return new Response(JSON.stringify(structuredError("database_insert_failed", planErr.message, { job_id: jobId })), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const planId = planRow.id;
    await advance("done", "meal_plan saved", "Finalizing your plan", { meal_plan_id: planId });

    // Persist days + meals + recipe_usage
    const usageRows: any[] = [];
    const usedRecipeIds: string[] = [];
    for (let i = 0; i < resolvedDays.length; i++) {
      const day = resolvedDays[i];
      const { data: dayRow, error: dayErr } = await admin.from("meal_plan_days").insert({
        meal_plan_id: planId, user_id: userId, day_name: day.day_name, sort_order: i,
      }).select().single();
      if (dayErr) {
        await failJob("database_insert_failed", dayErr.message, { table: "meal_plan_days" });
        return new Response(JSON.stringify(structuredError("database_insert_failed", dayErr.message, { job_id: jobId })), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      for (const meal of day.meals) {
        const r = meal.recipe;
        const costForMeal = r.cost_per_serving ? Number(r.cost_per_serving) * householdSize : null;
        const { data: mealRow, error: mealErr } = await admin.from("meal_plan_meals").insert({
          meal_plan_id: planId,
          day_id: dayRow.id,
          user_id: userId,
          meal_type: meal.meal_type,
          meal_name: r.title,
          description: r.description,
          recipe_id: r.id,
          image_url: r.image_url,
          estimated_cost: costForMeal,
          estimated_cost_per_serving: r.cost_per_serving,
          calories_estimate: r.calories,
          protein_estimate: r.protein_g,
          prep_time_minutes: r.prep_time_minutes,
          cook_time_minutes: r.cook_time_minutes,
          instructions: Array.isArray(r.instructions) ? r.instructions : [],
        }).select().single();
        if (mealErr) {
          await failJob("database_insert_failed", mealErr.message, { table: "meal_plan_meals" });
          return new Response(JSON.stringify(structuredError("database_insert_failed", mealErr.message, { job_id: jobId })), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // meal_ingredients
        const ings = Array.isArray(r.ingredients) ? r.ingredients : [];
        const ingRows = ings.filter((s: any) => typeof s === "string").map((raw: string) => {
          const p = parseIngredientString(raw);
          const alreadyHave = pantryHas(p.normalized, pantryNormalized) || STAPLE_KEYWORDS.some((s) => p.normalized.includes(s));
          return {
            meal_id: mealRow.id,
            user_id: userId,
            item_name: p.item || p.display,
            quantity: p.quantity || "1",
            unit: null,
            source: alreadyHave ? "pantry" : "purchase",
            already_have: alreadyHave,
            instacart_search_term: p.item,
          };
        });
        if (ingRows.length) {
          const { error: ingErr } = await admin.from("meal_ingredients").insert(ingRows);
          if (ingErr) console.error("[generate-meal-plan] meal_ingredients insert failed", ingErr);
        }

        usageRows.push({
          user_id: userId,
          recipe_id: r.id,
          meal_plan_id: planId,
          week_start: weekStart,
          meal_type: meal.meal_type,
        });
        usedRecipeIds.push(r.id);
      }
    }
    await advance("done", "meal_plan_meals saved", "Finalizing your plan");

    // recipe_usage + bump times_used
    if (usageRows.length) {
      const { error: usageErr } = await admin.from("recipe_usage").insert(usageRows);
      if (usageErr) console.error("[generate-meal-plan] recipe_usage insert failed", usageErr);
    }
    // Bump times_used in batch
    for (const rid of new Set(usedRecipeIds)) {
      const count = usedRecipeIds.filter((x) => x === rid).length;
      const cur = candidatesById.get(rid)?.times_used ?? 0;
      await admin.from("recipes").update({ times_used: cur + count }).eq("id", rid);
    }

    // grocery_lists + items
    const { data: glRow, error: glErr } = await admin.from("grocery_lists").insert({
      user_id: userId,
      meal_plan_id: planId,
      store_name: mealPlanContext.preferred_store,
      estimated_total: estimatedTotalCost,
      status: "active",
    }).select().single();
    if (glErr) {
      await failJob("grocery_list_failed", glErr.message, { table: "grocery_lists" });
      return new Response(JSON.stringify(structuredError("grocery_list_failed", glErr.message, { job_id: jobId })), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (groceryList.length) {
      const items = groceryList.map((g) => ({
        user_id: userId,
        grocery_list_id: glRow.id,
        meal_plan_id: planId,
        ingredient_name: g.ingredient_name,
        quantity: g.quantity,
        category: g.category,
        store_section: g.category,
        estimated_price: g.estimated_price,
        already_have: g.already_have,
        instacart_search_term: g.instacart_search_term,
        needed_for_meals: g.needed_for_meals,
      }));
      const { error: itemsErr } = await admin.from("grocery_list_items").insert(items);
      if (itemsErr) {
        await failJob("grocery_list_failed", itemsErr.message, { table: "grocery_list_items" });
        return new Response(JSON.stringify(structuredError("grocery_list_failed", itemsErr.message, { job_id: jobId })), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    await advance("done", "grocery list saved", "Finalizing your plan", { grocery_list_id: glRow.id });
    await updateJob(admin, jobId, {
      status: "completed",
      current_stage: "done",
      current_step: "navigate to Meal Plan page",
      completed_steps: [...completedSteps, "navigate to Meal Plan page"],
      status_message: "Your meal plan is ready",
      meal_plan_id: planId,
      completed_at: new Date().toISOString(),
      metadata: {
        grocery_list_id: glRow.id,
        engine: "hybrid_v1",
        library_picks: usedRecipeIds.filter((id) => candidatesById.has(id)).length,
        ai_generated_picks: usedRecipeIds.filter((id) => !candidatesById.has(id)).length,
      },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        job_id: jobId,
        meal_plan_id: planId,
        grocery_list_id: glRow.id,
        ...normalized,
        why_this_plan: parsed.why_this_plan ?? {},
        pricing_disclaimer: "Estimated pricing for planning only. Final pricing and availability are confirmed at Instacart checkout.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("generate-meal-plan error", err);
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function ingredientLine(i: any): string {
  if (typeof i === "string") return i;
  return [i.quantity, i.unit, i.item_name].filter(Boolean).join(" ").trim();
}

function normalizePlanForClient(
  resolvedDays: Array<{ day_name: string; meals: Array<{ meal_type: string; recipe: any }> }>,
  groceryList: any[],
  householdSize: number,
) {
  const weeklyPlan = resolvedDays.map((d) => ({
    day: d.day_name,
    meals: d.meals.map((m) => ({
      type: m.meal_type,
      name: m.recipe.title,
      recipe_id: m.recipe.id,
      image_url: m.recipe.image_url,
      imageUrl: m.recipe.image_url,
      calories: m.recipe.calories ?? 0,
      protein: Number(m.recipe.protein_g) ?? 0,
      carbs: 0,
      fats: 0,
      estimatedCost: m.recipe.cost_per_serving ? Number(m.recipe.cost_per_serving) * householdSize : 0,
      costPerServing: m.recipe.cost_per_serving,
      cookTimeMinutes: (m.recipe.cook_time_minutes ?? 0) + (m.recipe.prep_time_minutes ?? 0),
      ingredients: (Array.isArray(m.recipe.ingredients) ? m.recipe.ingredients : []).map(ingredientLine),
      instructions: Array.isArray(m.recipe.instructions) ? m.recipe.instructions : [],
    })),
  }));

  const groceryListOut = groceryList
    .filter((g) => !g.already_have)
    .map((g) => ({
      name: g.ingredient_name,
      quantity: g.quantity,
      estimatedPrice: g.estimated_price,
      section: g.category,
    }));

  const totalEstimatedCost = groceryListOut.reduce((s, i) => s + i.estimatedPrice, 0);
  const totalMeals = weeklyPlan.reduce((s, d) => s + d.meals.length, 0) || 1;

  return {
    weeklyPlan,
    groceryList: groceryListOut,
    storeRecommendations: [],
    totalEstimatedCost,
    pantrySavings: groceryList.filter((g) => g.already_have).reduce((s, g) => s + g.estimated_price, 0),
    costPerMeal: totalEstimatedCost / totalMeals,
    taxEstimate: 0,
  };
}

function buildServerFallback(daysCount: number, b: any[], l: any[], d: any[]) {
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const days: any[] = [];
  for (let i = 0; i < daysCount; i++) {
    const day: any = { day_name: dayNames[i] || `Day ${i + 1}` };
    if (b[i % b.length]) day.breakfast = { library_recipe_id: b[i % b.length].id };
    if (l[i % l.length]) day.lunch = { library_recipe_id: l[i % l.length].id };
    if (d[i % d.length]) day.dinner = { library_recipe_id: d[i % d.length].id };
    days.push(day);
  }
  return { days, why_this_plan: { summary: "Server-picked from library because AI was unavailable." } };
}
