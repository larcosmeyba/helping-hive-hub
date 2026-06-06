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

type JobStage = "preparing" | "generating" | "saving" | "done";

type GenerationErrorCode =
  | "missing_context"
  | "openai_timeout"
  | "invalid_ai_json"
  | "database_insert_failed"
  | "grocery_list_failed";

const BACKEND_STEPS: Record<JobStage, string[]> = {
  preparing: ["profile loaded", "pantry_items loaded", "fridge_items loaded", "meal_plan_context created"],
  generating: ["OpenAI request started", "OpenAI response received"],
  saving: ["grocery_list_items generated", "estimated totals calculated"],
  done: ["meal_plan saved", "meal_plan_meals saved", "grocery list saved", "navigate to Meal Plan page"],
};

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
        metadata: { source: "generate-meal-plan" },
      })
      .select("id")
      .single();
    if (jobErr || !jobRow?.id) {
      throw new Error(jobErr?.message || "Unable to start meal plan generation job.");
    }
    const jobId = jobRow.id;
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
    }));

    const fridgeItems = pantryItems.filter((i) => i.location === "fridge");
    const pantryOnly = pantryItems.filter((i) => i.location !== "fridge");
    const expiringSoon = pantryItems.filter((i) => ["expiring_today", "use_soon"].includes(i.freshness_status));
    const lowStock = pantryItems.filter((i) => i.freshness_status === "low_stock" || (i as any).is_low_stock);
    const expired = pantryItems.filter((i) => i.freshness_status === "expired");
    const homeStore = homeStoreRes.data;

    await advance("preparing", "pantry_items loaded", "Reviewing your profile & pantry", {
      pantry_items_count: pantryOnly.length,
    });
    await advance("preparing", "fridge_items loaded", "Reviewing your profile & pantry", {
      fridge_items_count: fridgeItems.length,
    });

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

    const missingFields = missingContextFields(mealPlanContext as Record<string, unknown>);
    if (missingFields.length) {
      const message = `Missing required meal plan context: ${missingFields.join(", ")}`;
      await failJob("missing_context", message, { missing_fields: missingFields });
      return new Response(JSON.stringify(structuredError("missing_context", message, { job_id: jobId })), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await advance("preparing", "meal_plan_context created", "Reviewing your profile & pantry", {
      pantry_items_count: mealPlanContext.pantry_items.length,
      fridge_items_count: mealPlanContext.fridge_items.length,
    });

    console.log("[generate-meal-plan] meal_plan_context →",
      JSON.stringify({
        ...mealPlanContext,
        pantry_items_count: mealPlanContext.pantry_items.length,
        fridge_items_count: mealPlanContext.fridge_items.length,
      }).slice(0, 4000));

    const { callOpenAI } = await import("../_shared/openaiClient.ts");
    let lastAttemptError: { code: GenerationErrorCode; message: string; details?: Record<string, unknown> } | null = null;

    async function attempt(attemptNum: number): Promise<any | null> {
      await advance("generating", "OpenAI request started", "Building your weekly meal plan", { attempt: attemptNum });
      try {
        const ai = await callOpenAI({
          model: "gpt-5.4-mini",
          system: SYSTEM_PROMPT,
          user: `Build this week's plan from this meal_plan_context. Output ONLY the structured tool call — no prose, no markdown.\n\n${JSON.stringify(mealPlanContext)}`,
          tools: [{
            type: "function",
            function: {
              name: "return_meal_plan",
              description: "Return the structured weekly meal plan and grocery list.",
              parameters: RESPONSE_SCHEMA,
            },
          }],
          tool_choice: { type: "function", function: { name: "return_meal_plan" } },
          max_tokens: 8000,
          timeout_ms: 45000,
          log: { admin, user_id: userId, request_type: `meal_plan_generation_attempt_${attemptNum}` },
        });

        const finishReason = ai.raw?.choices?.[0]?.finish_reason;
        console.log(`[generate-meal-plan] attempt ${attemptNum} finish_reason=`, finishReason, "tool_arguments_keys=", ai.tool_arguments ? Object.keys(ai.tool_arguments) : null, "raw_text_len=", ai.text?.length ?? 0);

        if (finishReason === "length") {
          lastAttemptError = {
            code: "invalid_ai_json",
            message: "The meal planner response was cut off before completion.",
            details: { attempt: attemptNum, finish_reason: finishReason },
          };
          return null;
        }

        const p = ai.tool_arguments as any;
        const validationErrors: string[] = [];
        if (!p) validationErrors.push("no tool_arguments");
        if (p && !p.meal_plan) validationErrors.push("missing meal_plan");
        if (p?.meal_plan && !Array.isArray(p.meal_plan.days)) validationErrors.push("meal_plan.days not array");
        if (p?.meal_plan && Array.isArray(p.meal_plan.days) && p.meal_plan.days.length < 1) validationErrors.push("empty days");
        if (p && !Array.isArray(p.grocery_list)) validationErrors.push("missing grocery_list");
        if (validationErrors.length) {
          console.warn(`[generate-meal-plan] attempt ${attemptNum} validation errors:`, validationErrors);
          lastAttemptError = {
            code: "invalid_ai_json",
            message: "The meal planner returned invalid data.",
            details: { attempt: attemptNum, validation_errors: validationErrors },
          };
          return null;
        }

        await advance("generating", "OpenAI response received", "Building your weekly meal plan", { attempt: attemptNum });
        return p;
      } catch (e: any) {
        console.error(`[generate-meal-plan] attempt ${attemptNum} threw`, e?.status, e?.message, e?.code);
        if (e?.status === 429 || e?.status === 402) throw e;
        lastAttemptError = {
          code: e?.code === "openai_timeout" ? "openai_timeout" : "invalid_ai_json",
          message: e?.code === "openai_timeout"
            ? "The meal planner timed out while building your plan."
            : (e?.message || "The meal planner failed to return a valid response."),
          details: { attempt: attemptNum },
        };
        return null;
      }
    }

    let parsed: any = await attempt(1);
    if (!parsed) {
      console.warn("[generate-meal-plan] retrying once");
      parsed = await attempt(2);
    }

    if (!parsed) {
      const fallback = buildMockPlanResponse(mealPlanContext);
      const errorCode = lastAttemptError?.code ?? "invalid_ai_json";
      const errorMessage = lastAttemptError?.message ?? "We couldn't generate your meal plan right now.";
      await updateJob(admin, jobId, {
        status: "completed_with_fallback",
        current_stage: "done",
        current_step: "navigate to Meal Plan page",
        completed_steps: [...completedSteps, ...BACKEND_STEPS.done],
        status_message: "Showing fallback meal plan",
        error_code: errorCode,
        error_message: errorMessage,
        fallback_used: true,
        completed_at: new Date().toISOString(),
        metadata: { ...(lastAttemptError?.details ?? {}), fallback_notice: true },
      });
      console.warn("[generate-meal-plan] both attempts failed — returning mock fallback");
      return new Response(
        JSON.stringify({
          ok: true,
          job_id: jobId,
          fallback: true,
          notice: "We couldn't build your full meal plan right now. Showing a fallback sample plan so you aren't stuck.",
          error_code: errorCode,
          error_message: errorMessage,
          ...fallback,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const mealPlan = parsed.meal_plan;
    const groceryList = parsed.grocery_list ?? [];
    const whyThisPlan = parsed.why_this_plan ?? {};

    await advance("saving", "grocery_list_items generated", "Pricing your grocery list", {
      grocery_items_count: groceryList.length,
    });

    const normalized = normalizePlanForClient(mealPlan, groceryList);
    console.log("[generate-meal-plan] normalized days=", normalized.weeklyPlan.length,
      "grocery_items=", normalized.groceryList.length,
      "total=", normalized.totalEstimatedCost);

    await advance("saving", "estimated totals calculated", "Pricing your grocery list", {
      estimated_total_cost: normalized.totalEstimatedCost,
    });

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
      plan_data: { ...parsed, ...normalized },
      status: "active",
    }).select().single();
    if (planErr) {
      await failJob("database_insert_failed", planErr.message, { table: "meal_plans" });
      return new Response(JSON.stringify(structuredError("database_insert_failed", planErr.message, { job_id: jobId })), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const planId = planRow.id;
    await advance("done", "meal_plan saved", "Finalizing your plan", { meal_plan_id: planId });

    for (let i = 0; i < (mealPlan.days ?? []).length; i++) {
      const day = mealPlan.days[i];
      const { data: dayRow, error: dayErr } = await admin.from("meal_plan_days").insert({
        meal_plan_id: planId,
        user_id: userId,
        day_name: day.day_name,
        sort_order: i,
      }).select().single();
      if (dayErr) {
        await failJob("database_insert_failed", dayErr.message, { table: "meal_plan_days" });
        return new Response(JSON.stringify(structuredError("database_insert_failed", dayErr.message, { job_id: jobId })), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

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
        if (mealErr) {
          await failJob("database_insert_failed", mealErr.message, { table: "meal_plan_meals" });
          return new Response(JSON.stringify(structuredError("database_insert_failed", mealErr.message, { job_id: jobId })), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

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
          if (ingErr) {
            await failJob("database_insert_failed", ingErr.message, { table: "meal_ingredients" });
            return new Response(JSON.stringify(structuredError("database_insert_failed", ingErr.message, { job_id: jobId })), {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }
        }
      }
    }

    await advance("done", "meal_plan_meals saved", "Finalizing your plan", { meal_plan_id: planId });

    const { data: glRow, error: glErr } = await admin.from("grocery_lists").insert({
      user_id: userId,
      meal_plan_id: planId,
      store_name: mealPlanContext.preferred_store,
      estimated_total: groceryList.reduce((s: number, i: any) => s + (Number(i.estimated_price) || 0), 0),
      status: "active",
    }).select().single();
    if (glErr) {
      await failJob("grocery_list_failed", glErr.message, { table: "grocery_lists" });
      return new Response(JSON.stringify(structuredError("grocery_list_failed", glErr.message, { job_id: jobId })), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
      if (itemsErr) {
        await failJob("grocery_list_failed", itemsErr.message, { table: "grocery_list_items" });
        return new Response(JSON.stringify(structuredError("grocery_list_failed", itemsErr.message, { job_id: jobId })), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      metadata: { grocery_list_id: glRow.id },
    });

    return new Response(
      JSON.stringify({
        ok: true,
        job_id: jobId,
        meal_plan_id: planId,
        grocery_list_id: glRow.id,
        meal_plan: parsed.meal_plan,
        grocery_list: parsed.grocery_list,
        why_this_plan: parsed.why_this_plan,
        ...normalized,
        pricing_disclaimer: "Estimated pricing for planning only. Final pricing and availability are confirmed at Instacart checkout.",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("generate-meal-plan error", err);
    return new Response(JSON.stringify({ ok: false, error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

function ingredientLine(i: any): string {
  return [i.quantity, i.unit, i.item_name].filter(Boolean).join(" ").trim();
}

function normalizePlanForClient(mealPlan: any, groceryList: any[]) {
  const weeklyPlan = (mealPlan?.days ?? []).map((d: any) => ({
    day: d.day_name,
    meals: (["breakfast", "lunch", "dinner"] as const)
      .filter((t) => d?.[t])
      .map((t) => {
        const m = d[t];
        return {
          type: t,
          name: m.meal_name,
          calories: m.calories_estimate ?? 0,
          protein: m.protein_estimate ?? 0,
          carbs: 0,
          fats: 0,
          estimatedCost: m.estimated_cost ?? 0,
          costPerServing: m.estimated_cost_per_serving,
          cookTimeMinutes: (m.cook_time_minutes ?? 0) + (m.prep_time_minutes ?? 0),
          ingredients: [
            ...(m.ingredients_used_from_pantry ?? []).map(ingredientLine),
            ...(m.ingredients_to_buy ?? []).map(ingredientLine),
          ],
          instructions: m.instructions ?? [],
        };
      }),
  }));

  const groceryListOut = (groceryList ?? [])
    .filter((g: any) => !g.already_have)
    .map((g: any) => ({
      name: g.item_name,
      quantity: [g.quantity, g.unit].filter(Boolean).join(" ").trim(),
      estimatedPrice: Number(g.estimated_price) || 0,
      section: g.category ?? "Other",
    }));

  const totalEstimatedCost = Number(mealPlan?.estimated_total_cost)
    || groceryListOut.reduce((s, i) => s + i.estimatedPrice, 0);
  const totalMeals = Number(mealPlan?.total_meals)
    || weeklyPlan.reduce((s: number, d: any) => s + d.meals.length, 0) || 1;

  return {
    weeklyPlan,
    groceryList: groceryListOut,
    storeRecommendations: [],
    totalEstimatedCost,
    pantrySavings: Number(mealPlan?.savings_estimate) || 0,
    costPerMeal: totalEstimatedCost / totalMeals,
    taxEstimate: 0,
  };
}

function buildMockPlanResponse(_ctx: any) {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const types = ["breakfast", "lunch", "dinner"] as const;
  const placeholder = {
    name: "Sample meal — regenerate when ready",
    calories: 0, protein: 0, carbs: 0, fats: 0,
    estimatedCost: 0, cookTimeMinutes: 0,
    ingredients: [], instructions: ["Tap Regenerate to build your real plan."],
  };
  const weeklyPlan = days.map((d) => ({
    day: d,
    meals: types.map((t) => ({ type: t, ...placeholder })),
  }));
  return {
    weeklyPlan,
    groceryList: [],
    storeRecommendations: [],
    totalEstimatedCost: 0,
    pantrySavings: 0,
    costPerMeal: 0,
    taxEstimate: 0,
    pricing_disclaimer: "Estimated pricing for planning only. Final pricing and availability are confirmed at Instacart checkout.",
  };
}
