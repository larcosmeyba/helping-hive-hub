// Central AI router for Help The Hive.
//
// ALL AI calls in the platform should go through this function so we can:
//   - swap providers/models without touching the rest of the codebase
//   - keep API keys server-side only
//   - log every request for analytics + debugging
//   - return mock responses while OPENAI_ENABLED=false
//
// Request shape:
//   {
//     request_type: "meal_plan_generation" | "meal_swap" | "hive_ai_chat"
//                 | "cook_from_what_i_have" | "pantry_analysis"
//                 | "food_waste_alerts" | "family_assistance"
//                 | "budget_insights" | "pantry_photo_scan",
//     context: Record<string, unknown>,  // structured backend data
//     prompt?: string,                   // free-form user input (chat)
//     options?: { model?: string; temperature?: number; max_tokens?: number }
//   }
//
// Response shape:
//   { ok: true, request_type, model_used, mocked: boolean, data: any, log_id }
//   { ok: false, error: string, log_id? }
//
// NOTE: OpenAI is intentionally NOT wired up yet. When OPENAI_API_KEY is added
// and ai_config.enabled = true, the `callOpenAI` branch below activates.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { buildMealPlanContext } from "../_shared/mealPlanContext.ts";
import { buildHiveAiContext } from "../_shared/hiveAiContext.ts";
import { buildFamilyAssistanceContext } from "../_shared/familyAssistanceContext.ts";

type RequestType =
  | "meal_plan_generation"
  | "meal_swap"
  | "hive_ai_chat"
  | "cook_from_what_i_have"
  | "pantry_analysis"
  | "food_waste_alerts"
  | "family_assistance"
  | "budget_insights"
  | "pantry_photo_scan"
  | "inventory_photo_scan";

const SUPPORTED: RequestType[] = [
  "meal_plan_generation",
  "meal_swap",
  "hive_ai_chat",
  "cook_from_what_i_have",
  "pantry_analysis",
  "food_waste_alerts",
  "family_assistance",
  "budget_insights",
  "pantry_photo_scan",
  "inventory_photo_scan",
];

Deno.serve(async (req) => {
  const pf = handlePreflight(req);
  if (pf) return pf;
  const cors = buildCorsHeaders(req);
  const startedAt = Date.now();

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return json({ ok: false, error: "Unauthorized" }, 401, cors);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const request_type = body.request_type as RequestType;
    const context = (body.context ?? {}) as Record<string, unknown>;
    const prompt = (body.prompt ?? "") as string;
    const options = (body.options ?? {}) as { model?: string; temperature?: number; max_tokens?: number };

    if (!request_type || !SUPPORTED.includes(request_type)) {
      return json({ ok: false, error: `Unsupported request_type. Supported: ${SUPPORTED.join(", ")}` }, 400, cors);
    }

    // Load AI config (enabled flag + model)
    const { data: config } = await admin
      .from("ai_config")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const enabled = Boolean(config?.enabled);
    const model = options.model ?? config?.model ?? "gpt-5.4-mini";
    const provider = config?.provider ?? "openai";
    const apiKey = Deno.env.get("OPENAI_API_KEY");

    // Auto-enrich context from backend builders so callers don't have to.
    let enrichedContext = context;
    try {
      if (["meal_plan_generation", "meal_swap"].includes(request_type)) {
        enrichedContext = {
          ...context,
          meal_plan_context: await buildMealPlanContext(admin, user.id),
        };
      } else if (
        ["hive_ai_chat", "cook_from_what_i_have", "pantry_analysis", "food_waste_alerts"].includes(request_type)
      ) {
        enrichedContext = {
          ...context,
          hive_ai_context: await buildHiveAiContext(admin, user.id),
        };
      } else if (request_type === "family_assistance") {
        enrichedContext = {
          ...context,
          family_assistance_context: await buildFamilyAssistanceContext(admin, user.id),
        };
      }
    } catch (ctxErr) {
      console.warn("[process-hive-ai-request] context enrichment failed", ctxErr);
    }

    // Create log row up-front so we can update it with timing/results
    const { data: logRow } = await admin
      .from("ai_request_log")
      .insert({
        user_id: user.id,
        request_type,
        model_used: model,
        provider,
        status: "pending",
        metadata: { has_prompt: Boolean(prompt) },
      })
      .select("id")
      .single();
    const log_id = logRow?.id;

    let data: unknown;
    let mocked = !apiKey;
    let status = "ok";
    let errorMessage: string | null = null;

    if (apiKey) {
      try {
        data = await callOpenAI({ apiKey, model, request_type, context: enrichedContext, prompt, options });
        mocked = false;
      } catch (err) {
        status = "error";
        errorMessage = err instanceof Error ? err.message : String(err);
        data = mockResponse(request_type, enrichedContext);
        mocked = true;
      }
    } else {
      data = mockResponse(request_type, enrichedContext);
    }

    const latency_ms = Date.now() - startedAt;
    if (log_id) {
      await admin
        .from("ai_request_log")
        .update({
          status,
          latency_ms,
          error_message: errorMessage,
          metadata: { has_prompt: Boolean(prompt), mocked },
        })
        .eq("id", log_id);
    }

    return json({ ok: true, request_type, model_used: model, mocked, data, log_id }, 200, cors);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ ok: false, error: message }, 500, cors);
  }
});

