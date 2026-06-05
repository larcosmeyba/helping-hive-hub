// Client helper: ALL AI requests in the app should go through this.
// Routes everything to the `process-hive-ai-request` edge function so we can
// swap providers/models centrally without touching call sites.
import { supabase } from "@/integrations/supabase/client";

export type HiveAiRequestType =
  | "meal_plan_generation"
  | "meal_swap"
  | "hive_ai_chat"
  | "cook_from_what_i_have"
  | "pantry_analysis"
  | "food_waste_alerts"
  | "family_assistance"
  | "budget_insights"
  | "pantry_photo_scan";

export interface HiveAiRequest {
  request_type: HiveAiRequestType;
  context?: Record<string, unknown>;
  prompt?: string;
  options?: { model?: string; temperature?: number; max_tokens?: number };
}

export interface HiveAiResponse<T = unknown> {
  ok: boolean;
  request_type: HiveAiRequestType;
  model_used: string;
  mocked: boolean;
  data: T;
  log_id?: string;
  error?: string;
}

export async function callHiveAi<T = unknown>(req: HiveAiRequest): Promise<HiveAiResponse<T>> {
  const { data, error } = await supabase.functions.invoke("process-hive-ai-request", {
    body: req,
  });
  if (error) throw new Error(error.message);
  return data as HiveAiResponse<T>;
}
