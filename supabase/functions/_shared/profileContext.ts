// Deno mirror of src/lib/aiProfileContext.ts — keep in sync.
// Used by edge functions (generate-meal-plan, fridge-chef, future Hive
// Assistant) to inject a normalized profile context into AI prompts.

export interface ProfileContext {
  household: {
    size: number;
    children_under_5: number;
    children_5_to_12: number;
    teenagers: number;
    seniors_65_plus: number;
  };
  budget: { weekly: number | null };
  location: { zip_code: string | null; city: string | null; state: string | null };
  store: { home_store: string | null; preferred_store_id: string | null };
  assistance: string[];
  dietary: string[];
  cookingConfidence: "beginner" | "intermediate" | "advanced" | null;
  foodWaste: { alerts_enabled: boolean; recipe_suggestions_enabled: boolean };
  plaidInterest: "yes" | "later" | "skip" | null;
  apolloGoals: string[];
}

const ASSISTANCE_KEYS: Array<[string, string]> = [
  ["assistance_food", "food"],
  ["assistance_snap", "snap"],
  ["assistance_wic", "wic"],
  ["assistance_diapers", "diapers"],
  ["assistance_housing", "housing"],
  ["assistance_utilities", "utilities"],
  ["assistance_healthcare", "healthcare"],
  ["assistance_employment", "employment"],
  ["assistance_transportation", "transportation"],
  ["assistance_childcare", "childcare"],
];

const GOAL_KEYS: Array<[string, string]> = [
  ["goal_lose_weight", "lose_weight"],
  ["goal_build_muscle", "build_muscle"],
  ["goal_stay_active", "stay_active"],
  ["goal_improve_mobility", "improve_mobility"],
];

// deno-lint-ignore no-explicit-any
export function buildProfileContext(p: Record<string, any> | null | undefined): ProfileContext {
  const profile = p ?? {};
  return {
    household: {
      size: profile.household_size ?? 1,
      children_under_5: profile.children_under_5 ?? 0,
      children_5_to_12: profile.children_5_to_12 ?? 0,
      teenagers: profile.teenagers ?? 0,
      seniors_65_plus: profile.seniors_65_plus ?? 0,
    },
    budget: { weekly: profile.weekly_budget != null ? Number(profile.weekly_budget) : null },
    location: {
      zip_code: profile.zip_code ?? null,
      city: profile.city ?? null,
      state: profile.state ?? null,
    },
    store: {
      home_store: profile.home_store ?? null,
      preferred_store_id: profile.preferred_store_id ?? null,
    },
    assistance: ASSISTANCE_KEYS.filter(([k]) => profile[k] === true).map(([, v]) => v),
    dietary: Array.isArray(profile.dietary_preferences) ? profile.dietary_preferences : [],
    cookingConfidence: (profile.cooking_confidence as ProfileContext["cookingConfidence"]) ?? null,
    foodWaste: {
      alerts_enabled: profile.food_waste_alerts_enabled ?? true,
      recipe_suggestions_enabled: profile.food_waste_recipe_suggestions_enabled ?? true,
    },
    plaidInterest: (profile.plaid_interest as ProfileContext["plaidInterest"]) ?? null,
    apolloGoals: GOAL_KEYS.filter(([k]) => profile[k] === true).map(([, v]) => v),
  };
}

export function profileContextToPromptBlock(ctx: ProfileContext): string {
  const lines: string[] = [];
  lines.push(`Household: ${ctx.household.size} total (under5=${ctx.household.children_under_5}, 5-12=${ctx.household.children_5_to_12}, teens=${ctx.household.teenagers}, seniors65+=${ctx.household.seniors_65_plus})`);
  if (ctx.budget.weekly != null) lines.push(`Weekly grocery budget: $${ctx.budget.weekly}`);
  if (ctx.location.zip_code) lines.push(`Location: ${ctx.location.city ?? ""} ${ctx.location.state ?? ""} ${ctx.location.zip_code}`.trim());
  if (ctx.store.home_store) lines.push(`Home store: ${ctx.store.home_store}`);
  if (ctx.dietary.length) lines.push(`Dietary: ${ctx.dietary.join(", ")}`);
  if (ctx.cookingConfidence) lines.push(`Cooking confidence: ${ctx.cookingConfidence}`);
  if (ctx.assistance.length) lines.push(`Family assistance needs: ${ctx.assistance.join(", ")}`);
  if (ctx.apolloGoals.length) lines.push(`Wellness goals: ${ctx.apolloGoals.join(", ")}`);
  lines.push(`Food waste alerts: ${ctx.foodWaste.alerts_enabled ? "on" : "off"}; recipe suggestions: ${ctx.foodWaste.recipe_suggestions_enabled ? "on" : "off"}`);
  if (ctx.plaidInterest) lines.push(`Plaid budget tracking interest: ${ctx.plaidInterest}`);
  return lines.join("\n");
}
