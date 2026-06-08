// Hive Family Assistance — finds local resources for a family based on
// ZIP code, selected categories, urgency, and household context.
//
// Flow:
//   1. Save the intake into family_assistance_requests.
//   2. Query community_resources by category + ZIP/state, urgent first.
//   3. Call process-hive-ai-request with request_type=family_assistance to
//      let OpenAI rank + explain (passing only the candidates we already have).
//   4. Save the AI recommendation. If AI fails or is disabled, fall back to
//      backend ranking only.
//   5. Return ranked results + summary + safety copy to the frontend.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";

const FALLBACK_MESSAGE =
  "AI recommendations are currently unavailable, but here are resources based on your ZIP code and selected needs.";

const SAFETY_DISCLAIMER =
  "Resource availability, eligibility, hours, and services can change. Please contact the organization directly before visiting.";

Deno.serve(async (req) => {
  const pf = handlePreflight(req);
  if (pf) return pf;
  const cors = buildCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const body = await req.json().catch(() => ({}));
    const zip_code: string | null = body.zip_code ?? null;
    const selected_categories: string[] = Array.isArray(body.selected_categories)
      ? body.selected_categories.map((c: unknown) => String(c))
      : [];
    const urgency_level: "urgent" | "normal" =
      body.urgency_level === "urgent" ? "urgent" : "normal";
    const household_size: number | null =
      typeof body.household_size === "number" ? body.household_size : null;
    const has_children: boolean | null =
      typeof body.has_children === "boolean" ? body.has_children : null;
    const employment_status: string | null = body.employment_status ?? null;
    const receives_benefits: string | null = body.receives_benefits ?? null;

    // 1. Save the request
    const { data: requestRow, error: reqErr } = await admin
      .from("family_assistance_requests")
      .insert({
        user_id: user.id,
        zip_code,
        selected_categories,
        urgency_level,
        household_size,
        has_children,
        employment_status,
        receives_benefits,
      })
      .select("id")
      .single();
    if (reqErr) throw reqErr;
    const request_id = requestRow.id as string;

    // 2. Query community resources
    let query = admin
      .from("community_resources")
      .select("*")
      .eq("active", true)
      .limit(50);
    if (selected_categories.length > 0) {
      query = query.in("category", selected_categories);
    }
    const { data: allResources, error: resErr } = await query;
    if (resErr) throw resErr;
    const resources = allResources ?? [];

    // Backend ranking: exact ZIP > same state > others, urgent emergency first
    const ranked = [...resources].sort((a, b) => {
      const score = (r: any) => {
        let s = 0;
        if (urgency_level === "urgent" && r.emergency_available) s += 100;
        if (zip_code && r.zip_code === zip_code) s += 50;
        if (zip_code && r.zip_code && r.zip_code.slice(0, 3) === zip_code.slice(0, 3)) s += 10;
        return s;
      };
      return score(b) - score(a);
    });

    // 3. Call OpenAI router for ranking + explanation
    let aiSummary = "";
    let urgentNotes = "";
    let nextSteps: string[] = [];
    let aiOrderedIds: string[] = ranked.map((r) => r.id);
    let mocked = true;

    try {
      const aiRes = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-hive-ai-request`,
        {
          method: "POST",
          headers: {
            Authorization: authHeader,
            apikey: Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            request_type: "family_assistance",
            context: {
              zip_code,
              selected_categories,
              urgency_level,
              household_size,
              has_children,
              employment_status,
              receives_benefits,
              available_resources: ranked.map((r) => ({
                id: r.id,
                name: r.name,
                category: r.category,
                description: r.description,
                emergency_available: r.emergency_available,
                zip_code: r.zip_code,
                state: r.state,
              })),
            },
          }),
        },
      );
      if (aiRes.ok) {
        const aiJson = await aiRes.json();
        mocked = Boolean(aiJson?.mocked);
        const data = aiJson?.data ?? {};
        aiSummary = typeof data.summary === "string" ? data.summary : "";
        urgentNotes = typeof data.urgent_notes === "string" ? data.urgent_notes : "";
        nextSteps = Array.isArray(data.next_steps) ? data.next_steps.map((s: unknown) => String(s)) : [];
        if (Array.isArray(data.recommended_resources)) {
          const ids = data.recommended_resources
            .map((x: any) => (typeof x === "string" ? x : x?.id))
            .filter(Boolean);
          if (ids.length > 0) {
            const idSet = new Set<string>(ids);
            const head = ranked.filter((r) => idSet.has(r.id));
            const tail = ranked.filter((r) => !idSet.has(r.id));
            aiOrderedIds = [...head, ...tail].map((r) => r.id);
          }
        }
      }
    } catch (err) {
      console.warn("[find-family-resources] AI call failed", err);
    }

    // 4. Save AI recommendation
    await admin.from("family_assistance_ai_recommendations").insert({
      user_id: user.id,
      request_id,
      recommended_resource_ids: aiOrderedIds,
      ai_summary: aiSummary,
      urgent_notes: urgentNotes,
      next_steps: nextSteps,
    });

    // Re-order final results by aiOrderedIds
    const byId = new Map(ranked.map((r) => [r.id, r] as const));
    const finalResources = aiOrderedIds
      .map((id) => byId.get(id))
      .filter(Boolean) as any[];

    // 5. Ask OpenAI to generate additional ZIP-specific local resources
    //    that may not yet be in our community_resources DB.
    const aiLocalResources = await generateLocalResourcesWithOpenAI({
      zip_code,
      selected_categories,
      urgency_level,
      household_size,
      has_children,
    });

    // Merge: AI-generated local resources first, then ranked DB results.
    // Dedupe by lowercased name.
    const seenNames = new Set<string>();
    const mergedResources: any[] = [];
    for (const r of [...aiLocalResources, ...finalResources]) {
      const key = String(r?.name || "").toLowerCase().trim();
      if (!key || seenNames.has(key)) continue;
      seenNames.add(key);
      mergedResources.push(r);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        request_id,
        ai_enabled: !mocked || aiLocalResources.length > 0,
        ai_summary: aiSummary,
        urgent_notes: urgentNotes,
        next_steps: nextSteps,
        resources: mergedResources,
        ai_local_count: aiLocalResources.length,
        disclaimer: SAFETY_DISCLAIMER,
        fallback_message: mocked && aiLocalResources.length === 0 ? FALLBACK_MESSAGE : null,
      }),
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});

// ---------- OpenAI: area-specific resource generator ----------
async function generateLocalResourcesWithOpenAI(args: {
  zip_code: string | null;
  selected_categories: string[];
  urgency_level: "urgent" | "normal";
  household_size: number | null;
  has_children: boolean | null;
}): Promise<any[]> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key || !args.zip_code) return [];

  const categoriesText = args.selected_categories.length > 0
    ? args.selected_categories.join(", ")
    : "food, housing, healthcare, utilities, childcare";

  const prompt = `List up to 6 real, currently operating local assistance organizations serving ZIP code ${args.zip_code} in the U.S.
Family context: household of ${args.household_size ?? "unknown"} people${args.has_children ? " with children" : ""}. Urgency: ${args.urgency_level}.
Needs: ${categoriesText}.

Return ONLY valid JSON in this shape:
{"resources":[{"id":"","name":"","category":"","description":"","address":"","city":"","state":"","phone":"","website":"","emergency_available":false,"tags":[]}]}

Rules:
- Only include real, well-known organizations you have high confidence operate at or near this ZIP.
- Prefer named local nonprofits, county/state agencies, churches, and community pantries.
- "id" = short slug like "ai-foodbank-<short-name>".
- "description" = one sentence (max 160 chars).
- Never fabricate phone numbers or addresses; leave blank if unsure.
- If you cannot confidently list any, return {"resources":[]}.`;

  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a U.S. family-assistance resource finder. Only return organizations you have high confidence operate in the requested area. Never invent contact details — leave fields blank when unsure." },
          { role: "user", content: prompt },
        ],
      }),
    });
    if (!r.ok) {
      console.error("[find-family-resources] OpenAI error", r.status, await r.text().catch(() => ""));
      return [];
    }
    const j = await r.json();
    const content = j?.choices?.[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(content);
    const arr: any[] = Array.isArray(parsed?.resources) ? parsed.resources : [];
    return arr.slice(0, 6).map((x, i) => ({
      id: String(x.id || `ai-fam-${i}-${String(x.name || "").slice(0, 20)}`),
      name: String(x.name || "").trim(),
      category: String(x.category || (args.selected_categories[0] ?? "general")),
      description: x.description || null,
      address: x.address || null,
      city: x.city || null,
      state: x.state || null,
      zip_code: args.zip_code,
      phone: x.phone || null,
      website: x.website || null,
      emergency_available: Boolean(x.emergency_available),
      tags: Array.isArray(x.tags) ? x.tags.slice(0, 4).map(String) : [],
      source: "ai_generated",
      active: true,
    })).filter((r) => r.name);
  } catch (e) {
    console.error("[find-family-resources] OpenAI exception", e);
    return [];
  }
}
