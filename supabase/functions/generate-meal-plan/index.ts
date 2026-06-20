// Generate weekly meal plan — HYBRID engine.
// Flow: library candidate pool → AI ranks/assigns → AI creates only as fallback.
// Server is the source of truth for meal data, cost, ingredients, and grocery list.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { loadChannelConfig, computeChannelTotals, PACKAGE_WASTE_MULTIPLIER, normalizeStoreCode } from "../_shared/cartCosting.ts";
import { priceBasketWithKroger, getUserKrogerLocation } from "../_shared/krogerPricing.ts";

import { captureEdgeError } from "../_shared/sentry.ts";
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
  | "grocery_list_failed"
  | "budget_unfit"
  | "kid_friendly_unfit"
  | "serving_size_invalid"
  | "grocery_list_invalid";

// =========================================================
// Phase A (algo_v2) — deterministic budget engine constants.
// Soft scoring targets + running monitor; final hard gate stays at
// total <= weeklyBudget so we never accept an actual over-budget plan.
// =========================================================
const TARGET_BUDGET_RATIO = 0.95;
const MEAL_BUDGET_SPLIT = { breakfast: 0.25, lunch: 0.30, dinner: 0.35, snacks: 0.10 } as const;
const CANDIDATE_POOL_SIZE = 30;
const SNACK_POOL_SIZE = 15;
const LOW_KROGER_CONFIDENCE_RATIO = 0.4; // >40% low-confidence lines → warn

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
- The user's "dietary_preferences" array is BINDING and hard-enforced for: vegan, vegetarian, pescatarian, gluten-free, dairy-free, nut-free, keto, paleo, halal, kosher. "vegan" = NO meat/poultry/fish/seafood/eggs/dairy/honey/gelatin. "vegetarian" = NO meat/poultry/fish/seafood/gelatin. "pescatarian" = NO meat or poultry. "gluten-free" = NO wheat/flour/bread/pasta/barley/rye/soy sauce. "dairy-free" = NO milk/cheese/butter/yogurt/cream/whey. "halal" = NO pork or alcohol. "kosher" = NO pork or shellfish.
- You MUST output exactly 3 meals for every day: breakfast, lunch, AND dinner. Never skip a slot. If no candidate fits, return a safe new_meal for that slot.
- If a recipe's title, description, or any ingredient could violate these rules, SKIP IT. Better to return a safe new_meal than to harm the user.

OTHER RULES:
- PREFER library recipes. For each meal slot, choose a recipe from candidates_<meal_type> by returning its library_recipe_id.
- Vary protein/cuisine across the week — don't pick the same recipe twice.
- Only create a new_meal when NO candidate fits the user's dietary/allergy needs. New meals must include meal_name, description, short ingredients list, instructions, cost_per_serving estimate, prep/cook minutes — and must also follow every allergy and dietary rule above.
- Prioritize candidates that use ingredients the user already has (pantry/fridge), especially expiring_today or use_soon items.
- NEVER recommend expired ingredients.
- Stay within the weekly grocery budget.

FAMILY & CHILD RULES (binding):
- "household.adults_count", "household.children_ages_5_to_12", "household.babies_under_5" are present in the context. Servings must be sized for adults_count + children_5_to_12 (toddlers eat from the same pot at reduced portions).
- If children_5_to_12 > 0, AT LEAST 3 of the 21 meals across the week MUST be classic kid-friendly: chicken tacos, pasta dishes, breakfast burritos, rice bowls, sheet pan meals, mac & cheese, quesadillas, meatballs. Note this in the meal "reason".
- If babies_under_5 > 0, the new_meal you create may NOT rely on hard-to-chew or choking-hazard whole foods (whole nuts, popcorn, whole grapes, large meat chunks).

COOKING SKILL RULES (binding):
- "cooking_confidence" is one of: beginner, intermediate, advanced.
- beginner: every meal must be ≤8 ingredients total, prep+cook ≤30 min, instructions ≤6 steps, no specialty techniques.
- intermediate: ≤12 ingredients, prep+cook ≤45 min.
- advanced: no restriction.

RECIPE OUTPUT RULES (binding):
- For every new_meal, "instructions" MUST be a non-empty array of HIGHLY DETAILED step-by-step cooking actions written for someone who has never cooked the dish before. Every step is one numbered action and MUST include:
  * The pan/pot/tool to use ("12-inch nonstick skillet", "medium saucepan", "sheet pan lined with parchment").
  * The exact heat level ("medium-high heat", "350°F / 175°C oven").
  * The exact time range ("cook 4–5 minutes per side", "simmer uncovered 12 minutes", "bake 18 minutes").
  * The visual or sensory doneness cue ("until golden brown and fragrant", "until internal temp reaches 165°F", "until liquid has reduced by half", "until edges curl and bottom is set").
  * Any seasoning amounts ("½ tsp salt", "1 tbsp olive oil") whenever an ingredient is added.
- Minimum 6 steps, target 8–12 steps. Include prep steps (washing, chopping with sizes like "¼-inch dice"), the cooking sequence, a doneness check, and a plating/serving step. Never produce vague steps like "cook until done" or "combine and serve" — always state the temperature, time, and visual cue.
- Include prep_time_minutes and cook_time_minutes for every new_meal.
- Always include calories_estimate, protein_estimate (g), carbs_estimate (g), and fat_estimate (g) per serving for every new_meal based on the recipe's ingredients and portion size. Be realistic, not round numbers.

- Use "budget_reference" as planning guidance: tier_weekly_plan shows a proven $X/week sample plan for this household, cheap_meal_ideas lists low-cost vetted meals, budget_staples lists high-protein-per-dollar pantry foods, and budget_food_items lists cheap ingredients. Prefer ingredients/meals that appear there. Treat all listed prices as ESTIMATES, not exact store prices.
- When creating a new_meal, build it from budget_staples + budget_food_items and keep cost_per_serving near the cheap_meal_ideas range.
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
            carbs_estimate: { type: "number" },
            fat_estimate: { type: "number" },
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

// Choking-hazard terms for households with children under 5. Applied as
// additional safety terms to the existing recipeContainsAny filter so they
// scope BOTH library candidates and AI-authored new_meal entries.
export const TODDLER_CHOKING_HAZARDS = [
  "whole nuts", "peanuts", "almonds", "walnuts", "pecans", "cashews", "pistachios", "hazelnuts",
  "popcorn", "whole grapes", "grapes", "hard candy", "candy", "gum", "marshmallows",
  "hot dog", "hot dogs", "raw carrots", "whole olives", "cherry tomatoes",
  "chunks of meat", "beef chunks", "steak chunks", "sausage rounds", "sausage coins",
  "sunflower seeds", "pumpkin seeds",
];

const KID_FRIENDLY_KEYWORDS = [
  "mac and cheese", "mac & cheese", "macaroni", "pasta", "spaghetti", "lasagna", "ravioli",
  "taco", "tacos", "quesadilla", "quesadillas", "burrito", "burritos",
  "pizza", "chicken nugget", "nuggets", "tender", "tenders", "meatball", "meatballs",
  "grilled cheese", "sloppy joe", "sheet pan", "rice bowl", "chicken and rice",
  "fried rice", "stir fry", "pancake", "waffle", "french toast", "oatmeal",
  "breakfast burrito", "mini pizza", "scrambled egg",
];

