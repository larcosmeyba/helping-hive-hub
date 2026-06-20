// Generates AI recipe suggestions from a user's current pantry/fridge/freezer
// inventory using Lovable AI Gateway (Gemini). Persists recipes + ingredients.
// Missing ingredients can later be sent to the existing grocery list flow.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { enforceRateLimit } from "../_shared/rateLimit.ts";
import { captureEdgeError } from "../_shared/sentry.ts";
import { rankCandidates, type CandidateRecipe } from "../_shared/cookMatch.ts";
// OpenAI access is via _shared/openaiClient.ts (gpt-5.4-mini).

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  const ms = new Date(date).getTime() - Date.now();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function freshnessOf(item: any): string {
  if (item.is_out_of_stock) return "depleted";
  const d = daysUntil(item.expiration_date);
  if (d != null) {
    if (d < 0) return "expired";
    if (d === 0) return "expiring_today";
    if (d <= 3) return "use_soon";
  }
  if (item.is_low_stock) return "low_stock";
  return "good";
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } = await userClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const sourceType: "cook_from_what_i_have" | "food_waste" =
      body?.source_type === "food_waste" ? "food_waste" : "cook_from_what_i_have";
    const maxRecipes = Math.min(Math.max(Number(body?.count) || 3, 1), 5);
    const useDbMatch = body?.new_algorithm === true || body?.use_db_match === true;

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Rate limit: 20 cook-from-what-i-have requests per user per hour.
    const rl = await enforceRateLimit({
      admin,
      userId,
      endpoint: "cook-from-what-i-have",
      maxPerHour: 20,
      corsHeaders,
    });
    if (rl) return rl;

    const [
      { data: pantry },
      { data: profile },
      { data: groceryItems },
      { data: purchasedLists },
    ] = await Promise.all([
      admin.from("pantry_items").select("*").eq("user_id", userId),
      admin
        .from("profiles")
        .select(
          "household_size, dietary_preferences, allergies, cooking_confidence, weekly_budget",
        )
        .eq("user_id", userId)
        .maybeSingle(),
      admin
        .from("grocery_list_items")
        .select("ingredient_name, quantity, unit, is_checked")
        .eq("user_id", userId),
      admin
        .from("grocery_lists")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "purchased")
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

    let purchasedItems: any[] = [];
    const purchasedIds = (purchasedLists ?? []).map((l: any) => l.id);
    if (purchasedIds.length) {
      const { data } = await admin
        .from("grocery_list_items")
        .select("ingredient_name, quantity, unit")
        .in("grocery_list_id", purchasedIds);
      purchasedItems = data ?? [];
    }

    const inventory = (pantry ?? [])
      .map((p: any) => ({
        id: p.id,
        item_name: p.item_name,
        quantity: p.quantity,
        unit: p.unit,
        location: p.location || "pantry",
        freshness: freshnessOf(p),
        expiration_date: p.expiration_date,
      }))
      .filter((p) => p.freshness !== "expired" && p.freshness !== "depleted");

    if (!inventory.length) {
      return new Response(
        JSON.stringify({ recipes: [], reason: "Pantry is empty. Add items first." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Prioritize expiring items
    const priorityOrder = ["expiring_today", "use_soon", "low_stock", "good"];
    inventory.sort(
      (a, b) => priorityOrder.indexOf(a.freshness) - priorityOrder.indexOf(b.freshness),
    );

    // ────────────────────────────────────────────────────────────────────
    // PHASE C — DB-match-first branch (gated by new_algorithm flag).
    // Backend = matcher + safety + accountant. OpenAI = optional ranker.
    // AI-generated fallback only when DB matches are empty.
    // ────────────────────────────────────────────────────────────────────
    if (useDbMatch) {
      try {
        const tierResp = await runDbMatchFlow({
          admin,
          userId,
          inventory,
          profile,
          groceryItems: groceryItems ?? [],
          purchasedItems,
          sourceType,
          maxRecipes,
        });
        if (tierResp.has_matches) {
          return new Response(JSON.stringify(tierResp.payload), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        // No matches → fall through to generative path; mark fallback.
        (req as any)._aiFallback = true;
      } catch (err) {
        try { captureEdgeError(err, { fn: "cook-from-what-i-have", phase: "db_match" }); } catch { /* */ }
        console.error("[cook-from-what-i-have] db-match failed, falling back to AI", err);
        (req as any)._aiFallback = true;
      }
    }


    const tools = [
      {
        type: "function",
        function: {
          name: "return_recipes",
          description: "Return suggested recipes the user can make right now",
          parameters: {
            type: "object",
            properties: {
              recipes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    recipe_name: { type: "string" },
                    description: { type: "string" },
                    servings: { type: "number" },
                    prep_time_minutes: { type: "number" },
                    cook_time_minutes: { type: "number" },
                    difficulty: { type: "string", enum: ["easy", "medium", "hard"] },
                    estimated_cost_of_missing_items: { type: "number" },
                    savings_estimate: { type: "number" },
                    food_waste_reason: { type: "string" },
                    instructions: { type: "array", items: { type: "string" } },
                    ingredients: {
                      type: "array",
                      items: {
                        type: "object",
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
                        required: ["item_name", "already_have"],
                      },
                    },
                  },
                  required: [
                    "recipe_name",
                    "description",
                    "instructions",
                    "ingredients",
                    "food_waste_reason",
                  ],
                },
              },
            },
            required: ["recipes"],
          },
        },
      },
    ];

    const availableExtras = [
      ...((groceryItems ?? []) as any[]).map((g) => ({
        item_name: g.ingredient_name,
        quantity: g.quantity,
        unit: g.unit,
        source: g.is_checked ? "grocery_list_checked" : "grocery_list",
      })),
      ...purchasedItems.map((g: any) => ({
        item_name: g.ingredient_name,
        quantity: g.quantity,
        unit: g.unit,
        source: "previously_purchased",
      })),
    ];

    const sysPrompt = `You are Help The Hive's pantry chef. Your single job is to suggest recipes the user can cook RIGHT NOW from the items in their pantry, fridge, and freezer (the "inventory" array).

ABSOLUTE RULES:
- Build recipes AROUND the inventory items. Every recipe must use at least 3 inventory items as its core ingredients. Cite the actual item_name strings from the inventory.
- Prioritize items where freshness is "expiring_today" or "use_soon" — rescue them first.
- STRONGLY PREFER recipes where EVERY ingredient is already owned (in inventory, available_grocery_list, or previously_purchased). Return only fully-makeable recipes when possible; do not pad with recipes that require shopping.
- Common pantry staples (salt, pepper, water, basic cooking oil) may be assumed available and marked already_have=true.
- Mark already_have=false ONLY for ingredients the user truly does not have.

SAFETY — NEVER VIOLATE:
- The "allergies" array lists ingredients the user CANNOT eat, including derivatives. "nuts" forbids almond, walnut, pecan, peanut, cashew, hazelnut, pistachio, macadamia, pine nut, nut butter. "dairy" forbids milk, cheese, butter, yogurt, cream. "gluten" forbids wheat, flour, bread, pasta. If a recipe could violate, DO NOT return it.
- "dietary_preferences" is binding. vegan = NO meat, poultry, fish, seafood, eggs, dairy, honey, gelatin. vegetarian = NO meat, poultry, fish, seafood, gelatin. pescatarian = NO meat or poultry.

Generate up to ${maxRecipes} recipes. Include food_waste_reason naming the rescued items. Keep recipes realistic for the user's household size and cooking confidence.`;

    const userPrompt = JSON.stringify({
      household_size: profile?.household_size ?? 2,
      dietary_preferences: profile?.dietary_preferences ?? [],
      allergies: profile?.allergies ?? [],
      cooking_confidence: profile?.cooking_confidence ?? "medium",
      weekly_budget: profile?.weekly_budget ?? 75,
      source_type: sourceType,
      inventory,
      available_grocery_list: availableExtras.filter((x) => x.source !== "previously_purchased"),
      previously_purchased: availableExtras.filter((x) => x.source === "previously_purchased"),
    });

    let parsed: any;
    try {
      const { callOpenAI } = await import("../_shared/openaiClient.ts");
      const ai = await callOpenAI({
        model: "gpt-5.4-mini",
        system: sysPrompt,
        user: userPrompt,
        tools,
        tool_choice: { type: "function", function: { name: "return_recipes" } },
        log: { admin, user_id: userId, request_type: "cook_from_what_i_have" },
      });
      if (!ai.tool_arguments) {
        return new Response(JSON.stringify({ error: "No recipes returned" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      parsed = ai.tool_arguments;
    } catch (err: any) {
      const status = err?.status === 429 || err?.status === 402 ? err.status : 500;
      return new Response(JSON.stringify({ error: err?.message ?? "AI request failed" }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Safety filter: enforce allergies + dietary preferences server-side.
    const ALLERGY_MAP: Record<string, string[]> = {
      nuts: ["nut","nuts","almond","walnut","pecan","peanut","cashew","hazelnut","pistachio","macadamia","brazil nut","pine nut","nut butter"],
      "tree nuts": ["almond","walnut","pecan","cashew","hazelnut","pistachio","macadamia","brazil nut","pine nut"],
      peanuts: ["peanut","peanuts","peanut butter","groundnut"],
      dairy: ["milk","cheese","butter","yogurt","yoghurt","cream","whey","casein","lactose","ghee","parmesan","mozzarella","cheddar","feta","ricotta"],
      milk: ["milk","cheese","butter","yogurt","cream","whey","casein","lactose"],
      gluten: ["wheat","flour","bread","pasta","barley","rye","couscous","semolina","farro","spelt","bulgur","seitan"],
      wheat: ["wheat","flour","bread","pasta","couscous","semolina"],
      eggs: ["egg","eggs","mayonnaise","mayo","meringue"],
      soy: ["soy","soya","tofu","tempeh","edamame","miso","soy sauce","tamari"],
      shellfish: ["shrimp","prawn","crab","lobster","crawfish","scallop","clam","mussel","oyster"],
      fish: ["fish","salmon","tuna","cod","tilapia","trout","anchovy","sardine","halibut","mackerel"],
      sesame: ["sesame","tahini"],
    };
    const DIET_MAP: Record<string, string[]> = {
      vegan: ["beef","steak","pot roast","pork","bacon","ham","sausage","chicken","turkey","lamb","veal","duck","fish","salmon","tuna","cod","tilapia","shrimp","prawn","crab","lobster","scallop","clam","oyster","mussel","anchovy","milk","cheese","butter","yogurt","cream","whey","casein","egg","eggs","honey","gelatin","lard","tallow","ghee","parmesan","mozzarella","cheddar","feta"],
      vegetarian: ["beef","steak","pot roast","pork","bacon","ham","sausage","chicken","turkey","lamb","veal","duck","fish","salmon","tuna","cod","tilapia","shrimp","prawn","crab","lobster","scallop","clam","oyster","mussel","anchovy","gelatin","lard","tallow"],
      pescatarian: ["beef","steak","pot roast","pork","bacon","ham","sausage","chicken","turkey","lamb","veal","duck","gelatin","lard","tallow"],
    };
    const safetyTerms = new Set<string>();
    for (const a of (profile?.allergies ?? []) as string[]) {
      const k = (a||"").toLowerCase().trim(); if (!k) continue;
      safetyTerms.add(k); for (const t of ALLERGY_MAP[k]||[]) safetyTerms.add(t);
    }
    for (const d of (profile?.dietary_preferences ?? []) as string[]) {
      const k = (d||"").toLowerCase().trim();
      for (const t of DIET_MAP[k]||[]) safetyTerms.add(t);
    }
    function violatesSafety(r: any): boolean {
      if (!safetyTerms.size) return false;
      const parts: string[] = [String(r.recipe_name||""), String(r.description||"")];
      for (const i of (r.ingredients||[])) parts.push(String(i?.item_name||""));
      const hay = parts.join(" ").toLowerCase();
      for (const t of safetyTerms) {
        const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`,"i");
        if (re.test(hay)) return true;
      }
      return false;
    }
    const safeRecipes = (Array.isArray(parsed?.recipes) ? parsed.recipes : []).filter((r: any) => {
      if (violatesSafety(r)) { console.warn("[cook-from-what-i-have] rejected unsafe recipe", r?.recipe_name); return false; }
      return true;
    });
    const recipes = safeRecipes;
    const persisted: any[] = [];
    const norm = (s: string) => (s || "").trim().toLowerCase();
    const pantryByName = new Map<string, any>();
    for (const p of inventory) pantryByName.set(norm(p.item_name), p);
    const ownedNames = new Set<string>(pantryByName.keys());
    for (const g of (groceryItems ?? []) as any[]) ownedNames.add(norm(g.ingredient_name));
    for (const g of purchasedItems) ownedNames.add(norm(g.ingredient_name));

    for (const r of recipes) {
      const { data: rec, error: recErr } = await admin
        .from("generated_recipes")
        .insert({
          user_id: userId,
          source_type: sourceType,
          recipe_name: r.recipe_name,
          description: r.description ?? null,
          servings: r.servings ?? null,
          prep_time_minutes: r.prep_time_minutes ?? null,
          cook_time_minutes: r.cook_time_minutes ?? null,
          difficulty: r.difficulty ?? null,
          estimated_cost_of_missing_items: r.estimated_cost_of_missing_items ?? null,
          savings_estimate: r.savings_estimate ?? null,
          food_waste_reason: r.food_waste_reason ?? null,
          instructions: r.instructions ?? [],
          status: (req as any)._aiFallback ? "pending_review" : "suggested",
        })
        .select()
        .single();
      if (recErr) {
        console.error(recErr);
        continue;
      }

      const ingRows = (r.ingredients ?? []).map((ing: any) => {
        const k = norm(ing.item_name);
        const matched = pantryByName.get(k);
        return {
          recipe_id: rec.id,
          user_id: userId,
          item_name: ing.item_name,
          normalized_item_name: k,
          quantity: ing.quantity ?? null,
          unit: ing.unit ?? null,
          already_have: !!ing.already_have || !!matched || ownedNames.has(k),
          source_location:
            ing.source_location ??
            (matched ? matched.location : ownedNames.has(k) ? "pantry" : "grocery_needed"),
          pantry_item_id: matched?.id ?? null,
          estimated_price: ing.estimated_price ?? null,
          instacart_search_term: ing.item_name,
        };
      });

      if (ingRows.length) {
        await admin.from("generated_recipe_ingredients").insert(ingRows);
      }
      persisted.push({ ...rec, ingredients: ingRows });
    }

    return new Response(JSON.stringify({
      recipes: persisted,
      source: (req as any)._aiFallback ? "ai_fallback" : "generative",
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    try { captureEdgeError(err, { fn: "cook-from-what-i-have" }); } catch { /* noop */ }
    console.error("cook-from-what-i-have error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ────────────────────────────────────────────────────────────────────
// Phase C — DB-match flow helpers
// ────────────────────────────────────────────────────────────────────

// Local copies of the allergy/diet expansion maps (kept local to avoid
// cross-importing the giant generate-meal-plan file at edge runtime).
const COOK_ALLERGY_EXPANSIONS: Record<string, string[]> = {
  nuts: ["nut","nuts","almond","walnut","pecan","peanut","cashew","hazelnut","pistachio","macadamia","brazil nut","pine nut","nut butter"],
  "tree nuts": ["almond","walnut","pecan","cashew","hazelnut","pistachio","macadamia","brazil nut","pine nut"],
  peanuts: ["peanut","peanuts","peanut butter","groundnut"],
  dairy: ["milk","cheese","butter","yogurt","yoghurt","cream","whey","casein","lactose","ghee","parmesan","mozzarella","cheddar","feta","ricotta"],
  milk: ["milk","cheese","butter","yogurt","cream","whey","casein","lactose"],
  gluten: ["wheat","flour","bread","pasta","barley","rye","couscous","semolina","farro","spelt","bulgur","seitan"],
  wheat: ["wheat","flour","bread","pasta","couscous","semolina"],
  eggs: ["egg","eggs","mayonnaise","mayo","meringue"],
  soy: ["soy","soya","tofu","tempeh","edamame","miso","soy sauce","tamari"],
  shellfish: ["shrimp","prawn","crab","lobster","crawfish","scallop","clam","mussel","oyster"],
  fish: ["fish","salmon","tuna","cod","tilapia","trout","anchovy","sardine","halibut","mackerel"],
  sesame: ["sesame","tahini"],
};
const COOK_DIET_FORBIDDEN: Record<string, string[]> = {
  vegan: ["beef","steak","pork","bacon","ham","sausage","chicken","turkey","lamb","veal","duck","fish","salmon","tuna","cod","tilapia","shrimp","prawn","crab","lobster","scallop","clam","oyster","mussel","anchovy","milk","cheese","butter","yogurt","cream","whey","casein","egg","eggs","honey","gelatin","lard","ghee"],
  vegetarian: ["beef","steak","pork","bacon","ham","sausage","chicken","turkey","lamb","veal","duck","fish","salmon","tuna","cod","tilapia","shrimp","prawn","crab","lobster","scallop","clam","oyster","mussel","anchovy","gelatin","lard"],
  pescatarian: ["beef","steak","pork","bacon","ham","sausage","chicken","turkey","lamb","veal","duck","gelatin","lard"],
};
function _expandAllergies(allergies: string[]): string[] {
  const out = new Set<string>();
  for (const a of allergies || []) {
    const k = (a || "").toLowerCase().trim(); if (!k) continue;
    out.add(k);
    for (const t of COOK_ALLERGY_EXPANSIONS[k] || []) out.add(t);
  }
  return Array.from(out);
}
function _forbiddenForDiets(prefs: string[]): string[] {
  const out = new Set<string>();
  for (const p of prefs || []) {
    const k = (p || "").toLowerCase().trim();
    for (const t of COOK_DIET_FORBIDDEN[k] || []) out.add(t);
  }
  return Array.from(out);
}

async function runDbMatchFlow(args: {
  admin: any;
  userId: string;
  inventory: Array<{ id: string; item_name: string; location?: string | null; freshness?: string | null }>;
  profile: any;
  groceryItems: any[];
  purchasedItems: any[];
  sourceType: "cook_from_what_i_have" | "food_waste";
  maxRecipes: number;
}): Promise<{ has_matches: boolean; payload: any }> {
  const { admin, userId, inventory, profile, groceryItems, purchasedItems, sourceType, maxRecipes } = args;

  // Fetch candidate pool — reuse generate-meal-plan pattern.
  const { data: rawRecipes, error: recErr } = await admin
    .from("recipes")
    .select("id, title, description, ingredients, instructions, prep_time_minutes, cook_time_minutes, cost_per_serving, serving_size, estimated_recipe_cost, tags, image_url, is_active, is_public, created_by_user_id")
    .eq("is_active", true)
    .or(`is_public.eq.true,created_by_user_id.eq.${userId}`)
    .limit(200);
  if (recErr) throw recErr;

  const allergyTerms = _expandAllergies((profile?.allergies ?? []) as string[]);
  const dietForbidden = _forbiddenForDiets((profile?.dietary_preferences ?? []) as string[]);

  const extraOwnedNames: string[] = [
    ...((groceryItems ?? []) as any[]).map((g) => String(g.ingredient_name || "")),
    ...((purchasedItems ?? []) as any[]).map((g) => String(g.ingredient_name || "")),
  ];

  const ranked = rankCandidates({
    inventory: inventory.map((i) => ({
      id: i.id,
      item_name: i.item_name,
      freshness: i.freshness ?? "good",
    })),
    recipes: (rawRecipes ?? []) as CandidateRecipe[],
    allergyTerms,
    dietForbidden,
    cookingConfidence: profile?.cooking_confidence ?? "medium",
    extraOwnedNames,
  });

  if (!ranked.matches.length) {
    return { has_matches: false, payload: null };
  }

  // Cap at maxRecipes per tier for response payload sanity.
  const cap = Math.max(maxRecipes, 5);
  const make_now = ranked.tiers.make_now.slice(0, cap);
  const need_1 = ranked.tiers.need_1.slice(0, cap);
  const need_2_3 = ranked.tiers.need_2_3.slice(0, cap);

  // OpenAI ranker pass (best-effort, advisory).
  const shortlist = [...make_now, ...need_1, ...need_2_3].slice(0, 20);
  let aiByRecipeId: Record<string, { rank?: number; why?: string; substitutions?: string[]; expiring_used?: string[] }> = {};
  if (shortlist.length) {
    try {
      const { callOpenAI } = await import("../_shared/openaiClient.ts");
      const tools = [{
        type: "function" as const,
        function: {
          name: "return_ranking",
          description: "Rank pre-matched recipes and explain why each works for the user's pantry.",
          parameters: {
            type: "object",
            properties: {
              rankings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    recipe_id: { type: "string" },
                    rank: { type: "number" },
                    why: { type: "string" },
                    substitutions: { type: "array", items: { type: "string" } },
                    expiring_used: { type: "array", items: { type: "string" } },
                  },
                  required: ["recipe_id", "why"],
                },
              },
            },
            required: ["rankings"],
          },
        },
      }];
      const sys = "You are Help The Hive's pantry chef ranker. You are given a SHORTLIST of recipes that have ALREADY been matched against the user's pantry. Do NOT invent recipes. For each recipe, return a one-sentence 'why this works', up to 3 ingredient substitutions, and which expiring items it rescues. Respect the user's allergies and dietary_preferences (already filtered).";
      const userMsg = JSON.stringify({
        allergies: profile?.allergies ?? [],
        dietary_preferences: profile?.dietary_preferences ?? [],
        cooking_confidence: profile?.cooking_confidence ?? "medium",
        household_size: profile?.household_size ?? 2,
        expiring_items: inventory
          .filter((i) => i.freshness === "expiring_today" || i.freshness === "use_soon")
          .map((i) => i.item_name),
        shortlist: shortlist.map((m) => ({
          recipe_id: m.recipe.id,
          title: m.recipe.title,
          pantry_match_pct: m.pantry_match_pct,
          missing_items: m.missing_items.map((i) => i.item_name),
          uses_expiring: m.uses_expiring,
        })),
      });
      const ai = await callOpenAI({
        model: "gpt-5.4-mini",
        system: sys,
        user: userMsg,
        tools,
        tool_choice: { type: "function", function: { name: "return_ranking" } },
        log: { admin, user_id: userId, request_type: "cook_rank" },
      });
      const rankings = (ai.tool_arguments as any)?.rankings ?? [];
      for (const r of rankings) {
        if (!r?.recipe_id) continue;
        aiByRecipeId[String(r.recipe_id)] = {
          rank: typeof r.rank === "number" ? r.rank : undefined,
          why: r.why,
          substitutions: Array.isArray(r.substitutions) ? r.substitutions : [],
          expiring_used: Array.isArray(r.expiring_used) ? r.expiring_used : [],
        };
      }
    } catch (err) {
      console.warn("[cook-from-what-i-have] OpenAI ranker failed, using deterministic order", err);
      try { captureEdgeError(err, { fn: "cook-from-what-i-have", phase: "openai_rank" }); } catch { /* */ }
    }
  }

  const toPayload = (m: any) => ({
    public_recipe_id: m.recipe.id,
    recipe_name: m.recipe.title,
    description: m.recipe.description ?? null,
    image_url: m.recipe.image_url ?? null,
    instructions: Array.isArray(m.recipe.instructions)
      ? m.recipe.instructions
      : (m.recipe.instructions ? [String(m.recipe.instructions)] : []),
    prep_time_minutes: m.recipe.prep_time_minutes ?? null,
    cook_time_minutes: m.recipe.cook_time_minutes ?? null,
    servings: m.recipe.serving_size ?? null,
    pantry_match_pct: m.pantry_match_pct,
    missing_items: m.missing_items,
    missing_count: m.missing_count,
    cost_to_complete: m.cost_to_complete,
    uses_expiring: m.uses_expiring,
    tier: m.tier,
    why: aiByRecipeId[m.recipe.id]?.why ?? null,
    substitutions: aiByRecipeId[m.recipe.id]?.substitutions ?? [],
    expiring_used: aiByRecipeId[m.recipe.id]?.expiring_used ?? [],
  });

  return {
    has_matches: true,
    payload: {
      source: "db_match",
      source_type: sourceType,
      tiers: {
        make_now: make_now.map(toPayload),
        need_1: need_1.map(toPayload),
        need_2_3: need_2_3.map(toPayload),
      },
      tier_counts: {
        make_now: make_now.length,
        need_1: need_1.length,
        need_2_3: need_2_3.length,
      },
    },
  };
}
