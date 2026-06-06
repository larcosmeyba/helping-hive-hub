// Save or unsave a community resource for the authenticated user.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const pf = handlePreflight(req);
  if (pf) return pf;
  const cors = buildCorsHeaders(req);

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const resource_id = body.resource_id as string | undefined;
    const notes = (body.notes ?? null) as string | null;
    const action = (body.action ?? "save") as "save" | "unsave";

    if (!resource_id) {
      return new Response(JSON.stringify({ error: "resource_id required" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (action === "unsave") {
      const { error } = await supabase
        .from("saved_family_resources")
        .delete()
        .eq("user_id", user.id)
        .eq("resource_id", resource_id);
      if (error) throw error;
      return new Response(JSON.stringify({ ok: true, saved: false }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { error } = await supabase
      .from("saved_family_resources")
      .upsert(
        { user_id: user.id, resource_id, notes },
        { onConflict: "user_id,resource_id" },
      );
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, saved: true }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
