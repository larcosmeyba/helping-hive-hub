// Updates the status (saved | contacted | applied | completed) and notes on a saved resource.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";

const VALID = new Set(["saved", "contacted", "applied", "completed"]);

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

    const { resource_id, status, notes } = await req.json();
    if (!resource_id || !VALID.has(status)) return new Response(JSON.stringify({ error: "resource_id and valid status required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const update: any = { status };
    if (notes !== undefined) update.notes = notes;

    const { data, error } = await supabase
      .from("saved_resources")
      .update(update)
      .eq("user_id", user.id)
      .eq("resource_id", resource_id)
      .select()
      .single();
    if (error) throw error;

    return new Response(JSON.stringify({ saved: data }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? String(err) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
