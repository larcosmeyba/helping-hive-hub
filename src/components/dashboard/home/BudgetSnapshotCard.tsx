import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Wallet, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getPlaidConnectionStatus, getBudgetSummary, BudgetSummary } from "@/lib/foodBudget";

export function BudgetSnapshotCard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [connected, setConnected] = useState(false);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);

  useEffect(() => {
    if (!user) return;
    getPlaidConnectionStatus(user.id).then(async (isConn) => {
      setConnected(isConn);
      if (isConn) setSummary(await getBudgetSummary(user.id));
    });
  }, [user]);

  if (!connected) {
    return (
      <div className="mt-3 rounded-2xl p-4 bg-white border border-[#EEE7DA]">
        <div className="flex items-center gap-2 mb-1">
          <Wallet className="w-4 h-4 text-[#1F5A3D]" />
          <span className="font-bold text-[15px] text-[#1a1a1a]">Track Your Food Spending</span>
        </div>
        <p className="text-[13px] text-[#4a4a4a] leading-snug mb-3">
          Connect securely with Plaid to track grocery, restaurant, and food delivery spending.
        </p>
        <button
          onClick={() => navigate("/dashboard/budget-snapshot/connect")}
          className="bg-[#1F5A3D] text-white text-[13px] font-semibold px-4 py-2 rounded-lg"
        >
          Connect Account
        </button>
      </div>
    );
  }

  const s = summary;
  const monthly = s?.monthly_food_budget ?? 0;
  const spent = s?.spent_total ?? 0;
  const remaining = s?.remaining_budget ?? 0;
  const health = s?.budget_health_score ?? 100;
  const pct = monthly > 0 ? Math.min(100, (spent / monthly) * 100) : 0;

  return (
    <div className="mt-3 rounded-2xl p-4 bg-white border border-[#EEE7DA]">
      <div className="flex items-center gap-2 mb-3">
        <Wallet className="w-4 h-4 text-[#1F5A3D]" />
        <span className="font-bold text-[15px] text-[#1a1a1a]">Budget Snapshot</span>
        <button
          onClick={() => navigate("/dashboard/budget-snapshot")}
          className="ml-auto flex items-center gap-1 text-[12px] font-semibold text-[#1F5A3D]"
        >
          View Dashboard <ArrowRight className="w-3 h-3" />
        </button>
      </div>
      <div className="grid grid-cols-4 gap-2 text-center mb-3">
        <Stat label="Monthly" value={`$${monthly.toFixed(0)}`} />
        <Stat label="Spent" value={`$${spent.toFixed(0)}`} />
        <Stat label="Remaining" value={`$${remaining.toFixed(0)}`} />
        <Stat label="Health" value={`${health}/100`} />
      </div>
      <div className="h-2 w-full bg-[#F5EBDC] rounded-full overflow-hidden">
        <div className="h-full bg-[#1F5A3D]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] text-[#6b6b6b] mb-0.5">{label}</p>
      <p className="text-[13px] font-extrabold text-[#1a1a1a]">{value}</p>
    </div>
  );
}
