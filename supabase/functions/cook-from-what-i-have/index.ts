// Generates AI recipe suggestions from a user's current pantry/fridge/freezer
// inventory using Lovable AI Gateway (Gemini). Persists recipes + ingredients.
// Missing ingredients can later be sent to the existing grocery list flow.

import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [{ data: pantry }, { data: profile }] = await Promise.all([
      admin.from("pantry_items").select("*").eq("user_id", userId),
      admin
        .from("profiles")
        .select(
          "household_size, dietary_preferences, allergies, cooking_confidence, weekly_budget",
        )
        .eq("user_id", userId)
        .maybeSingle(),
    ]);

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

    const sysPrompt = `You are a thrifty home-cook assistant for Help The Hive. Generate ${maxRecipes} recipes that maximize use of what the user ALREADY has, prioritizing items that may expire soon. Mark each ingredient already_have=true if it's in the inventory, false (and source_location='grocery_needed') if it must be bought. Keep recipes realistic for the household size and cooking confidence. Always include a short food_waste_reason that names which expiring items the recipe rescues. Estimate USD prices for any grocery_needed items.`;

    const userPrompt = JSON.stringify({
      household_size: profile?.household_size ?? 2,
      dietary_preferences: profile?.dietary_preferences ?? [],
      allergies: profile?.allergies ?? [],
      cooking_confidence: profile?.cooking_confidence ?? "medium",
      weekly_budget: profile?.weekly_budget ?? 75,
      source_type: sourceType,
      inventory,
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

    const recipes = Array.isArray(parsed?.recipes) ? parsed.recipes : [];
    const persisted: any[] = [];
    const norm = (s: string) => (s || "").trim().toLowerCase();
    const pantryByName = new Map<string, any>();
    for (const p of inventory) pantryByName.set(norm(p.item_name), p);

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
          status: "suggested",
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
          already_have: !!ing.already_have || !!matched,
          source_location:
            ing.source_location ?? (matched ? matched.location : "grocery_needed"),
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

    return new Response(JSON.stringify({ recipes: persisted }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("cook-from-what-i-have error", err);
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
