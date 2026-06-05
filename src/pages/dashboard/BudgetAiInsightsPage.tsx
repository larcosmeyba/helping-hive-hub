import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { BudgetInsight, BudgetSummary, getBudgetInsights, getBudgetSummary } from "@/lib/foodBudget";

export default function BudgetInsightsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [insights, setInsights] = useState<BudgetInsight[]>([]);
  const [summary, setSummary] = useState<BudgetSummary | null>(null);

  useEffect(() => {
    if (!user) return;
    getBudgetInsights(user.id).then(setInsights);
    getBudgetSummary(user.id).then(setSummary);
  }, [user]);

  const budgetParam = summary ? Math.max(20, Math.floor(summary.remaining_budget || summary.monthly_food_budget)) : null;

  return (
    <div className="max-w-2xl mx-auto px-4 pb-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[13px] text-[#6b6b6b] py-3">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-[22px] font-extrabold text-[#1a1a1a]">Hive AI Budget Insights</h1>
      <p className="text-[12px] text-[#6b6b6b] mb-4">Suggestions based on your food spending.</p>

      <div className="space-y-3 mb-6">
        {insights.map((ins) => (
          <div key={ins.id} className="bg-white border border-[#EEE7DA] rounded-2xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-[#1F5A3D]" />
              <p className="text-[14px] font-bold text-[#1a1a1a]">{ins.title}</p>
            </div>
            <p className="text-[13px] text-[#4a4a4a] leading-snug mb-2">{ins.message}</p>
            {ins.estimated_savings != null && (
              <p className="text-[12px] font-semibold text-[#1F5A3D]">Potential savings: ~${ins.estimated_savings}</p>
            )}
          </div>
        ))}
      </div>

      <button
        onClick={() => navigate(`/dashboard/meal-plan/setup${budgetParam ? `?budget=${budgetParam}` : ""}`)}
        className="w-full bg-[#1F5A3D] text-white font-semibold py-3.5 rounded-xl"
      >
        Generate Savings Meal Plan
      </button>
    </div>
  );
}
