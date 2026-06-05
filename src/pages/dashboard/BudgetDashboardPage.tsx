import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Settings, TrendingUp, ShoppingCart, Coffee, UtensilsCrossed, Truck, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import {
  BudgetSummary,
  BudgetInsight,
  FoodTx,
  CATEGORY_LABELS,
  FoodCategory,
  getBudgetSummary,
  getBudgetInsights,
  getFoodTransactions,
  PRIVACY_COPY,
} from "@/lib/foodBudget";

const CAT_ICON: Record<FoodCategory, typeof ShoppingCart> = {
  groceries: ShoppingCart,
  restaurants: UtensilsCrossed,
  coffee_drinks: Coffee,
  food_delivery: Truck,
  instacart: ShoppingCart,
  other_food: UtensilsCrossed,
};

export default function BudgetDashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [summary, setSummary] = useState<BudgetSummary | null>(null);
  const [insights, setInsights] = useState<BudgetInsight[]>([]);
  const [txs, setTxs] = useState<FoodTx[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [s, i, t] = await Promise.all([
        getBudgetSummary(user.id),
        getBudgetInsights(user.id),
        getFoodTransactions(user.id),
      ]);
      setSummary(s);
      setInsights(i);
      setTxs(t.slice(0, 5));
    })();
  }, [user]);

  if (!summary) {
    return <div className="p-6 text-[13px] text-[#6b6b6b]">Loading budget…</div>;
  }

  const breakdown: { key: FoodCategory; value: number }[] = (
    [
      { key: "groceries", value: summary.grocery_spending },
      { key: "restaurants", value: summary.restaurant_spending },
      { key: "coffee_drinks", value: summary.coffee_spending },
      { key: "food_delivery", value: summary.food_delivery_spending },
      { key: "other_food", value: summary.other_food_spending },
    ] as { key: FoodCategory; value: number }[]
  ).filter((b) => b.value > 0);

  const lowBudget = summary.remaining_budget > 0 && summary.remaining_budget < summary.monthly_food_budget * 0.2;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-10">
      <div className="flex items-center justify-between py-3">
        <button onClick={() => navigate("/dashboard")} className="flex items-center gap-1 text-[13px] text-[#6b6b6b]">
          <ArrowLeft className="w-4 h-4" /> Home
        </button>
        <button
          onClick={() => navigate("/dashboard/budget-snapshot/settings")}
          className="flex items-center gap-1 text-[13px] text-[#1F5A3D] font-semibold"
        >
          <Settings className="w-4 h-4" /> Settings
        </button>
      </div>

      <h1 className="text-[22px] font-extrabold text-[#1a1a1a]">Budget Dashboard</h1>
      <p className="text-[12px] text-[#6b6b6b] mb-4">Food spending only.</p>

      {summary.isMock && (
        <div className="rounded-xl bg-[#FFF8E8] border border-[#F2D77A] p-3 mb-4">
          <p className="text-[12px] text-[#5a4a1a]">
            Demo data — connect Plaid to see your real food spending.
          </p>
        </div>
      )}

      {/* Hero stats */}
      <div className="rounded-2xl bg-[#1F5A3D] text-white p-5 mb-4">
        <p className="text-[12px] opacity-80">Monthly Food Budget</p>
        <p className="text-[28px] font-extrabold leading-tight">${summary.monthly_food_budget.toFixed(0)}</p>
        <div className="h-2 bg-white/20 rounded-full mt-3 overflow-hidden">
          <div
            className="h-full bg-white rounded-full"
            style={{ width: `${Math.min(100, (summary.spent_total / summary.monthly_food_budget) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between mt-3 text-[12px]">
          <span>Spent ${summary.spent_total.toFixed(0)}</span>
          <span>Remaining ${summary.remaining_budget.toFixed(0)}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-4">
        <Card label="Budget Health" value={`${summary.budget_health_score}/100`} icon={TrendingUp} />
        <Card
          label="Projected"
          value={`$${Math.round(summary.projected_month_end_spending ?? summary.spent_total)}`}
          icon={TrendingUp}
        />
      </div>

      {lowBudget && (
        <div className="rounded-xl bg-[#FCE7EC] border border-[#F2A0BC] p-4 mb-4">
          <p className="text-[13px] text-[#1a1a1a] font-semibold mb-1">
            You have ${summary.remaining_budget.toFixed(0)} remaining this month
          </p>
          <p className="text-[12px] text-[#4a4a4a] mb-3">Generate a low-cost meal plan with the budget that's left.</p>
          <button
            onClick={() => navigate(`/dashboard/meal-plan/setup?budget=${Math.floor(summary.remaining_budget)}`)}
            className="bg-[#E63B6B] text-white text-[13px] font-semibold px-4 py-2 rounded-lg"
          >
            Generate Savings Meal Plan
          </button>
        </div>
      )}

      {/* Breakdown */}
      <h2 className="text-[15px] font-bold text-[#1a1a1a] mt-2 mb-2">Spending Breakdown</h2>
      <div className="bg-white border border-[#EEE7DA] rounded-2xl p-3 mb-4">
        {breakdown.length === 0 && <p className="text-[13px] text-[#6b6b6b] p-3">No food spending yet this month.</p>}
        {breakdown.map((b) => {
          const Icon = CAT_ICON[b.key];
          const pct = summary.spent_total > 0 ? (b.value / summary.spent_total) * 100 : 0;
          return (
            <div key={b.key} className="px-2 py-2.5">
              <div className="flex items-center gap-2 mb-1.5">
                <Icon className="w-4 h-4 text-[#1F5A3D]" />
                <span className="text-[13px] font-semibold text-[#1a1a1a] flex-1">{CATEGORY_LABELS[b.key]}</span>
                <span className="text-[13px] font-bold text-[#1a1a1a]">${b.value.toFixed(0)}</span>
              </div>
              <div className="h-1.5 bg-[#F5EBDC] rounded-full overflow-hidden">
                <div className="h-full bg-[#1F5A3D] rounded-full" style={{ width: `${pct}%` }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Insights */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[15px] font-bold text-[#1a1a1a]">Hive AI Budget Insights</h2>
        <button
          onClick={() => navigate("/dashboard/budget-snapshot/insights")}
          className="text-[12px] text-[#1F5A3D] font-semibold"
        >
          See all
        </button>
      </div>
      <div className="space-y-2 mb-4">
        {insights.slice(0, 2).map((ins) => (
          <div key={ins.id} className="bg-[#F5EBDC] rounded-2xl p-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#1F5A3D]" />
              <p className="text-[13px] font-bold text-[#1a1a1a]">{ins.title}</p>
            </div>
            <p className="text-[12px] text-[#4a4a4a] leading-snug">{ins.message}</p>
          </div>
        ))}
      </div>

      {/* Recent */}
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-[15px] font-bold text-[#1a1a1a]">Recent Food Transactions</h2>
        <button
          onClick={() => navigate("/dashboard/budget-snapshot/transactions")}
          className="text-[12px] text-[#1F5A3D] font-semibold"
        >
          See all
        </button>
      </div>
      <div className="bg-white border border-[#EEE7DA] rounded-2xl divide-y divide-[#F0EAD8] mb-4">
        {txs.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-3 py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#1a1a1a] truncate">{t.merchant_name ?? t.transaction_name ?? "Transaction"}</p>
              <p className="text-[11px] text-[#6b6b6b]">{CATEGORY_LABELS[t.normalized_category]} · {t.date}</p>
            </div>
            <span className="text-[13px] font-bold text-[#1a1a1a]">${Number(t.amount).toFixed(2)}</span>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-[#6b6b6b] leading-snug">{PRIVACY_COPY}</p>
    </div>
  );
}

function Card({ label, value, icon: Icon }: { label: string; value: string; icon: typeof TrendingUp }) {
  return (
    <div className="bg-white border border-[#EEE7DA] rounded-2xl p-4">
      <Icon className="w-4 h-4 text-[#1F5A3D] mb-1.5" />
      <p className="text-[11px] text-[#6b6b6b]">{label}</p>
      <p className="text-[18px] font-extrabold text-[#1a1a1a]">{value}</p>
    </div>
  );
}
