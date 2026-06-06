// Hive Family Assistance — client helpers.
// Routes resource search through find-family-resources edge function.
import { supabase } from "@/integrations/supabase/client";

export type FamilyCategory =
  | "food_assistance"
  | "housing_rent"
  | "utilities"
  | "diapers_formula"
  | "childcare_school"
  | "healthcare_prescriptions"
  | "transportation"
  | "employment_training"
  | "senior_resources"
  | "mental_health"
  | "household_essentials";

export interface FindFamilyResourcesInput {
  zip_code: string;
  selected_categories: FamilyCategory[];
  urgency_level: "urgent" | "normal";
  household_size?: number | null;
  has_children?: boolean | null;
  employment_status?: "employed" | "unemployed" | "prefer_not_to_say" | null;
  receives_benefits?: "yes" | "no" | "not_sure" | "prefer_not_to_say" | null;
}

export interface CommunityResource {
  id: string;
  name: string;
  category: string;
  subcategory: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  county: string | null;
  latitude: number | null;
  longitude: number | null;
  phone: string | null;
  website: string | null;
  email: string | null;
  hours: string | null;
  eligibility_notes: string | null;
  what_to_bring: string | null;
  emergency_available: boolean;
  source: string | null;
  last_verified_at: string | null;
}

export interface FindFamilyResourcesResponse {
  ok: boolean;
  request_id: string;
  ai_enabled: boolean;
  ai_summary: string;
  urgent_notes: string;
  next_steps: string[];
  resources: CommunityResource[];
  disclaimer: string;
  fallback_message: string | null;
}

export async function findFamilyResources(
  input: FindFamilyResourcesInput,
): Promise<FindFamilyResourcesResponse> {
  const { data, error } = await supabase.functions.invoke("find-family-resources", {
    body: input,
  });
  if (error) throw error;
  return data as FindFamilyResourcesResponse;
}

export async function saveFamilyResource(resource_id: string, notes?: string) {
  const { data, error } = await supabase.functions.invoke("save-family-resource", {
    body: { resource_id, notes, action: "save" },
  });
  if (error) throw error;
  return data;
}

export async function unsaveFamilyResource(resource_id: string) {
  const { data, error } = await supabase.functions.invoke("save-family-resource", {
    body: { resource_id, action: "unsave" },
  });
  if (error) throw error;
  return data;
}

export async function getSavedFamilyResources() {
  const { data, error } = await supabase.functions.invoke("get-saved-family-resources", {
    body: {},
  });
  if (error) throw error;
  return data as { ok: boolean; saved: Array<{ id: string; notes: string | null; created_at: string; resource_id: string; resource: CommunityResource }> };
}

export const FAMILY_CATEGORIES: Array<{
  key: FamilyCategory;
  label: string;
  description: string;
  icon: string;
}> = [
  { key: "food_assistance", label: "Food Assistance", description: "Food banks, pantries, meal programs, and SNAP guidance.", icon: "Apple" },
  { key: "housing_rent", label: "Housing & Rent", description: "Rent support, housing programs, eviction prevention, and shelter resources.", icon: "Home" },
  { key: "utilities", label: "Utilities Help", description: "Electricity, water, gas, internet, and shutoff prevention programs.", icon: "Zap" },
  { key: "diapers_formula", label: "Diapers, Formula & Baby Supplies", description: "Diapers, formula, baby food, wipes, and family essentials.", icon: "Baby" },
  { key: "childcare_school", label: "Childcare & School Support", description: "Childcare assistance, school meals, after-school programs, and family services.", icon: "GraduationCap" },
  { key: "healthcare_prescriptions", label: "Healthcare & Prescriptions", description: "Low-cost clinics, insurance help, prescription assistance, and care programs.", icon: "HeartPulse" },
  { key: "transportation", label: "Transportation", description: "Bus passes, gas cards, rides to appointments, and transportation assistance.", icon: "Car" },
  { key: "employment_training", label: "Employment & Job Training", description: "Job search help, unemployment support, training programs, and workforce resources.", icon: "Briefcase" },
  { key: "senior_resources", label: "Senior Resources", description: "Meals, transportation, healthcare, and support for older adults.", icon: "UserRound" },
  { key: "mental_health", label: "Mental Health Support", description: "Crisis lines, counseling, community care, and emotional support.", icon: "Brain" },
  { key: "household_essentials", label: "Household Essentials", description: "Clothing, hygiene products, cleaning supplies, and basic needs.", icon: "ShoppingBasket" },
];
