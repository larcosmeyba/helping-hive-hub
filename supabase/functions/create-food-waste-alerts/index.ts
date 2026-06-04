// Scans pantry_items for expiration risk and inserts/updates rows in food_waste_alerts.
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

    const { data: items } = await supabase
      .from("pantry_items")
      .select("id, item_name, expiration_date, is_low_stock")
      .eq("user_id", user.id);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const alerts: any[] = [];

    for (const it of items ?? []) {
      let alertType: string | null = null;
      let days: number | null = null;
      if (it.expiration_date) {
        const exp = new Date(it.expiration_date);
        exp.setHours(0, 0, 0, 0);
        days = Math.round((exp.getTime() - today.getTime()) / 86400000);
        if (days < 0) alertType = "expired";
        else if (days === 0) alertType = "expiring_today";
        else if (days <= 3) alertType = "expiring_soon";
      }
      if (!alertType && it.is_low_stock) alertType = "low_stock";
      if (!alertType) continue;

      alerts.push({
        user_id: user.id,
        pantry_item_id: it.id,
        alert_type: alertType,
        days_until_expiration: days,
        estimated_value: null,
        message: `${it.item_name} ${alertType === "expired" ? "has expired" : alertType === "expiring_today" ? "expires today" : alertType === "expiring_soon" ? `expires in ${days} day${days === 1 ? "" : "s"}` : "is running low"}`,
        resolved: false,
      });
    }

    // Resolve old alerts for items not in new set, then upsert new ones.
    await supabase.from("food_waste_alerts").update({ resolved: true }).eq("user_id", user.id).eq("resolved", false);
    if (alerts.length > 0) {
      await supabase.from("food_waste_alerts").insert(alerts);
    }

    return new Response(JSON.stringify({ alerts_created: alerts.length, alerts }), { headers: { ...cors, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? String(err) }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });
  }
});
