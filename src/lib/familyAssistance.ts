// Client helpers for Hive Family Assistance flows.
import { supabase } from "@/integrations/supabase/client";

export type Questionnaire = {
  zip_code?: string;
  household_size?: number;
  children_under_5?: number;
  children_5_to_12?: number;
  teenagers?: number;
  seniors_65_plus?: number;
  employment_status?: string;
  lost_job_recently?: boolean;
  reduced_hours_recently?: boolean;
  monthly_income_range?: string;
  currently_receiving_snap?: boolean;
  currently_receiving_wic?: boolean;
  currently_receiving_medicaid?: boolean;
  needs_food_assistance?: boolean;
  needs_snap?: boolean;
  needs_wic?: boolean;
  needs_diapers_formula?: boolean;
  needs_housing?: boolean;
  needs_utilities?: boolean;
  needs_healthcare?: boolean;
  needs_transportation?: boolean;
  needs_childcare?: boolean;
  needs_employment?: boolean;
};

export async function submitQuestionnaire(payload: Questionnaire) {
  const { data, error } = await supabase.functions.invoke("submit-family-assistance-questionnaire", { body: payload });
  if (error) throw error;
  return data;
}

export async function matchFamilyResources() {
  const { data, error } = await supabase.functions.invoke("match-family-resources");
  if (error) throw error;
  return data as { matches: any[]; disclaimer: string };
}

export async function saveResource(resourceId: string, notes?: string) {
  const { data, error } = await supabase.functions.invoke("save-resource", { body: { resource_id: resourceId, notes } });
  if (error) throw error;
  return data;
}

export async function updateResourceStatus(resourceId: string, status: "saved" | "contacted" | "applied" | "completed", notes?: string) {
  const { data, error } = await supabase.functions.invoke("update-resource-status", { body: { resource_id: resourceId, status, notes } });
  if (error) throw error;
  return data;
}
