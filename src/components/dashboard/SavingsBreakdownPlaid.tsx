// Plaid-powered replacement for the legacy estimated "Savings Breakdown".
// Shows actual grocery spending pulled from food_transactions instead of
// pantry/waste estimates. Falls back to a Connect-Plaid CTA when no data.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getPlaidConnectionStatus } from "@/lib/foodBudget";

function startOfWeek(d: Date) {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}
function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function SavingsBreakdownPlaid() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [stats, setStats] = useState({
    thisWeek: 0,
    lastWeek: 0,
    thisMonth: 0,
    avgMonth: 0,
    annualEst: 0,
    hasData: false,
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const since = new Date();
      since.setMonth(since.getMonth() - 6);
      const [conn, tx] = await Promise.all([
        getPlaidConnectionStatus(user.id).catch(() => false),
        supabase
          .from("food_transactions")
          .select("amount, date")
          .eq("user_id", user.id)
          .eq("normalized_category", "groceries")
          .gte("date", iso(since)),
      ]);
      if (cancelled) return;

      const rows = (tx.data ?? []) as Array<{ amount: number; date: string }>;
      const now = new Date();
      const thisWeekStart = startOfWeek(now);
      const lastWeekStart = new Date(thisWeekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);
      const thisMonthStart = startOfMonth(now);

      let thisWeek = 0,
        lastWeek = 0,
        thisMonth = 0;
      const monthTotals = new Map<string, number>();

      for (const r of rows) {
        const d = new Date(r.date);
        const amt = Number(r.amount) || 0;
        if (d >= thisWeekStart) thisWeek += amt;
        else if (d >= lastWeekStart) lastWeek += amt;
        if (d >= thisMonthStart) thisMonth += amt;
        const mk = `${d.getFullYear()}-${d.getMonth()}`;
        monthTotals.set(mk, (monthTotals.get(mk) ?? 0) + amt);
      }

      const months = Array.from(monthTotals.values());
      const avgMonth = months.length ? months.reduce((a, b) => a + b, 0) / months.length : 0;
      const annualEst = avgMonth * 12;

      setConnected(!!conn);
      setStats({
        thisWeek,
        lastWeek,
        thisMonth,
        avgMonth,
        annualEst,
        hasData: rows.length > 0,
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-9 bg-[#F8F3E2] rounded-lg" />
        ))}
      </div>
    );
  }

  const showConnect = !connected || !stats.hasData;
  const fmt = (n: number) => `$${n.toFixed(2)}`;

  return (
    <div className="space-y-3 text-[14px]">
      <Row label="This Week" value={fmt(stats.thisWeek)} />
      <Row label="Last Week" value={fmt(stats.lastWeek)} />
      <Row label="This Month" value={fmt(stats.thisMonth)} />
      <Row label="Average Month" value={fmt(stats.avgMonth)} />
      <div className="border-t border-[#EEE7DA] pt-3 flex justify-between font-bold">
        <span>Estimated Annual Grocery Spend</span>
        <span className="text-[#1F5A3D]">{fmt(stats.annualEst)}</span>
      </div>
      <p className="text-[11px] text-[#8a8a8a]">
        {showConnect
          ? "Sample data — connect Plaid to see your actual grocery spending."
          : "Actual grocery spending pulled from your linked bank accounts via Plaid."}
      </p>
      {showConnect && (
        <Link
          to="/dashboard/budget-snapshot/connect"
          className="inline-flex items-center gap-1.5 text-[12px] font-semibold text-[#1F5A3D]"
        >
          <Link2 className="w-3.5 h-3.5" /> Connect Plaid
        </Link>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#4a4a4a]">{label}</span>
      <span className="font-semibold text-[#1a1a1a]">{value}</span>
    </div>
  );
}
