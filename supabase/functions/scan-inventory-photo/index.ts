// Stores an uploaded inventory photo and returns mock detected items.
// TODO(OpenAI Vision): replace mock detection with real model call.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  const pf = handlePreflight(req); if (pf) return pf;
  const cors = buildCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...cors, "Content-Type": "application/json" } });

    const body = await req.json().catch(() => ({}));
    const imageBase64: string | undefined = body.image_base64;
    const scanType: string = body.scan_type ?? "pantry";
    if (!imageBase64) return new Response(JSON.stringify({ error: "image_base64 required" }), { status: 400, headers: { ...cors, "Content-Type": "application/json" } });

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const filename = `${user.id}/${Date.now()}.jpg`;
    const bytes = Uint8Array.from(atob(imageBase64.replace(/^data:image\/\w+;base64,/, "")), c => c.charCodeAt(0));
    const { error: upErr } = await admin.storage.from("inventory-photos").upload(filename, bytes, { contentType: "image/jpeg", upsert: false });
    if (upErr) throw upErr;

    // Mock detection. TODO: call OpenAI Vision.
    const detected = [
      { item_name: "Chicken Breast", quantity: "1", unit: "lb", category: "protein", location: scanType },
      { item_name: "Spinach", quantity: "1", unit: "bag", category: "produce", location: scanType },
      { item_name: "Eggs", quantity: "12", unit: "count", category: "dairy", location: scanType },
    ];

    const { data: photo } = await admin.from("inventory_photos").insert({
      user_id: user.id,
      image_url: filename,
      scan_type: scanType,
      ai_processed: true,
      detected_items_json: detected,
    }).select("id").single();

    return new Response(JSON.stringify({ photo_id: photo?.id, detected_items: detected }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? String(err) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