function json(payload: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

// ---------- OpenAI adapter (inactive until OPENAI_API_KEY + ai_config.enabled=true) ----------

async function callOpenAI(args: {
  apiKey: string;
  model: string;
  request_type: RequestType;
  context: Record<string, unknown>;
  prompt: string;
  options: { temperature?: number; max_tokens?: number };
}): Promise<unknown> {
  const { apiKey, model, request_type, context, prompt, options } = args;
  const system = systemPromptFor(request_type);
  const userMsg = JSON.stringify({ instructions: prompt || "Generate per request_type.", context });

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: userMsg },
      ],
      temperature: options.temperature ?? 0.4,
      max_tokens: options.max_tokens ?? 1500,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI ${res.status}: ${text}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content ?? "{}";
  try {
    return JSON.parse(content);
  } catch {
    return { raw: content };
  }
}

function systemPromptFor(type: RequestType): string {
  switch (type) {
    case "meal_plan_generation":
      return "You generate weekly batch-cooking meal plans for low-budget families. Return JSON matching the existing meal_plan schema. Honor budget, allergies, pantry, and expiring items.";
    case "meal_swap":
      return "You swap a single meal in an existing plan, respecting budget, dietary, and pantry constraints. Return JSON for the replacement meal.";
    case "hive_ai_chat":
      return "You are Hive AI, a warm assistant that helps families with food planning, waste reduction, and budgeting. Reply in JSON with { message, suggested_actions[] }.";
    case "cook_from_what_i_have":
      return "Suggest 3 recipes using the user's pantry/fridge/freezer items, prioritizing expiring ingredients. Return JSON { recipes: [...] }.";
    case "pantry_analysis":
      return "Analyze pantry inventory and return JSON { insights[], low_stock_suggestions[], waste_risk[] }.";
    case "food_waste_alerts":
      return "Generate prioritized food waste alerts. Return JSON { alerts: [{ item, days_left, suggested_uses[] }] }.";
    case "family_assistance":
      return [
        "You are Hive Family Assistance, a support assistant inside Help The Hive.",
        "Help families find relevant local resources based on their ZIP code, selected needs, urgency, and household context.",
        "Be supportive, clear, and practical. Always prioritize urgent needs first; then food, shelter, utilities, childcare, healthcare, and transportation.",
        "Only recommend resources from context.available_resources — do NOT invent resources, phone numbers, or addresses.",
        "Do not guarantee eligibility, give legal or medical advice, or claim someone qualifies for benefits.",
        "If a user may be in immediate danger, tell them to contact emergency services (911) or a crisis hotline (988).",
        "Always remind users to contact each organization directly to confirm availability, hours, and requirements.",
        "Return ONLY a JSON object with this exact shape:",
        '{ "summary": string, "recommended_resources": [{ "id": string, "why": string }], "urgent_notes": string, "next_steps": [string] }',
      ].join(" ");
    case "budget_insights":
      return "Analyze food-only Plaid transactions and return JSON { summary, trends[], recommendations[] }. Never reference non-food spending.";
    case "pantry_photo_scan":
      return "Identify pantry items in an image. Return JSON { detected_items: [{ item_name, quantity?, unit?, category?, location? }] }. Do not assume — user will confirm.";
    case "inventory_photo_scan":
      return [
        "You identify visible food items in a user's photo of their pantry, fridge, freezer, or grocery receipt.",
        "Detect ONLY items you can actually see. Do NOT guess or invent items.",
        "Return ONLY valid JSON in this exact shape:",
        '{ "detected_items": [{ "item_name": string, "estimated_quantity": number, "unit": string, "category": string, "location": string, "confidence_score": number }] }',
        "category must be one of: produce, protein, dairy, grains, pantry_staples, frozen, canned_goods, household, other.",
        "location must be one of: pantry, fridge, freezer — infer from scan_type when given.",
        "confidence_score is 0-1.",
        "Never guarantee expiration dates, nutrition, or medical advice. Never auto-save or add to grocery list.",
      ].join(" ");
  }
}

// ---------- Mock responses (used until OpenAI is activated) ----------

function mockResponse(type: RequestType, ctx: Record<string, unknown>): unknown {
  switch (type) {
    case "hive_ai_chat":
      return {
        message: "Hive AI is in preparation mode. Once OpenAI is enabled, I'll answer here using your pantry, plan, and budget.",
        suggested_actions: ["View pantry", "Generate meal plan", "Open grocery list"],
      };
    case "cook_from_what_i_have":
      return { recipes: [], note: "Mock — connect OpenAI to receive real suggestions." };
    case "pantry_analysis":
      return { insights: [], low_stock_suggestions: [], waste_risk: [] };
    case "food_waste_alerts":
      return { alerts: [] };
    case "family_assistance":
      return {
        summary: "",
        recommended_resources: [],
        urgent_notes: "",
        next_steps: [],
      };
    case "budget_insights":
      return { summary: "Mock budget insight — Plaid connected, OpenAI pending.", trends: [], recommendations: [] };
    case "pantry_photo_scan":
      return { detected_items: [] };
    case "inventory_photo_scan": {
      const loc = (ctx?.location as string) || (ctx?.scan_type as string) || "pantry";
      return {
        detected_items: [
          { item_name: "Spinach", estimated_quantity: 1, unit: "bag", category: "produce", location: loc, confidence_score: 0.8 },
          { item_name: "Eggs", estimated_quantity: 12, unit: "count", category: "dairy", location: loc, confidence_score: 0.85 },
          { item_name: "Chicken Breast", estimated_quantity: 1, unit: "lb", category: "protein", location: loc, confidence_score: 0.78 },
        ],
        mocked: true,
      };
    }
    case "meal_plan_generation":
    case "meal_swap":
      return { note: "Existing generate-meal-plan / swap-meal functions remain authoritative until OpenAI is enabled.", context_keys: Object.keys(ctx) };
  }
}
