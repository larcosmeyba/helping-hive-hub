// Scans an inventory photo (pantry, fridge, freezer, or receipt).
// - Uploads image to Supabase Storage (private bucket: inventory-photos).
// - Saves inventory_photos row.
// - Routes detection through process-hive-ai-request with request_type=inventory_photo_scan.
// - Persists detected items to scanned_inventory_items (confirmed=false) for user review.
// - Does NOT save to pantry_items — that happens in confirm-scanned-items.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { buildCorsHeaders, handlePreflight } from "../_shared/cors.ts";
import { normalize } from "../_shared/pantry.ts";

const ALLOWED_SCAN = new Set(["pantry", "fridge", "freezer", "receipt"]);
const ALLOWED_LOCATION = new Set(["pantry", "fridge", "freezer"]);

Deno.serve(async (req) => {
  const pf = handlePreflight(req); if (pf) return pf;
  const cors = buildCorsHeaders(req);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401, cors);

    const body = await req.json().catch(() => ({}));
    const imageBase64: string | undefined = body.image_base64;
    const scanType: string = ALLOWED_SCAN.has(body.scan_type) ? body.scan_type : "pantry";
    const location: string = ALLOWED_LOCATION.has(body.location)
      ? body.location
      : (scanType === "receipt" ? "pantry" : scanType);

    if (!imageBase64) return json({ error: "image_base64 required" }, 400, cors);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // 1. Upload to storage (private bucket)
    const filename = `${user.id}/${Date.now()}.jpg`;
    const bytes = Uint8Array.from(
      atob(imageBase64.replace(/^data:image\/\w+;base64,/, "")),
      (c) => c.charCodeAt(0),
    );
    const { error: upErr } = await admin.storage
      .from("inventory-photos")
      .upload(filename, bytes, { contentType: "image/jpeg", upsert: false });
    if (upErr) throw upErr;

    // 2. Insert inventory_photos row
    const { data: photo, error: photoErr } = await admin
      .from("inventory_photos")
      .insert({
        user_id: user.id,
        image_url: filename,
        scan_type: scanType,
        location,
        ai_processed: false,
      })
      .select("id")
      .single();
    if (photoErr) throw photoErr;
    const photoId = photo.id;

    // 3. Signed URL (10 min) for the AI router to pass to a vision model later
    const { data: signed } = await admin.storage
      .from("inventory-photos")
      .createSignedUrl(filename, 600);
    const signedUrl = signed?.signedUrl ?? "";

    // 4. Route through central AI router
    let detected: any[] = [];
    let mocked = true;
    try {
      const routerRes = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/process-hive-ai-request`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: authHeader,
            apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
          },
          body: JSON.stringify({
            request_type: "inventory_photo_scan",
            context: {
              scan_type: scanType,
              location,
              image_url: signedUrl,
              instructions: "Detect visible food items. Return structured JSON only.",
            },
          }),
        },
      );
      const routerJson = await routerRes.json();
      if (routerJson?.ok) {
        detected = Array.isArray(routerJson.data?.detected_items)
          ? routerJson.data.detected_items
          : [];
        mocked = Boolean(routerJson.mocked);
      }
    } catch (err) {
      console.warn("[scan-inventory-photo] router error", err);
    }

    // 5. Save detected items as unconfirmed
    const rows = detected.map((d: any) => ({
      user_id: user.id,
      inventory_photo_id: photoId,
      item_name: String(d.item_name ?? "").slice(0, 200),
      normalized_item_name: normalize(String(d.item_name ?? "")),
      quantity: d.estimated_quantity != null ? String(d.estimated_quantity) : (d.quantity ?? null),
      unit: d.unit ?? null,
      category: d.category ?? null,
      location: ALLOWED_LOCATION.has(d.location) ? d.location : location,
      confidence_score: typeof d.confidence_score === "number" ? d.confidence_score : null,
      confirmed: false,
      rejected: false,
    })).filter((r) => r.item_name.length > 0);

    let savedItems: any[] = [];
    if (rows.length) {
      const { data: inserted, error: insErr } = await admin
        .from("scanned_inventory_items")
        .insert(rows)
        .select();
      if (insErr) throw insErr;
      savedItems = inserted ?? [];
    }

    await admin
      .from("inventory_photos")
      .update({ ai_processed: true, detected_items_json: detected })
      .eq("id", photoId);

    return json({
      photo_id: photoId,
      scan_type: scanType,
      location,
      mocked,
      detected_items: savedItems,
    }, 200, cors);
  } catch (err: any) {
    console.error("scan-inventory-photo error", err);
    return json({ error: err?.message ?? String(err) }, 500, cors);
  }
});

function json(payload: unknown, status: number, cors: Record<string, string>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}
