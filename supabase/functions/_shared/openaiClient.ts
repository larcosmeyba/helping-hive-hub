// Shared OpenAI client for Help The Hive.
// All AI features (meal plan, hive AI, cook-from-what-i-have, family assistance,
// and the central process-hive-ai-request router) call OpenAI through this helper
// so we have one place that manages model selection, logging, and error handling.
//
// Default model is gpt-5.4-mini (set per request via `model`).
// Reads OPENAI_API_KEY from the environment. If missing, throws — callers should
// surface a clear error to the UI.

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export const DEFAULT_OPENAI_MODEL = "gpt-5.4-mini";

export type OpenAITool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters: Record<string, unknown>;
  };
};

export interface CallOpenAIArgs {
  model?: string;
  system: string;
  user: string;
  tools?: OpenAITool[];
  tool_choice?: { type: "function"; function: { name: string } } | "auto" | "none";
  response_format?: { type: "json_object" } | { type: "text" };
  temperature?: number;
  max_tokens?: number;
  // Optional logging context — when provided, a row is written to ai_request_log.
  log?: {
    admin: SupabaseClient;
    user_id: string;
    request_type: string;
  };
}

export interface OpenAICallResult {
  raw: any;
  text: string | null;
  tool_arguments: Record<string, unknown> | null;
  model_used: string;
  latency_ms: number;
}

export function adminClient(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function callOpenAI(args: CallOpenAIArgs): Promise<OpenAICallResult> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
  const model = args.model || DEFAULT_OPENAI_MODEL;
  const started = Date.now();

  const body: Record<string, unknown> = {
    model,
    messages: [
      { role: "system", content: args.system },
      { role: "user", content: args.user },
    ],
  };
  if (args.tools?.length) body.tools = args.tools;
  if (args.tool_choice) body.tool_choice = args.tool_choice;
  if (args.response_format) body.response_format = args.response_format;
  if (typeof args.temperature === "number") body.temperature = args.temperature;
  if (typeof args.max_tokens === "number") body.max_tokens = args.max_tokens;

  let logId: string | null = null;
  if (args.log) {
    const { data: row } = await args.log.admin
      .from("ai_request_log")
      .insert({
        user_id: args.log.user_id,
        request_type: args.log.request_type,
        model_used: model,
        provider: "openai",
        status: "pending",
      })
      .select("id")
      .single();
    logId = row?.id ?? null;
  }

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    await finalizeLog(args.log, logId, "error", Date.now() - started, (err as Error).message);
    throw err;
  }

  if (!res.ok) {
    const txt = await res.text();
    await finalizeLog(args.log, logId, "error", Date.now() - started, `OpenAI ${res.status}: ${txt}`);
    const err = new Error(`OpenAI ${res.status}: ${txt}`) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }

  const json = await res.json();
  const message = json?.choices?.[0]?.message ?? {};
  const text: string | null = message?.content ?? null;
  const toolCall = message?.tool_calls?.[0];
  let tool_arguments: Record<string, unknown> | null = null;
  if (toolCall?.function?.arguments) {
    try { tool_arguments = JSON.parse(toolCall.function.arguments); }
    catch { tool_arguments = null; }
  }

  await finalizeLog(args.log, logId, "ok", Date.now() - started, null);

  return {
    raw: json,
    text,
    tool_arguments,
    model_used: model,
    latency_ms: Date.now() - started,
  };
}

async function finalizeLog(
  log: CallOpenAIArgs["log"],
  logId: string | null,
  status: "ok" | "error",
  latency_ms: number,
  error_message: string | null,
) {
  if (!log || !logId) return;
  await log.admin
    .from("ai_request_log")
    .update({ status, latency_ms, error_message })
    .eq("id", logId);
}
