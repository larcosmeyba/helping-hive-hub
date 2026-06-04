// Saves the Hive Family Assistance questionnaire into family_assistance_profiles + assistance_needs.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const pf = handlePreflight(req); if (pf) return pf;
  const cors = buildCorsHeaders(req);
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const body = await req.json();

    const profileFields = [
      "zip_code","household_size","children_under_5","children_5_to_12","teenagers","seniors_65_plus",
      "employment_status","lost_job_recently","reduced_hours_recently","monthly_income_range",
      "currently_receiving_snap","currently_receiving_wic","currently_receiving_medicaid",
    ];
    const needFields = [
      "needs_food_assistance","needs_snap","needs_wic","needs_diapers_formula","needs_housing",
      "needs_utilities","needs_healthcare","needs_transportation","needs_childcare","needs_employment",
    ];

    const profilePayload: any = { user_id: user.id };
    for (const k of profileFields) if (k in body) profilePayload[k] = body[k];
    const needsPayload: any = { user_id: user.id };
    for (const k of needFields) if (k in body) needsPayload[k] = body[k];

    const { error: e1 } = await supabase.from("family_assistance_profiles").upsert(profilePayload, { onConflict: "user_id" });
    if (e1) throw e1;
    const { error: e2 } = await supabase.from("assistance_needs").upsert(needsPayload, { onConflict: "user_id" });
    if (e2) throw e2;

    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? String(err) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
