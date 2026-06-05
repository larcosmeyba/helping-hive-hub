import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { CATEGORY_LABELS, FoodCategory, FoodTx, getFoodTransactions } from "@/lib/foodBudget";

const FILTERS: { key: FoodCategory | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "groceries", label: "Groceries" },
  { key: "restaurants", label: "Restaurants" },
  { key: "coffee_drinks", label: "Coffee" },
  { key: "food_delivery", label: "Food Delivery" },
  { key: "instacart", label: "Instacart" },
];

export default function BudgetTransactionsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [filter, setFilter] = useState<FoodCategory | "all">("all");
  const [txs, setTxs] = useState<FoodTx[]>([]);

  useEffect(() => {
    if (!user) return;
    getFoodTransactions(user.id, filter === "all" ? undefined : filter).then(setTxs);
  }, [user, filter]);

  return (
    <div className="max-w-2xl mx-auto px-4 pb-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[13px] text-[#6b6b6b] py-3">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-[22px] font-extrabold text-[#1a1a1a] mb-3">Food Transactions</h1>

      <div className="flex gap-2 overflow-x-auto pb-3 -mx-1 px-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[12px] font-semibold border transition ${
              filter === f.key ? "bg-[#1F5A3D] text-white border-[#1F5A3D]" : "bg-white text-[#1a1a1a] border-[#EEE7DA]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#EEE7DA] rounded-2xl divide-y divide-[#F0EAD8]">
        {txs.length === 0 && <p className="text-[13px] text-[#6b6b6b] p-4">No transactions in this category.</p>}
        {txs.map((t) => (
          <div key={t.id} className="flex items-center justify-between px-3 py-3">
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-[#1a1a1a] truncate">
                {t.merchant_name ?? t.transaction_name ?? "Transaction"}
              </p>
              <p className="text-[11px] text-[#6b6b6b]">
                {CATEGORY_LABELS[t.normalized_category]} · {t.date}
                {t.pending ? " · pending" : ""}
              </p>
            </div>
            <span className="text-[13px] font-bold text-[#1a1a1a]">${Number(t.amount).toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
