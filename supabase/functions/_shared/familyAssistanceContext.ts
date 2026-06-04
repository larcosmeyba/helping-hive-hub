// Builds family_assistance_context consumed by mock AI now and OpenAI later.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

export async function buildFamilyAssistanceContext(supabase: ReturnType<typeof createClient>, userId: string) {
  const [{ data: profile }, { data: needs }, { data: saved }] = await Promise.all([
    supabase.from("family_assistance_profiles").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("assistance_needs").select("*").eq("user_id", userId).maybeSingle(),
    supabase.from("saved_resources").select("*").eq("user_id", userId),
  ]);

  let localResources: any[] = [];
  if (profile?.zip_code) {
    const { data } = await supabase
      .from("local_resources")
      .select("*")
      .or(`zip_code.eq.${profile.zip_code},zip_code.is.null`)
      .limit(50);
    localResources = data ?? [];
  }

  return {
    user_id: userId,
    zip_code: profile?.zip_code ?? null,
    household_size: profile?.household_size ?? null,
    children_under_5: profile?.children_under_5 ?? 0,
    children_5_to_12: profile?.children_5_to_12 ?? 0,
    teenagers: profile?.teenagers ?? 0,
    seniors_65_plus: profile?.seniors_65_plus ?? 0,
    employment_status: profile?.employment_status ?? null,
    income_range: profile?.monthly_income_range ?? null,
    assistance_needs: needs ?? {},
    current_benefits: {
      snap: profile?.currently_receiving_snap ?? false,
      wic: profile?.currently_receiving_wic ?? false,
      medicaid: profile?.currently_receiving_medicaid ?? false,
    },
    local_resources_available: localResources,
    saved_resources: saved ?? [],
  };
}
