// Plaid-powered grocery spending insights shown at the top of the
// Weekly Meal Plan tab. Pulls real transactions from food_transactions
// (category = 'groceries') and the current month summary from
// food_budget_summaries. Falls back to a "Connect Plaid" CTA when no
// connection exists.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, TrendingDown, Wallet, CalendarRange, BarChart3, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  getBudgetSummary,
  getPlaidConnectionStatus,
  type BudgetSummary,
} from "@/lib/foodBudget";

interface WeeklyBucket {
  weekStart: string; // ISO date Mon
  total: number;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function isoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function MealPlanGroceryInsights() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [weeks, setWeeks] = useState<WeeklyBucket[]>([]);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const since = new Date();
      since.setDate(since.getDate() - 8 * 7);
      const [s, conn, tx] = await Promise.all([
        getBudgetSummary(user.id),
        getPlaidConnectionStatus(user.id).catch(() => false),
        supabase
          .from("food_transactions")
          .select("amount, date")
          .eq("user_id", user.id)
          .eq("normalized_category", "groceries")
          .gte("date", isoDate(since))
          .order("date", { ascending: false }),
      ]);
      if (cancelled) return;

      const buckets = new Map<string, number>();
      for (let i = 0; i < 8; i++) {
        const wStart = startOfWeek(new Date());
        wStart.setDate(wStart.getDate() - i * 7);
        buckets.set(isoDate(wStart), 0);
      }
      for (const t of (tx.data ?? []) as Array<{ amount: number; date: string }>) {
        const ws = isoDate(startOfWeek(new Date(t.date)));
        if (buckets.has(ws)) buckets.set(ws, (buckets.get(ws) ?? 0) + Number(t.amount));
      }
      const ordered: WeeklyBucket[] = Array.from(buckets.entries())
        .map(([weekStart, total]) => ({ weekStart, total }))
        .sort((a, b) => (a.weekStart < b.weekStart ? -1 : 1));

      setSummary(s);
      setWeeks(ordered);
      setConnected(conn);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading || !summary) {
    return (
      <div className="bg-white border border-[#EEE7DA] rounded-2xl p-4 md:p-5 animate-pulse">
        <div className="h-3 w-40 bg-[#F2EAD3] rounded mb-3" />
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-16 bg-[#F8F3E2] rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  const thisWeekTotal = weeks[weeks.length - 1]?.total ?? 0;
  const lastWeekTotal = weeks[weeks.length - 2]?.total ?? 0;
  const last4 = weeks.slice(-4);
  const avgWeekly =
    last4.length > 0 ? last4.reduce((s, w) => s + w.total, 0) / last4.length : 0;
  const trendPct =
    lastWeekTotal > 0 ? ((thisWeekTotal - lastWeekTotal) / lastWeekTotal) * 100 : 0;
  const trendUp = trendPct > 0;

  const monthlyBudget = summary.monthly_food_budget || 0;
  const monthlyGrocery = summary.grocery_spending || 0;
  // Approximate weekly grocery budget = monthly / 4.33
  const weeklyBudgetEst = monthlyBudget > 0 ? monthlyBudget / 4.33 : 0;
  const budgetPct =
    monthlyBudget > 0 ? Math.min(100, (monthlyGrocery / monthlyBudget) * 100) : 0;
  const maxWeek = Math.max(1, ...weeks.map((w) => w.total));

  const showConnectBanner = !connected || summary.isMock;

  return (
    <div className="space-y-3">
      <div className="bg-white border border-[#EEE7DA] rounded-2xl p-4 md:p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#1F5A3D]" />
            <h2 className="font-bold text-[14px] text-[#1a1a1a]">
              Grocery Spending {showConnectBanner ? "(Sample)" : "(from Plaid)"}
            </h2>
          </div>
          {showConnectBanner && (
            <Link
              to="/dashboard/budget-snapshot/connect"
              className="flex items-center gap-1 text-[11px] font-semibold text-[#1F5A3D]"
            >
              <Link2 className="w-3 h-3" /> Connect Plaid
            </Link>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
          <StatCard
            label="This Week"
            value={`$${thisWeekTotal.toFixed(0)}`}
            sub={weeklyBudgetEst ? `of ~$${weeklyBudgetEst.toFixed(0)} wk` : undefined}
            icon={Wallet}
          />
          <StatCard
            label="This Month"
            value={`$${monthlyGrocery.toFixed(0)}`}
            sub={monthlyBudget ? `of $${monthlyBudget.toFixed(0)} mo` : undefined}
            icon={CalendarRange}
          />
          <StatCard
            label="Avg / Week"
            value={`$${avgWeekly.toFixed(0)}`}
            sub="last 4 weeks"
            icon={BarChart3}
          />
          <StatCard
            label="Trend vs Last Wk"
            value={lastWeekTotal > 0 ? `${trendUp ? "+" : ""}${trendPct.toFixed(0)}%` : "—"}
            sub={lastWeekTotal > 0 ? (trendUp ? "spending up" : "spending down") : "no prior wk"}
            icon={trendUp ? TrendingUp : TrendingDown}
            tone={lastWeekTotal === 0 ? "neutral" : trendUp ? "warn" : "good"}
          />
          <div className="col-span-2 md:col-span-1 bg-[#F8F3E2] rounded-xl p-3 flex flex-col justify-center">
            <p className="text-[11px] text-[#6a6a6a]">Budget Progress</p>
            <p className="text-[16px] font-extrabold text-[#1a1a1a] leading-tight">
              {budgetPct.toFixed(0)}%
            </p>
            <div className="h-1.5 bg-white rounded-full mt-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${budgetPct > 90 ? "bg-[#C24A1F]" : "bg-[#1F5A3D]"}`}
                style={{ width: `${budgetPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Mini trend bars (last 8 weeks) */}
        <div className="mt-4">
          <p className="text-[11px] text-[#8a8a8a] mb-1.5">Last 8 weeks of grocery spending</p>
          <div className="flex items-end gap-1.5 h-12">
            {weeks.map((w) => (
              <div
                key={w.weekStart}
                title={`${w.weekStart}: $${w.total.toFixed(0)}`}
                className="flex-1 bg-[#F2A900]/80 rounded-t"
                style={{ height: `${Math.max(6, (w.total / maxWeek) * 100)}%` }}
              />
            ))}
          </div>
        </div>

        <p className="text-[11px] text-[#8a8a8a] mt-3">
          Actual spending from your linked bank accounts via Plaid. Not an estimate.
        </p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = "neutral",
}: {
  label: string;
  value: string;
  sub?: string;
  icon: typeof Wallet;
  tone?: "neutral" | "good" | "warn";
}) {
  const valueColor =
    tone === "warn" ? "text-[#C24A1F]" : tone === "good" ? "text-[#1F5A3D]" : "text-[#1a1a1a]";
  return (
    <div className="bg-[#F8F3E2] rounded-xl p-3">
      <div className="flex items-center gap-1.5 mb-0.5">
        <Icon className="w-3.5 h-3.5 text-[#1F5A3D]" />
        <p className="text-[11px] text-[#6a6a6a]">{label}</p>
      </div>
      <p className={`text-[16px] font-extrabold leading-tight ${valueColor}`}>{value}</p>
      {sub && <p className="text-[10px] text-[#8a8a8a] mt-0.5">{sub}</p>}
    </div>
  );
}
