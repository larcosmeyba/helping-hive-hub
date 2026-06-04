// Returns local resources matched to the user's profile + needs.
// Mock AI ranking + hedged plain-language explanation now. TODO: OpenAI later.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { buildFamilyAssistanceContext } from "../_shared/familyAssistanceContext.ts";

const NEED_TO_CATEGORIES: Record<string, string[]> = {
  needs_food_assistance: ["food_bank"],
  needs_snap: ["snap"],
  needs_wic: ["wic"],
  needs_diapers_formula: ["diapers_formula"],
  needs_housing: ["housing"],
  needs_utilities: ["utilities"],
  needs_healthcare: ["healthcare"],
  needs_transportation: ["transportation"],
  needs_childcare: ["childcare"],
  needs_employment: ["employment"],
};

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

    const ctx = await buildFamilyAssistanceContext(supabase, user.id);

    const categories = new Set<string>();
    for (const [k, cats] of Object.entries(NEED_TO_CATEGORIES)) {
      if ((ctx.assistance_needs as any)?.[k]) cats.forEach((c) => categories.add(c));
    }

    const zip = ctx.zip_code;
    let query = supabase.from("local_resources").select("*").limit(50);
    if (categories.size > 0) query = query.in("category", Array.from(categories));
    if (zip) query = query.or(`zip_code.eq.${zip},zip_code.is.null`);

    const { data: resources, error } = await query;
    if (error) throw error;

    const matches = (resources ?? []).map((r: any) => ({
      ...r,
      ai_explanation: `Based on your answers, you may qualify for ${r.resource_name}. Please confirm eligibility directly with the program.`,
    }));

    return new Response(JSON.stringify({ matches, disclaimer: "These results are informational. You may qualify — please confirm eligibility directly with each program." }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? String(err) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