export function isKidFriendlyRecipe(recipe: any): boolean {
  if (recipe?.kid_friendly === true) return true;
  if (recipe?.family_friendly === true) return true;
  const tags = Array.isArray(recipe?.tags) ? recipe.tags.map((t: any) => String(t).toLowerCase()) : [];
  if (tags.some((t: string) => t.includes("kid") || t === "family-friendly" || t === "family_friendly")) return true;
  const text = `${recipe?.title ?? ""} ${recipe?.description ?? ""}`.toLowerCase();
  return KID_FRIENDLY_KEYWORDS.some((k) => text.includes(k));
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

    // Rate limit: 3 full meal-plan generations per user per hour. Each run
    // hits OpenAI + a basket of live Kroger product searches, so we cap hard
    // to keep cost predictable and prevent accidental loops.
    // fail-closed: if the limiter RPC itself errors, reject with 429 rather
    // than let the most expensive endpoint flood the DB during pressure.
    const rl = await enforceRateLimit({
      admin,
      userId,
      endpoint: "generate-meal-plan",
      maxPerHour: 3,
      corsHeaders,
      failClosed: true,
    });
    if (rl) return rl;

    const body = await req.json().catch(() => ({}));
    const overrides: Overrides = body.overrides ?? body ?? {};

    // Engine selection — flag-driven from the client (PostHog
    // `new-meal-plan-algorithm`). Default and unknown values → hybrid_v1
    // so a flag outage cannot route traffic to the new path.
    const requestedEngine = (body?.overrides?.algorithmVersion ?? body?.algorithmVersion) as string | undefined;
    const engine: "hybrid_v1" | "algo_v2" = requestedEngine === "algo_v2" ? "algo_v2" : "hybrid_v1";

    const { data: jobRow, error: jobErr } = await admin
      .from("meal_plan_generation_jobs")
      .insert({
        user_id: userId,
        status: "processing",
        current_stage: "preparing",
        current_step: BACKEND_STEPS.preparing[0],
        status_message: "Reviewing your profile & pantry",
        metadata: { source: "generate-meal-plan", engine },
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

    const [profileRes, pantryRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("pantry_items").select("*").eq("user_id", userId),
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

    // Phase A: split into pantry / fridge / freezer / expiring buckets.
    // Freezer items count as $0 owned (treated like pantry) for the optimizer.
    const fridgeItems = pantryItems.filter((i) => i.location === "fridge");
    const freezerItems = pantryItems.filter((i) => i.location === "freezer");
    const pantryOnly = pantryItems.filter((i) => i.location !== "fridge" && i.location !== "freezer");
    const expiringSoon = pantryItems.filter((i) => ["expiring_today", "use_soon"].includes(i.freshness_status));
    const expired = pantryItems.filter((i) => i.freshness_status === "expired");
    const pantryNormalized = new Set(pantryItems.map((i) => i.normalized_name).filter(Boolean));
    // Kroger home store from profiles (single source of truth used by live pricing).
    const krogerLocationId: string | null = (profile as any).kroger_location_id ?? null;
    const krogerStoreName: string | null = (profile as any).kroger_store_name ?? null;

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
    // 7 days × 3 meals (breakfast/lunch/dinner) is the contract. Snack only
    // if delivered total stays ≤90% of budget after the 3 meals are placed.
    const daysCount = 7;
    const mealCount = overrides.meal_count ?? daysCount * 3;
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

    // Fetch candidate pool per meal type. Phase A: snack supported, pool size 30 (15 for snacks),
    // and recipes.is_active is a HARD filter.
    async function fetchCandidates(mealType: "breakfast" | "lunch" | "dinner" | "snack"): Promise<any[]> {
      const isSnack = mealType === "snack";
      const limit = isSnack ? SNACK_POOL_SIZE : CANDIDATE_POOL_SIZE;
      // Pull a broad pool; we'll filter dietary/budget client-side for flexibility.
      // is_active is filtered server-side so inactive recipes never reach the optimizer.
      const { data, error } = await admin
        .from("recipes")
        .select("id, title, description, meal_type, cost_per_serving, budget_tier, serving_size, calories, protein_g, carbs_g, fats_g, fiber_g, sodium_mg, kid_friendly, is_active, ingredients, instructions, image_url, tags, prep_time_minutes, cook_time_minutes, avg_rating, times_used, source, created_by_user_id")
        .eq("meal_type", mealType)
        .eq("is_active", true)
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

      return pool.slice(0, limit);
    }

    const [breakfastCandidates, lunchCandidates, dinnerCandidates, snackCandidates] = await Promise.all([
      fetchCandidates("breakfast"),
      fetchCandidates("lunch"),
      fetchCandidates("dinner"),
      fetchCandidates("snack"),
    ]);

    await advance("preparing", "recipe candidates fetched", "Picking from your recipe library", {
      breakfast_candidates: breakfastCandidates.length,
      lunch_candidates: lunchCandidates.length,
      dinner_candidates: dinnerCandidates.length,
      snack_candidates: snackCandidates.length,
    });

    const candidatesById = new Map<string, any>();
    for (const r of [...breakfastCandidates, ...lunchCandidates, ...dinnerCandidates, ...snackCandidates]) candidatesById.set(r.id, r);

    // Phase A: load user's favorite recipe ids — gives the optimizer a positive
    // scoring boost beyond the recently-eaten-unless-favorited exclusion.
    const favoriteRecipeIds: string[] = ((recentUsage ?? [])
      .filter((r: any) => r.favorited)
      .map((r: any) => r.recipe_id) as string[]).filter(Boolean);

    // Phase A: deterministic budget engine targets — soft scoring + monitor.
    const targetWeeklySpend = weeklyBudget * TARGET_BUDGET_RATIO;
    const dailyBudget = targetWeeklySpend / Math.max(1, daysCount);
    const blDinnerShare = MEAL_BUDGET_SPLIT.breakfast + MEAL_BUDGET_SPLIT.lunch + MEAL_BUDGET_SPLIT.dinner;
    const snackHeadroom = Math.max(0, targetWeeklySpend * MEAL_BUDGET_SPLIT.snacks);
    const budgetTargets = {
      target_weekly_spend: Math.round(targetWeeklySpend * 100) / 100,
      daily_budget: Math.round(dailyBudget * 100) / 100,
      per_meal: {
        breakfast: Math.round((targetWeeklySpend * MEAL_BUDGET_SPLIT.breakfast / daysCount) * 100) / 100,
        lunch: Math.round((targetWeeklySpend * MEAL_BUDGET_SPLIT.lunch / daysCount) * 100) / 100,
        dinner: Math.round((targetWeeklySpend * MEAL_BUDGET_SPLIT.dinner / daysCount) * 100) / 100,
        snacks: Math.round((snackHeadroom / daysCount) * 100) / 100,
      },
      bl_dinner_share: blDinnerShare,
      snack_budget: Math.round(snackHeadroom * 100) / 100,
    };

    // ===== Help The Hive budget reference data =====
    // Tables: cheap_meals, budget_staples, weekly_meal_plans, meal_plan_weekly_totals, budget_food_items.
    // Prices are PLANNING ESTIMATES, not exact store prices. Used to steer the AI toward
    // low-cost, high-protein, family-friendly, shelf-stable, widely available foods.
    function pickPlanTier(budget: number | null | undefined): string {
      const b = Number(budget ?? 0);
      if (b <= 30) return "$25";
      if (b <= 60) return "$50";
      if (b <= 85) return "$75";
      if (b <= 125) return "$100";
      return "$150";
    }
    const planTier = pickPlanTier(weeklyBudget);
    const allergyTermsForBudget = expandAllergies(allergies);
    const dietForbiddenForBudget = forbiddenForDiets(dietaryPrefs);
    const budgetUnsafe = (text: string | null | undefined) => {
      const t = String(text ?? "").toLowerCase();
      if (!t) return false;
      const all = [...allergyTermsForBudget, ...dietForbiddenForBudget];
      return all.some((term) => term && t.includes(term.toLowerCase()));
    };

    const [cheapMealsRes, budgetStaplesRes, tierPlanRes, tierTotalsRes, budgetFoodsRes] = await Promise.all([
      admin.from("cheap_meals")
        .select("meal_name, meal_type, ingredients, cost_per_serving, protein_per_serving_g, calories_per_serving, preparation_time, difficulty, family_friendly, kid_friendly, notes")
        .order("cost_per_serving", { ascending: true })
        .limit(120),
      admin.from("budget_staples")
        .select("food_item, store, cost_per_serving, protein_per_dollar_g, calories_per_dollar, meals_it_can_be_used_in, priority_ranking")
        .order("priority_ranking", { ascending: true })
        .limit(40),
      admin.from("weekly_meal_plans")
        .select("day_of_week, day_order, breakfast, lunch, dinner, snack, daily_cost")
        .eq("plan_tier", planTier)
        .order("day_order", { ascending: true }),
      admin.from("meal_plan_weekly_totals")
        .select("plan_tier, weekly_budget, supports_people, avg_calories_per_person_per_day, protein_g_per_week, calories_per_week, weekly_cost")
        .eq("plan_tier", planTier)
        .maybeSingle(),
      admin.from("budget_food_items")
        .select("food_item, brand, store, category, is_protein, is_vegetable, is_fruit, is_carbohydrate, is_dairy, is_shelf_stable, cost_per_serving, protein_g, calories")
        .order("cost_per_serving", { ascending: true })
        .limit(80),
    ]);

    const cheapMealIdeas = (cheapMealsRes.data ?? [])
      .filter((m: any) => !budgetUnsafe(m.meal_name) && !budgetUnsafe(m.ingredients))
      .slice(0, 40)
      .map((m: any) => ({
        meal_name: m.meal_name,
        meal_type: m.meal_type,
        ingredients_preview: String(m.ingredients ?? "").slice(0, 220),
        cost_per_serving: m.cost_per_serving,
        protein_g: m.protein_per_serving_g,
        calories: m.calories_per_serving,
        prep: m.preparation_time,
        difficulty: m.difficulty,
        family_friendly: m.family_friendly,
        kid_friendly: m.kid_friendly,
      }));

    const budgetStaplesList = (budgetStaplesRes.data ?? [])
      .filter((s: any) => !budgetUnsafe(s.food_item))
      .slice(0, 30)
      .map((s: any) => ({
        food_item: s.food_item,
        store: s.store,
        cost_per_serving: s.cost_per_serving,
        protein_per_dollar_g: s.protein_per_dollar_g,
        calories_per_dollar: s.calories_per_dollar,
        used_in: s.meals_it_can_be_used_in,
      }));

    const tierWeeklyPlan = (tierPlanRes.data ?? []).map((d: any) => ({
      day: d.day_of_week,
      breakfast: d.breakfast,
      lunch: d.lunch,
      dinner: d.dinner,
      snack: d.snack,
      daily_cost: d.daily_cost,
    }));

    const tierTotals = tierTotalsRes.data ?? null;

    const budgetFoodItemsList = (budgetFoodsRes.data ?? [])
      .filter((f: any) => !budgetUnsafe(f.food_item))
      .slice(0, 50)
      .map((f: any) => ({
        food_item: f.food_item,
        brand: f.brand,
        store: f.store,
        category: f.category,
        cost_per_serving: f.cost_per_serving,
        protein_g: f.protein_g,
        calories: f.calories,
        shelf_stable: f.is_shelf_stable,
      }));

    await advance("preparing", "budget reference loaded", "Loading Help The Hive budget guide", {
      plan_tier: planTier,
      cheap_meal_ideas: cheapMealIdeas.length,
      budget_staples: budgetStaplesList.length,
      tier_weekly_plan_days: tierWeeklyPlan.length,
      budget_food_items: budgetFoodItemsList.length,
    });

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
      household: {
        adults_count: Number((profile as any).adults_count ?? Math.max(1, householdSize - Number((profile as any).children_5_to_12 ?? 0) - Number((profile as any).children_under_5 ?? 0))),
        children_5_to_12: Number((profile as any).children_5_to_12 ?? 0),
        babies_under_5: Number((profile as any).children_under_5 ?? 0),
        teenagers: Number((profile as any).teenagers ?? 0),
        seniors_65_plus: Number((profile as any).seniors_65_plus ?? 0),
        children_ages: (profile as any).children_ages ?? [],
      },
      weekly_grocery_budget: weeklyBudget,
      zip_code: profile.zip_code ?? null,
      preferred_store: overrides.store ?? krogerStoreName ?? (profile as any).home_store ?? null,
      dietary_preferences: dietaryPrefs,
      allergies,
      cooking_confidence: profile.cooking_confidence ?? "intermediate",
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
      // Help The Hive budget reference (planning estimates — NOT exact store prices)
      budget_reference: {
        notice: "Prices are PLANNING ESTIMATES, not exact store prices. Prioritize low-cost, high-protein, family-friendly, shelf-stable, widely available foods.",
        plan_tier: planTier,
        tier_totals: tierTotals,
        tier_weekly_plan: tierWeeklyPlan,
        cheap_meal_ideas: cheapMealIdeas,
        budget_staples: budgetStaplesList,
        budget_food_items: budgetFoodItemsList,
      },
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
    let optimizerDebug: any = null;

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
    if (engine === "algo_v2") {
      // ===== algo_v2: deterministic optimizer (no AI for selection) =====
      // Reuses already-loaded candidates + pantry context. Pure function call;
      // no extra network or DB I/O. Same OUTPUT contract as hybrid_v1's
      // `parsed.days`, so the downstream resolver / pricing / save / normalize
      // flow is unchanged.
      await advance("generating", "algo_v2 optimizer started", "Building your weekly meal plan (deterministic)");
      const { runOptimizer } = await import("../_shared/mealPlanOptimizer.ts");
      const DAY_NAMES_V2 = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const slots: Array<{ day_name: string; meal_type: "breakfast" | "lunch" | "dinner" | "snack" }> = [];
      for (let i = 0; i < daysCount; i++) {
        const d = DAY_NAMES_V2[i] || `Day ${i + 1}`;
        for (const mt of ["breakfast", "lunch", "dinner"] as const) slots.push({ day_name: d, meal_type: mt });
      }
      // Phase A snack slots: only allocated when there is budget headroom
      // (snackHeadroom > 0). One snack per day. Snacks remain optional —
      // the optimizer will skip a slot if no feasible/affordable candidate.
      const includeSnacks = snackHeadroom > 0 && snackCandidates.length > 0;
      if (includeSnacks) {
        for (let i = 0; i < daysCount; i++) {
          const d = DAY_NAMES_V2[i] || `Day ${i + 1}`;
          slots.push({ day_name: d, meal_type: "snack" });
        }
      }
      const recentIds = (recentUsage ?? []).map((r: any) => r.recipe_id).filter(Boolean);
      const dislikedTermsV2 = ((profile as any).disliked_foods ?? []).map((s: string) => String(s).toLowerCase()).filter(Boolean);
      const hasToddlerV2 = Number((profile as any).children_under_5 ?? 0) > 0;
      const optResult = runOptimizer({
        candidates: {
          breakfast: breakfastCandidates as any,
          lunch: lunchCandidates as any,
          dinner: dinnerCandidates as any,
          snack: snackCandidates as any,
        },
        pantryItems: pantryOnly as any,
        freezerItems: freezerItems as any,
        expiringSoon: expiringSoon as any,
        profile: {
          household_size: householdSize,
          weekly_budget: weeklyBudget,
          allergies,
          dietary_preferences: dietaryPrefs,
          disliked_foods: dislikedTermsV2,
          children_5_to_12: Number((profile as any).children_5_to_12 ?? 0),
          has_toddler: hasToddlerV2,
          cooking_confidence: (profile as any).cooking_confidence ?? "intermediate",
        },
        recentRecipeIds: recentIds,
        favoriteRecipeIds,
        slots,
        recipeContainsAny: recipeContainsAny as any,
        allergyTerms: expandAllergies(allergies),
        dietForbidden: forbiddenForDiets(dietaryPrefs),
        dislikedTerms: dislikedTermsV2,
        toddlerHazards: TODDLER_CHOKING_HAZARDS,
      });
      parsed = optResult.parsed;
      optimizerDebug = optResult.debug;
      await advance("generating", "algo_v2 optimizer completed", "Building your weekly meal plan", {
        pantry_items_used: optimizerDebug.pantry_items_used,
        expiring_items_used: optimizerDebug.expiring_items_used,
        budget_subtotal: optimizerDebug.budget_subtotal,
        swaps_made: optimizerDebug.swaps_made,
        ai_fill_count: optimizerDebug.ai_fill_count,
      });

      // AI-fill for any slot that had NO feasible candidate. Falls back to the
      // existing safe-staple helper rather than failing — the rest of the
      // pipeline (allergy resolver, budget gate) still runs.
      if (optimizerDebug.unfilled_slots?.length) {
        for (const us of optimizerDebug.unfilled_slots) {
          const day = parsed.days.find((d: any) => d.day_name === us.day_name) ?? { day_name: us.day_name };
          if (!parsed.days.includes(day)) parsed.days.push(day);
          try {
            const ai = await callOpenAI({
              model: "gpt-5.4-mini",
              system: "You are creating ONE compliant recipe for a specific meal slot. Honor allergies, dietary preferences, and disliked foods strictly. Output via the tool.",
              user: `Create a ${us.meal_type} for ${householdSize} servings under $${(weeklyBudget / 21).toFixed(2)}/serving. Allergies: ${allergies.join(", ") || "none"}. Diet: ${dietaryPrefs.join(", ") || "none"}.`,
              tools: [{ type: "function", function: { name: "return_meal", description: "Single recipe", parameters: { type: "object", properties: { meal_name: { type: "string" }, ingredients: { type: "array", items: { type: "string" } }, instructions: { type: "array", items: { type: "string" } }, estimated_cost_per_serving: { type: "number" } }, required: ["meal_name", "ingredients", "instructions"] } } }],
              tool_choice: { type: "function", function: { name: "return_meal" } },
              max_tokens: 800,
              timeout_ms: 30000,
              log: { admin, user_id: userId, request_type: "meal_plan_algo_v2_fill" },
            });
            const nm = ai.tool_arguments as any;
            if (nm?.meal_name) {
              day[us.meal_type] = { new_meal: { ...nm, prep_time_minutes: 10, cook_time_minutes: 20 }, reason: "Generated to fill an empty slot." };
            }
          } catch (e) {
            console.warn("[generate-meal-plan algo_v2] AI fill failed", e);
          }
        }
      }
    } else if (stubAllowed && stubRequested) {
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
    const hasToddler = Number((mealPlanContext as any).household?.babies_under_5 ?? 0) > 0;
    const hasChildren512 = Number((mealPlanContext as any).household?.children_5_to_12 ?? 0) > 0;
    // Toddler safety: applied to BOTH AI new_meal entries AND library candidates
    // by piggy-backing on the existing recipeContainsAny filter.
    const safetyTerms = [
      ...allergyTerms,
      ...dietForbidden,
      ...(hasToddler ? TODDLER_CHOKING_HAZARDS : []),
    ];

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
            // Stash AI-estimated macros not stored in DB columns.
            recipe.carbs_g = nm.carbs_estimate ?? null;
            recipe.fat_g = nm.fat_estimate ?? null;
            recipe.nutrition_source = "ai_estimated";
          }
        } else {
          continue;
        }

        if (!recipe) continue; // no safe substitute available — skip slot rather than serve unsafe food
        if (recipe.id) usedIds.add(recipe.id);
        dayMeals.push({ meal_type: mealType, recipe, reason });
      }
      // Backfill missing meal slots — families need a full 3 meals per day.
      // GUARANTEE: every day ends with breakfast + lunch + dinner. Order of
      // fallbacks: unused safe candidate → reused safe candidate → minimum-
      // portion hardcoded staple meal. We NEVER leave a slot empty.
      const present = new Set(dayMeals.map((m) => m.meal_type));
      for (const mealType of ["breakfast", "lunch", "dinner"] as const) {
        if (present.has(mealType)) continue;
        let fill: any = findSafeCandidate(mealType, usedIds);
        if (!fill) {
          // Allow reusing a previously-placed safe candidate before dropping a meal.
          const pool = mealType === "breakfast" ? breakfastCandidates : mealType === "lunch" ? lunchCandidates : dinnerCandidates;
          fill = pool.find((c: any) => !safetyTerms.length || !recipeContainsAny(c, safetyTerms)) ?? null;
        }
        if (!fill) {
          // No library option fits the safety filters at all — inject a
          // minimum-portion staple meal so the user still gets 3 meals.
          fill = buildMinimumPortionStaple(mealType, allergies, dietaryPrefs);
        }
        if (fill.id) usedIds.add(fill.id);
        dayMeals.push({
          meal_type: mealType,
          recipe: fill,
          reason: "Added at minimum portions to keep your day complete within budget.",
        });
      }
      // Keep meals in canonical breakfast → lunch → dinner order.
      dayMeals.sort((a, b) => {
        const order = { breakfast: 0, lunch: 1, dinner: 2 } as Record<string, number>;
        return (order[a.meal_type] ?? 9) - (order[b.meal_type] ?? 9);
      });
      resolvedDays.push({ day_name: day.day_name || `Day ${resolvedDays.length + 1}`, meals: dayMeals });
    }

    // If the AI returned fewer than `daysCount` days, top up so we always
    // emit a full week of 3 meals/day. Builds each missing day the same way.
    const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    while (resolvedDays.length < daysCount) {
      const dayMeals: any[] = [];
      for (const mealType of ["breakfast", "lunch", "dinner"] as const) {
        let fill: any = findSafeCandidate(mealType, usedIds);
        if (!fill) {
          const pool = mealType === "breakfast" ? breakfastCandidates : mealType === "lunch" ? lunchCandidates : dinnerCandidates;
          fill = pool.find((c: any) => !safetyTerms.length || !recipeContainsAny(c, safetyTerms)) ?? null;
        }
        if (!fill) fill = buildMinimumPortionStaple(mealType, allergies, dietaryPrefs);
        if (fill.id) usedIds.add(fill.id);
        dayMeals.push({ meal_type: mealType, recipe: fill, reason: "Added to complete your week." });
      }
      resolvedDays.push({ day_name: DAY_NAMES[resolvedDays.length] || `Day ${resolvedDays.length + 1}`, meals: dayMeals });
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
      krogerStoreName ??
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

    // Phase A: 3-bucket grocery list. `bucket` ∈ {use_first, already_have, need_to_buy}.
    // use_first  → expiring pantry/fridge/freezer items used by this plan
    // already_have → owned items not expiring ($0)
    // need_to_buy  → everything else, deduped + summed across recipes
    const expiringNormalized = new Set(
      expiringSoon.map((i: any) => i.normalized_name ?? normalizeName(i.item_name ?? "")).filter(Boolean),
    );
    function buildGroceryListAndBasket(days: typeof resolvedDays) {
      const agg = new Map<string, {
        ingredient_name: string;
        quantity: string;
        category: string;
        estimated_price: number;
        already_have: boolean;
        bucket: "use_first" | "already_have" | "need_to_buy";
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
            const isOwned = pantryHas(parsed.normalized, pantryNormalized);
            const isExpiring = isOwned && Array.from(expiringNormalized).some((e) =>
              parsed.normalized.includes(e) || e.includes(parsed.normalized)
            );
            const alreadyHave = isOwned || isStaple;
            const bucket: "use_first" | "already_have" | "need_to_buy" =
              isExpiring ? "use_first" : alreadyHave ? "already_have" : "need_to_buy";
            const category = categorizeIngredient(parsed.item);
            const catAvg = CATEGORY_AVG[category] ?? CATEGORY_AVG.Other;
            const existing = agg.get(parsed.normalized);
            if (existing) {
              if (!existing.needed_for_meals.includes(meal.recipe.title)) {
                existing.needed_for_meals.push(meal.recipe.title);
              }
              // Keep highest priority bucket (use_first > already_have > need_to_buy)
              if (bucket === "use_first") existing.bucket = "use_first";
            } else {
              agg.set(parsed.normalized, {
                ingredient_name: parsed.item || parsed.display,
                quantity: parsed.quantity || "1",
                category,
                estimated_price: Math.round(catAvg * 100) / 100,
                already_have: alreadyHave,
                bucket,
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

    // ===== Channel-aware delivered total (THE budget the user actually pays) =====
    // basket.high is the in-store, per-serving-summed estimate. Real shoppers
    // must buy whole packages and pay Instacart markup + fees. Apply the
    // package-waste multiplier (until package_prices is CSV-seeded), then
    // layer channel markup + fees so the budget cap reflects the actual
    // delivered cart price.
    const channelCfg = await loadChannelConfig(admin, mealPlanContext.preferred_store ?? null, "delivery");
    const inStoreCfg = await loadChannelConfig(admin, mealPlanContext.preferred_store ?? null, "in_store");
    const inStoreSubtotalRaw = basket.high * PACKAGE_WASTE_MULTIPLIER;
    const inStoreTotals = computeChannelTotals(inStoreSubtotalRaw, inStoreCfg);
    const deliveredTotals = computeChannelTotals(inStoreSubtotalRaw, channelCfg);

    // ===== Channel-aware budget repair (final pass) =====
    // We previously repaired against basket.high (in-store). With markup/fees
    // layered on, we may still be over. Run additional swap passes targeting
    // the delivered_total directly.
    let deliveredNow = deliveredTotals.delivered_total;
    const MAX_DELIVERED_REPAIR = 5;
    let deliveredRepairAttempts = 0;
    while (deliveredNow > weeklyBudget && deliveredRepairAttempts < MAX_DELIVERED_REPAIR) {
      deliveredRepairAttempts++;
      const placedCosts: Array<{ di: number; mi: number; meal: any; cost: number }> = [];
      for (let di = 0; di < resolvedDays.length; di++) {
        for (let mi = 0; mi < resolvedDays[di].meals.length; mi++) {
          placedCosts.push({ di, mi, meal: resolvedDays[di].meals[mi], cost: await recipeDbCost(resolvedDays[di].meals[mi].recipe) });
        }
      }
      placedCosts.sort((a, b) => b.cost - a.cost);

      let swapped = false;
      for (const slot of placedCosts) {
        const pool = candidatesByType[slot.meal.meal_type] || [];
        let best: { cand: any; cost: number } | null = null;
        for (const cand of pool) {
          if (usedRecipeIds2.has(cand.id)) continue;
          if (safetyTerms.length && recipeContainsAny(cand, safetyTerms)) continue;
          const candCost = await recipeDbCost(cand);
          if (candCost >= slot.cost) continue;
          if (!best || candCost < best.cost) best = { cand, cost: candCost };
        }
        if (best) {
          const old = resolvedDays[slot.di].meals[slot.mi];
          if (old.recipe?.id) usedRecipeIds2.delete(old.recipe.id);
          usedRecipeIds2.add(best.cand.id);
          resolvedDays[slot.di].meals[slot.mi] = {
            meal_type: old.meal_type,
            recipe: best.cand,
            reason: "Swapped to keep your delivered total within budget (includes Instacart fees).",
          };
          swapped = true;
          break;
        }
      }
      if (!swapped) break;
      const rebuilt = buildGroceryListAndBasket(resolvedDays);
      groceryList = rebuilt.list;
      buyItems = rebuilt.buy;
      basket = await priceBasket(buyItems);
      const newInStore = basket.high * PACKAGE_WASTE_MULTIPLIER;
      const newDelivered = computeChannelTotals(newInStore, channelCfg);
      deliveredNow = newDelivered.delivered_total;
    }

    // Recompute totals once after the repair loop settles
    const finalInStoreSubtotalRaw = basket.high * PACKAGE_WASTE_MULTIPLIER;
    const finalInStoreTotals = computeChannelTotals(finalInStoreSubtotalRaw, inStoreCfg);
    const finalDeliveredTotals = computeChannelTotals(finalInStoreSubtotalRaw, channelCfg);

    // ===== KROGER-PRICED BUDGET ENFORCEMENT =====
    // When the user has connected Kroger and chosen a home store, the Kroger
    // basket subtotal IS the budget the user pays. We run an additional swap
    // loop targeting Kroger subtotal directly. If we cannot fit, we return a
    // budget_unfit error without ever saving an over-budget plan.
    const kroger = await getUserKrogerLocation(admin, userId);
    const requestedPricingMode = (body?.pricingMode === "estimated" || body?.pricing_mode === "estimated")
      ? "estimated"
      : (kroger.connected && kroger.locationId ? "kroger" : "estimated");
    let pricingMode: "kroger" | "estimated" = requestedPricingMode === "kroger" && kroger.connected && kroger.locationId
      ? "kroger"
      : "estimated";

    let krogerSummary: {
      subtotal: number;
      matched_count: number;
      unmatched_count: number;
      location_id: string | null;
      store_name: string | null;
      lines: any[];
    } | null = null;

    if (pricingMode === "kroger" && kroger.locationId) {
      // Kroger pricing is best-effort: any failure (timeout, Kroger API
      // outage, rate limit) MUST NOT fail the whole generation. We fall back
      // to estimated pricing so the user still gets a saved plan.
      try {
        await advance("saving", "kroger pricing requested", "Pulling live Kroger prices");
        // Repair loop kept tight to stay well within edge-function time budget.
        const MAX_KROGER_REPAIR = 2;
        const MAX_CANDIDATES_PER_SLOT = 3;
        // Phase A: pass real per-item quantities (numeric, scaled to household)
        // instead of the previous hardcoded 1. Recipe quantity strings are
        // ingredient-side ("1 lb", "2 cups"); for a basket buy we round up
        // distinct packages required for the household.
        const parseQtyNumeric = (s: string | null | undefined): number => {
          const m = String(s ?? "").match(/([\d.]+)/);
          const n = m ? parseFloat(m[1]) : 1;
          return isFinite(n) && n > 0 ? n : 1;
        };
        const householdQty = Math.max(1, Math.ceil(householdSize / 2));
        let krogerPriced = await priceBasketWithKroger(
          admin, userId, kroger.locationId,
          buyItems.map((b: any) => ({
            name: b.ingredient_name,
            quantity: Math.max(1, Math.ceil(parseQtyNumeric(b.quantity) * householdQty)),
          })),
        );

        for (let attempt = 0; attempt < MAX_KROGER_REPAIR; attempt++) {
          if (krogerPriced.subtotal <= weeklyBudget) break;
          await advance(
            "saving", "kroger budget repair",
            `Adjusting plan to fit your $${weeklyBudget} budget (Kroger subtotal $${krogerPriced.subtotal})`,
            { attempt: attempt + 1, kroger_subtotal: krogerPriced.subtotal, budget: weeklyBudget },
          );

          // Score every placed meal by its Kroger-priced contribution.
          const slotCosts: Array<{ di: number; mi: number; meal: any; cost: number }> = [];
          for (let di = 0; di < resolvedDays.length; di++) {
            for (let mi = 0; mi < resolvedDays[di].meals.length; mi++) {
              const recipe = resolvedDays[di].meals[mi].recipe;
              const ings = Array.isArray(recipe.ingredients) ? recipe.ingredients : [];
              let cost = 0;
              for (const raw of ings) {
                if (typeof raw !== "string") continue;
                const parsed = parseIngredientString(raw);
                if (!parsed.normalized) continue;
                if (pantryHas(parsed.normalized, pantryNormalized)) continue;
                const line = krogerPriced.lines.find((l: any) =>
                  String(l.name).toLowerCase() === String(parsed.item || raw).toLowerCase());
                if (line) cost += Number(line.line_total ?? 0);
              }
              slotCosts.push({ di, mi, meal: resolvedDays[di].meals[mi], cost });
            }
          }
          slotCosts.sort((a, b) => b.cost - a.cost);

          let swapped = false;
          // Only inspect the 3 most expensive slots per attempt to keep the
          // total live-pricing call count bounded.
          for (const slot of slotCosts.slice(0, 3)) {
            const pool = candidatesByType[slot.meal.meal_type] || [];
            const ranked: Array<{ cand: any; dbCost: number }> = [];
            for (const cand of pool) {
              if (usedRecipeIds2.has(cand.id)) continue;
              if (safetyTerms.length && recipeContainsAny(cand, safetyTerms)) continue;
              ranked.push({ cand, dbCost: await recipeDbCost(cand) });
            }
            ranked.sort((a, b) => a.dbCost - b.dbCost);

            let chosen: any | null = null;
            for (const { cand } of ranked.slice(0, MAX_CANDIDATES_PER_SLOT)) {
              const candItems: Array<{ name: string; quantity: number }> = [];
              for (const raw of (Array.isArray(cand.ingredients) ? cand.ingredients : [])) {
                if (typeof raw !== "string") continue;
                const parsed = parseIngredientString(raw);
                if (!parsed.normalized) continue;
                if (pantryHas(parsed.normalized, pantryNormalized)) continue;
                candItems.push({ name: parsed.item || raw, quantity: 1 });
              }
              const candKroger = candItems.length
                ? await priceBasketWithKroger(admin, userId, kroger.locationId, candItems)
                : { subtotal: 0 } as any;
              if (candKroger.subtotal < slot.cost * 0.95) {
                chosen = cand;
                break;
              }
            }
            if (!chosen) continue;
            const old = resolvedDays[slot.di].meals[slot.mi];
            if (old.recipe?.id) usedRecipeIds2.delete(old.recipe.id);
            usedRecipeIds2.add(chosen.id);
            resolvedDays[slot.di].meals[slot.mi] = {
              meal_type: old.meal_type, recipe: chosen,
              reason: "Swapped to fit your Kroger-priced weekly budget.",
            };
            swapped = true;
            break;
          }
          if (!swapped) break;

          const rebuilt = buildGroceryListAndBasket(resolvedDays);
          groceryList = rebuilt.list;
          buyItems = rebuilt.buy;
          basket = await priceBasket(buyItems);
          krogerPriced = await priceBasketWithKroger(
            admin, userId, kroger.locationId,
            buyItems.map((b: any) => ({
              name: b.ingredient_name,
              quantity: Math.max(1, Math.ceil(parseQtyNumeric(b.quantity) * householdQty)),
            })),
          );
        }

        krogerSummary = {
          subtotal: krogerPriced.subtotal,
          matched_count: krogerPriced.matched_count,
          unmatched_count: krogerPriced.unmatched_count,
          location_id: kroger.locationId,
          store_name: kroger.storeName,
          lines: krogerPriced.lines,
          // Phase A: confidence summary surfaced for the client analytics event
          // `kroger_price_match_completed`. Warn (not fail) when too many
          // matches are low-confidence.
          avg_match_confidence: (krogerPriced as any).avg_match_confidence ?? 0,
          low_confidence_count: (krogerPriced as any).low_confidence_count ?? 0,
        };

        // HARD GATE: if Kroger subtotal still exceeds budget, refuse to save.
        if (krogerPriced.subtotal > weeklyBudget) {
          const friendly =
            "We couldn't build a meal plan within your budget yet. Try increasing your budget, reducing meal variety, or using more pantry items.";
          await failJob("budget_unfit", friendly, {
            kroger_subtotal: krogerPriced.subtotal,
            weekly_budget: weeklyBudget,
            unmatched_count: krogerPriced.unmatched_count,
          });
          return new Response(
            JSON.stringify(structuredError("budget_unfit", friendly, {
              job_id: jobId,
              kroger_subtotal: krogerPriced.subtotal,
              weekly_budget: weeklyBudget,
            })),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
          );
        }
      } catch (krogerErr) {
        // Kroger live pricing failed — degrade gracefully to estimated pricing
        // so the user always gets a saved plan instead of a hard error.
        console.warn(
          "[generate-meal-plan] Kroger pricing failed, falling back to estimated:",
          (krogerErr as Error)?.message ?? krogerErr,
        );
        // Phase A (Part O): capture genuine Kroger failures to Sentry with a
        // scoped tag, so on-call can distinguish them from expected outcomes.
        try { captureEdgeError(krogerErr, { fn: "generate-meal-plan/kroger_pricing" }); } catch { /* noop */ }
        pricingMode = "estimated";
        krogerSummary = null;
        await advance(
          "saving", "kroger pricing fallback",
          "Kroger pricing unavailable right now — using estimated pricing for this plan.",
          { reason: (krogerErr as Error)?.message ?? "unknown" },
        );
      }
    }

    // ===== KID-FRIENDLY VALIDATION =====
    // If the household has children 5–12, at least 3 of the week's meals MUST
    // be kid-friendly. Repair by swapping non-kid-friendly slots with unused
    // kid-friendly candidates of the same meal_type. If we still cannot reach
    // 3, refuse to save the plan with a friendly validation error.
    if (hasChildren512) {
      const MIN_KID_FRIENDLY = 3;
      const countKf = () =>
        resolvedDays.reduce(
          (s, d) => s + d.meals.filter((m) => isKidFriendlyRecipe(m.recipe)).length,
          0,
        );
      let kfCount = countKf();
      if (kfCount < MIN_KID_FRIENDLY) {
        outer: for (let attempt = 0; attempt < MIN_KID_FRIENDLY * 2 && kfCount < MIN_KID_FRIENDLY; attempt++) {
          for (let di = 0; di < resolvedDays.length; di++) {
            for (let mi = 0; mi < resolvedDays[di].meals.length; mi++) {
              const slot = resolvedDays[di].meals[mi];
              if (isKidFriendlyRecipe(slot.recipe)) continue;
              const pool = candidatesByType[slot.meal_type] || [];
              const kfCand = pool.find((c: any) =>
                !usedRecipeIds2.has(c.id) &&
                (!safetyTerms.length || !recipeContainsAny(c, safetyTerms)) &&
                isKidFriendlyRecipe(c)
              );
              if (!kfCand) continue;
              if (slot.recipe?.id) usedRecipeIds2.delete(slot.recipe.id);
              usedRecipeIds2.add(kfCand.id);
              resolvedDays[di].meals[mi] = {
                meal_type: slot.meal_type,
                recipe: kfCand,
                reason: "Swapped in a kid-friendly meal for your family.",
              };
              kfCount = countKf();
              if (kfCount >= MIN_KID_FRIENDLY) break outer;
            }
          }
        }
      }
      if (kfCount < MIN_KID_FRIENDLY) {
        const friendly =
          "We couldn't find enough kid-friendly meals for your family this week. Try broadening your dietary preferences or increasing your budget.";
        await failJob("kid_friendly_unfit" as any, friendly, {
          kid_friendly_count: kfCount,
          required: MIN_KID_FRIENDLY,
        });
        return new Response(
          JSON.stringify(structuredError("kid_friendly_unfit" as any, friendly, {
            job_id: jobId,
            kid_friendly_count: kfCount,
            required: MIN_KID_FRIENDLY,
          })),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }



    // ===== INSTRUCTION ENFORCEMENT =====
    // Every meal MUST have detailed step-by-step instructions. Backfill stubs
    // with a richer scaffold than "combine and serve".
    for (const day of resolvedDays) {
      for (const m of day.meals) {
        const r = m.recipe;
        const instr = Array.isArray(r.instructions) ? r.instructions.filter((s: any) => typeof s === "string" && s.trim()) : [];
        if (instr.length < 4) {
          r.instructions = [
            "Gather all ingredients and measure them out before you start cooking (this is called 'mise en place' and prevents mistakes).",
            "Wash and chop any vegetables into uniform ¼-inch pieces so they cook evenly.",
            "Heat a 12-inch nonstick skillet or appropriately sized pot over medium heat for 1–2 minutes until warm.",
            "Add 1 tablespoon of oil and any aromatics (onion, garlic). Cook 2–3 minutes, stirring often, until softened and fragrant.",
            "Add your main protein. Cook 4–6 minutes, turning once, until browned on the outside and cooked through (internal temp 165°F for poultry, 145°F for fish, no pink for ground meat).",
            "Add remaining vegetables and seasonings (½ tsp salt, ¼ tsp pepper to start). Stir and cook 3–5 minutes until vegetables are tender-crisp.",
            "Add any liquids or sauces. Bring to a gentle simmer and cook 5–8 minutes until the sauce thickens and coats the back of a spoon.",
            "Taste and adjust seasoning. Plate and serve warm, garnishing with fresh herbs if desired.",
          ];
        } else {
          r.instructions = instr;
        }
      }
    }


    const overBudgetAfterAdjust = finalDeliveredTotals.delivered_total > weeklyBudget;
    let budgetWarningText: string | null = null;
    if (overBudgetAfterAdjust) {
      const shortfall = Math.ceil(finalDeliveredTotals.delivered_total - weeklyBudget);
      budgetWarningText = `This budget covers reduced portions; consider adding $${shortfall} for full portions delivered with Instacart fees.`;
    }

    // Phase A (Part K): apply budget_unfit gate on the ESTIMATED path too.
    // Previously only the Kroger path hard-failed; the estimated path merely
    // warned and saved an over-budget plan. Now any over-budget result on
    // either path returns the same structured error (HTTP 200) before save.
    if (overBudgetAfterAdjust && pricingMode === "estimated") {
      const friendly =
        "We couldn't build a meal plan within your budget yet. Try increasing your budget, reducing meal variety, or using more pantry items.";
      await failJob("budget_unfit", friendly, {
        delivered_total: finalDeliveredTotals.delivered_total,
        weekly_budget: weeklyBudget,
        pricing_mode: pricingMode,
      });
      return new Response(
        JSON.stringify(structuredError("budget_unfit", friendly, {
          job_id: jobId,
          delivered_total: finalDeliveredTotals.delivered_total,
          weekly_budget: weeklyBudget,
          pricing_mode: pricingMode,
        })),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Persist the DELIVERED total — what the user actually pays at checkout —
    // as the headline cost. UI/Budget/Remaining math is computed against it.
    const estimatedTotalCost = finalDeliveredTotals.delivered_total;
    const estimatedTotalLow = finalInStoreTotals.delivered_total; // in-store = no fees/markup
    const estimatedTotalAvg = Math.round(((estimatedTotalLow + estimatedTotalCost) / 2) * 100) / 100;
    const totalMeals = resolvedDays.reduce((s, d) => s + d.meals.length, 0);
    const estimatedCostPerServing = totalMeals > 0 ? estimatedTotalCost / (totalMeals * householdSize) : 0;

    await advance("saving", "grocery_list_items generated", "Pricing your grocery list", {
      grocery_items_count: groceryList.length,
      unmatched_price_items: basket.unmatched,
    });
    await advance("saving", "estimated totals calculated", "Pricing your grocery list", {
      delivered_total: estimatedTotalCost,
      in_store_subtotal: finalDeliveredTotals.in_store_subtotal,
      item_markup: finalDeliveredTotals.item_markup,
      service_fee: finalDeliveredTotals.service_fee,
      delivery_fee: finalDeliveredTotals.delivery_fee,
      tip: finalDeliveredTotals.tip,
      tax: finalDeliveredTotals.tax,
      budget_exceeded: overBudgetAfterAdjust,
      top_cost_drivers: basket.drivers,
    });

    // ===== Persist meal_plan =====
    const weekStart = new Date().toISOString().slice(0, 10);
    const normalized = normalizePlanForClient(resolvedDays, groceryList, householdSize);
    // Expose budget context + full delivered breakdown to the client.
    (normalized as any).weeklyBudget = weeklyBudget;
    (normalized as any).budgetRemaining = Math.max(0, Math.round((weeklyBudget - estimatedTotalCost) * 100) / 100);
    (normalized as any).budgetExceeded = overBudgetAfterAdjust;
    (normalized as any).budgetWarningText = budgetWarningText;
    (normalized as any).estimateLow = estimatedTotalLow;
    (normalized as any).estimateAvg = estimatedTotalAvg;
    (normalized as any).estimateHigh = estimatedTotalCost;
    (normalized as any).topCostDrivers = basket.drivers;
    (normalized as any).unmatchedPriceItems = basket.unmatched;
    (normalized as any).totalEstimatedCost = estimatedTotalCost; // override to delivered
    (normalized as any).channel = "delivery";
    (normalized as any).channelBreakdown = {
      channel: "delivery",
      store: finalDeliveredTotals.store,
      in_store_subtotal: finalDeliveredTotals.in_store_subtotal,
      item_markup: finalDeliveredTotals.item_markup,
      service_fee: finalDeliveredTotals.service_fee,
      delivery_fee: finalDeliveredTotals.delivery_fee,
      bag_fee: finalDeliveredTotals.bag_fee,
      tip: finalDeliveredTotals.tip,
      tax: finalDeliveredTotals.tax,
      delivered_total: finalDeliveredTotals.delivered_total,
      in_store_only_total: finalInStoreTotals.delivered_total,
      as_of_date: finalDeliveredTotals.as_of_date,
    };
    (normalized as any).pricingMode = pricingMode;
    (normalized as any).krogerPricing = krogerSummary;
    (normalized as any).krogerConnected = kroger.connected;
    (normalized as any).krogerStoreName = kroger.storeName;
    (normalized as any).pricingAccuracyReduced = pricingMode === "estimated";




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
      plan_data: { engine, ...normalized, why_this_plan: parsed.why_this_plan ?? {} },
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

    // Persist channel-aware cost breakdown — one row per generated plan.
    await admin.from("meal_plan_cost_breakdown").insert({
      meal_plan_id: planId,
      user_id: userId,
      channel: "delivery",
      store: finalDeliveredTotals.store,
      zip_code: mealPlanContext.zip_code,
      in_store_subtotal: finalDeliveredTotals.in_store_subtotal,
      item_markup: finalDeliveredTotals.item_markup,
      service_fee: finalDeliveredTotals.service_fee,
      delivery_fee: finalDeliveredTotals.delivery_fee,
      bag_fee: finalDeliveredTotals.bag_fee,
      tip: finalDeliveredTotals.tip,
      tax: finalDeliveredTotals.tax,
      delivered_total: finalDeliveredTotals.delivered_total,
      budget: weeklyBudget,
      remaining: Math.max(0, Math.round((weeklyBudget - finalDeliveredTotals.delivered_total) * 100) / 100),
      budget_exceeded: overBudgetAfterAdjust,
      warning_text: budgetWarningText,
      pantry_savings: (normalized as any).pantrySavings ?? 0,
      line_items: groceryList.map((g) => ({
        name: g.ingredient_name,
        category: g.category,
        quantity: g.quantity,
        estimated_price: g.estimated_price,
        already_have: g.already_have,
      })),
    });

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
          // Phase A (Part M): persist the full macro set (backend storage only;
          // UI does not surface macros today). carbs_g / fat_g / fiber_g may
          // come from library recipes or AI new_meal estimates.
          carbs_estimate: r.carbs_g ?? null,
          fats_estimate: r.fats_g ?? r.fat_g ?? null,
          fiber_estimate: r.fiber_g ?? null,
          sodium_estimate: r.sodium_mg ?? null,
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

        if (r.id) {
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
        // Phase A: encode bucket into store_section as "<bucket>:<category>"
        // so the UI can group without a new column. Falls back to category
        // when bucket is missing (no-bucket plan_data backfill).
        store_section: `${(g as any).bucket ?? (g.already_have ? "already_have" : "need_to_buy")}:${g.category}`,
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
        engine,
        library_picks: usedRecipeIds.filter((id) => candidatesById.has(id)).length,
        ai_generated_picks: usedRecipeIds.filter((id) => !candidatesById.has(id)).length,
        ...(optimizerDebug ? { optimizer: optimizerDebug } : {}),
      },
    });

    // Phase A (Part N): surface data the client needs to emit PostHog events
    // (recipe_candidates_filtered, kroger_price_match_completed,
    // meal_plan_validation_passed, meal_plan_over_budget_corrected,
    // grocery_list_generated). All events go through trackEvent so opt-out
    // is honored. The server emits no events itself.
    const eventData = {
      algorithm_version: engine,
      candidates_filtered: {
        breakfast: breakfastCandidates.length,
        lunch: lunchCandidates.length,
        dinner: dinnerCandidates.length,
        snack: snackCandidates.length,
      },
      kroger_match: krogerSummary
        ? {
          matched: krogerSummary.matched_count,
          unmatched: krogerSummary.unmatched_count,
          avg_confidence: (krogerSummary as any).avg_match_confidence ?? null,
          low_confidence: (krogerSummary as any).low_confidence_count ?? null,
        }
        : null,
      kroger_confidence_warning: krogerSummary
        ? ((krogerSummary as any).low_confidence_count ?? 0) /
            Math.max(1, krogerSummary.matched_count) > LOW_KROGER_CONFIDENCE_RATIO
        : false,
      budget: {
        targets: budgetTargets,
        delivered_total: estimatedTotalCost,
        weekly: weeklyBudget,
        over_budget: overBudgetAfterAdjust,
      },
      swaps_made: optimizerDebug?.swaps_made ?? null,
      pantry_utilization_pct: optimizerDebug?.pantry_utilization_pct ?? null,
      grocery_items: groceryList.length,
      validation_passed: true,
    };

    return new Response(
      JSON.stringify({
        ok: true,
        job_id: jobId,
        meal_plan_id: planId,
        grocery_list_id: glRow.id,
        ...normalized,
        why_this_plan: parsed.why_this_plan ?? {},
        event_data: eventData,
        pricing_disclaimer: pricingMode === "kroger"
          ? "Prices reflect live Kroger pricing for your home store. Final pricing is confirmed at checkout."
          : "Estimated pricing for planning only. Connect Kroger for live store pricing.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    try { captureEdgeError(err, { fn: "generate-meal-plan" }); } catch { /* noop */ }
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
      calories: Number(m.recipe.calories) || 0,
      protein: Number(m.recipe.protein_g) || 0,
      carbs: Number(m.recipe.carbs_g) || 0,
      fats: Number(m.recipe.fat_g) || 0,
      nutritionVerified: m.recipe.nutrition_source !== "ai_estimated" && (m.recipe.source ?? "library") !== "ai_generated",
      estimatedCost: m.recipe.cost_per_serving ? Number(m.recipe.cost_per_serving) * householdSize : 0,
      costPerServing: m.recipe.cost_per_serving,
      cookTimeMinutes: (m.recipe.cook_time_minutes ?? 0) + (m.recipe.prep_time_minutes ?? 0),
      ingredients: (Array.isArray(m.recipe.ingredients) ? m.recipe.ingredients : []).map(ingredientLine),
      instructions: Array.isArray(m.recipe.instructions) ? m.recipe.instructions : [],
    })),
  }));

  // Phase A (Part L): expose `bucket` on every grocery line so the UI can
  // render Use First / Already Have / Need To Buy sections. Need-to-buy
  // items remain the only ones counted toward totalEstimatedCost.
  const groceryListOut = groceryList.map((g) => ({
    name: g.ingredient_name,
    quantity: g.quantity,
    estimatedPrice: g.estimated_price,
    section: g.category,
    bucket: (g as any).bucket ?? (g.already_have ? "already_have" : "need_to_buy"),
    alreadyHave: g.already_have,
  }));
  const needToBuy = groceryListOut.filter((g) => g.bucket === "need_to_buy");
  const totalEstimatedCost = needToBuy.reduce((s, i) => s + i.estimatedPrice, 0);
  const totalMeals = weeklyPlan.reduce((s, d) => s + d.meals.length, 0) || 1;

  return {
    weeklyPlan,
    groceryList: groceryListOut,
    groceryBuckets: {
      use_first: groceryListOut.filter((g) => g.bucket === "use_first").length,
      already_have: groceryListOut.filter((g) => g.bucket === "already_have").length,
      need_to_buy: needToBuy.length,
    },
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

// ============================================================
// buildMinimumPortionStaple — last-resort safe meal so we NEVER drop a slot.
// Uses calorie-dense, allergy/diet-aware staples. Returns a recipe-shaped
// object compatible with the rest of the pipeline (no DB row created).
// ============================================================
function buildMinimumPortionStaple(
  mealType: "breakfast" | "lunch" | "dinner",
  allergies: string[],
  dietaryPrefs: string[],
): any {
  const a = (allergies || []).map((x) => (x || "").toLowerCase());
  const d = (dietaryPrefs || []).map((x) => (x || "").toLowerCase());
  const hasAllergy = (term: string) => a.some((x) => x.includes(term) || term.includes(x));
  const isVegan = d.includes("vegan");
  const isVeg = isVegan || d.includes("vegetarian");
  const noGluten = d.includes("gluten-free") || hasAllergy("gluten") || hasAllergy("wheat");
  const noDairy = isVegan || d.includes("dairy-free") || hasAllergy("dairy") || hasAllergy("milk");
  const noEggs = isVegan || hasAllergy("egg");
  const noPeanuts = hasAllergy("peanut") || hasAllergy("nut") || d.includes("nut-free");

  // Pick a hardy staple per meal type, dodging forbidden ingredients.
  const choose = () => {
    if (mealType === "breakfast") {
      if (!noGluten && !noDairy) return { title: "Oatmeal with milk", ings: ["1/2 cup rolled oats", "1 cup milk", "1 tsp sugar"], cal: 280, p: 11 };
      if (!noGluten) return { title: "Oatmeal with water", ings: ["1/2 cup rolled oats", "1 cup water", "1 tsp sugar"], cal: 200, p: 6 };
      if (!noEggs) return { title: "Scrambled eggs", ings: ["2 eggs", "1 tsp oil", "salt", "pepper"], cal: 220, p: 14 };
      return { title: "Banana with peanut butter", ings: ["1 banana", noPeanuts ? "1 tbsp sunflower seed butter" : "1 tbsp peanut butter"], cal: 200, p: 5 };
    }
    if (mealType === "lunch") {
      if (!noGluten && !noPeanuts && !isVegan === false ? true : true) {
        // PB sandwich path
        if (!noGluten && !noPeanuts) return { title: "Peanut butter sandwich", ings: ["2 slices bread", "2 tbsp peanut butter"], cal: 380, p: 14 };
      }
      if (!isVeg) return { title: "Tuna and rice bowl", ings: ["1 can tuna, drained", "1 cup cooked rice", "1 tsp oil"], cal: 380, p: 22 };
      return { title: "Beans and rice", ings: ["1 cup cooked rice", "1/2 cup canned black beans", "salt", "1 tsp oil"], cal: 340, p: 12 };
    }
    // dinner
    if (!isVeg) return { title: "Chicken and pasta", ings: ["3 oz cooked chicken", noGluten ? "1 cup cooked rice" : "1 cup cooked pasta", "1 tbsp olive oil"], cal: 460, p: 28 };
    if (!noDairy && !noGluten) return { title: "Pasta with cheese", ings: ["1 cup cooked pasta", "1/4 cup grated cheese", "1 tsp olive oil"], cal: 420, p: 16 };
    return { title: "Lentils and rice", ings: ["1/2 cup cooked lentils", "1 cup cooked rice", "1 tsp oil", "salt"], cal: 380, p: 16 };
  };

  const pick = choose();
  return {
    id: null, // signals not-a-library-recipe; downstream insert handles null
    title: `${pick.title} (minimum portion)`,
    description: "Budget-safety meal: kept your day complete at the lowest possible cost.",
    meal_type: mealType,
    ingredients: pick.ings,
    instructions: ["Cook staple per package instructions.", "Combine and serve."],
    calories: pick.cal,
    protein_g: pick.p,
    cost_per_serving: 0.85,
    serving_size: 1,
    prep_time_minutes: 5,
    cook_time_minutes: 10,
    image_url: null,
    tags: ["minimum_portion", "staple"],
    source: "minimum_portion_fallback",
  };
}

