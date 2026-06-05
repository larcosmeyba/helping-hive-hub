// Build a monthly food budget summary from food_transactions + food_budget_settings.
// Also seeds a few mock AI insights so the dashboard has copy until OpenAI is wired up.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

function monthBounds(d = new Date()) {
  const start = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1));
  const end = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0));
  return {
    start: start.toISOString().slice(0, 10),
    end: end.toISOString().slice(0, 10),
    daysInMonth: end.getUTCDate(),
    dayOfMonth: d.getUTCDate(),
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: cErr } = await sb.auth.getClaims(auth.replace("Bearer ", ""));
    if (cErr || !claims?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claims.claims.sub;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const mb = monthBounds(new Date());

    const { data: settings } = await admin
      .from("food_budget_settings")
      .select("*")
      .eq("user_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const monthlyBudget = Number(settings?.monthly_food_budget ?? 400);

    const { data: txs, error: txErr } = await admin
      .from("food_transactions")
      .select("amount, normalized_category, date")
      .eq("user_id", userId)
      .gte("date", mb.start)
      .lte("date", mb.end);
    if (txErr) throw txErr;

    const buckets: Record<string, number> = {
      groceries: 0,
      restaurants: 0,
      coffee_drinks: 0,
      food_delivery: 0,
      instacart: 0,
      other_food: 0,
    };
    let spent = 0;
    for (const t of txs ?? []) {
      const amt = Number(t.amount ?? 0);
      if (amt <= 0) continue; // Plaid uses positive for outflows on debit accounts
      buckets[t.normalized_category] = (buckets[t.normalized_category] ?? 0) + amt;
      spent += amt;
    }
    const remaining = Math.max(0, monthlyBudget - spent);
    const projection = mb.dayOfMonth > 0 ? (spent / mb.dayOfMonth) * mb.daysInMonth : spent;
    const pctUsed = monthlyBudget > 0 ? spent / monthlyBudget : 0;
    const health = Math.max(0, Math.min(100, Math.round(100 - Math.max(0, pctUsed - 0.5) * 160)));
    const potentialSavings = Math.max(0, Math.round(buckets.restaurants * 0.3 + buckets.coffee_drinks * 0.5 + buckets.food_delivery * 0.4));

    const summary = {
      user_id: userId,
      month: mb.start,
      monthly_food_budget: monthlyBudget,
      spent_total: spent,
      remaining_budget: remaining,
      grocery_spending: buckets.groceries,
      restaurant_spending: buckets.restaurants,
      coffee_spending: buckets.coffee_drinks,
      food_delivery_spending: buckets.food_delivery,
      other_food_spending: buckets.other_food + buckets.instacart,
      budget_health_score: health,
      projected_month_end_spending: projection,
      potential_savings: potentialSavings,
    };

    const { error: sErr } = await admin
      .from("food_budget_summaries")
      .upsert(summary, { onConflict: "user_id,month" });
    if (sErr) throw sErr;

    // Seed mock insights for this month (idempotent: clear + reinsert)
    await admin.from("budget_ai_insights").delete().eq("user_id", userId).eq("month", mb.start);
    const insights: Array<Record<string, unknown>> = [];
    if (buckets.restaurants > monthlyBudget * 0.3) {
      insights.push({
        user_id: userId,
        month: mb.start,
        insight_type: "spending_alert",
        title: "Restaurant spending is high",
        message: "Restaurant spending is up compared to last month. Cooking 2 more meals at home this week could save about $82.",
        estimated_savings: 82,
        related_category: "restaurants",
      });
    }
    if (buckets.groceries > 0 && buckets.groceries <= monthlyBudget * 0.5) {
      insights.push({
        user_id: userId,
        month: mb.start,
        insight_type: "good_news",
        title: "Groceries are on track",
        message: "Your grocery spending is within budget this month. Great job using your meal plan.",
        related_category: "groceries",
      });
    }
    if (buckets.coffee_drinks > 25) {
      insights.push({
        user_id: userId,
        month: mb.start,
        insight_type: "savings_opportunity",
        title: "Brew at home twice a week",
        message: "Swapping two coffee shop visits for at-home brews could save about $24 this month.",
        estimated_savings: 24,
        related_category: "coffee_drinks",
      });
    }
    if (insights.length) await admin.from("budget_ai_insights").insert(insights);

    return new Response(JSON.stringify({ success: true, summary }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message ?? e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
