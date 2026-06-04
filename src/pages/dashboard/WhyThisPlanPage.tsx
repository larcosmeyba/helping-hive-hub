import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMealPlan } from "@/contexts/MealPlanContext";
import produceBoxImg from "@/assets/home-produce-box.png";

export default function WhyThisPlanPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { mealPlan } = useMealPlan();

  const budget = profile?.weekly_budget ?? 75;
  const household = profile?.household_size ?? 2;
  const store = (profile?.home_store as string) ||
    ((profile?.preferred_stores as string[] | undefined)?.[0]) ||
    "your selected store";
  const dietary = ((profile?.dietary_preferences as string[] | undefined) ?? []);
  const cooking = (profile?.cooking_confidence as string) || "your skill level";
  const savings = Math.round(
    mealPlan?.savingsSummary?.estimatedSavings ??
    mealPlan?.pantrySavings ??
    0
  );

  const reasons = [
    `Stays within your $${budget} budget`,
    "Uses items you already have",
    "Reduces food waste",
    dietary.length ? `Matches your dietary preferences (${dietary.join(", ")})` : "Matches your dietary preferences",
    `Available at ${store}`,
    `Portion sizes for ${household} ${household === 1 ? "person" : "people"}`,
    `Matches your cooking skill level (${cooking})`,
  ];

  return (
    <div className="w-full max-w-3xl mx-auto -mx-4 px-4 pb-6 min-h-full bg-[hsl(43_100%_96%)]">
      <div className="flex items-center gap-3 pt-2 pb-3">
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5 text-[#1a1a1a]" />
        </button>
        <h1 className="text-[20px] font-extrabold text-[#1a1a1a]">Why This Plan?</h1>
      </div>

      <div className="bg-white rounded-2xl p-4 border border-[#EEE7DA] space-y-3">
        {reasons.map((r) => (
          <div key={r} className="flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-[#3FAE5A] shrink-0 mt-0.5" />
            <span className="text-[14px] text-[#1a1a1a] leading-snug">{r}</span>
          </div>
        ))}
      </div>

      {savings > 0 && (
        <div className="mt-4 bg-white rounded-2xl p-4 border border-[#EEE7DA] flex items-center gap-3">
          <img src={produceBoxImg} alt="" loading="lazy" className="w-16 h-16 object-contain shrink-0" />
          <div>
            <p className="text-[14px] font-semibold text-[#1a1a1a]">
              You'll save about ${savings} this week!
            </p>
            <p className="text-[12px] text-[#6b6b6b] mt-1">
              By using items already in your pantry and staying within budget.
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 space-y-3">
        <button
          onClick={() => navigate("/dashboard/meal-plan")}
          className="w-full bg-[#1F5A3D] text-white font-bold py-4 rounded-2xl text-[16px] active:scale-[0.99] transition-transform"
        >
          Continue to Meal Plan
        </button>
        <button
          onClick={() => navigate("/dashboard/grocery-list")}
          className="w-full bg-white text-[#1F5A3D] font-bold py-4 rounded-2xl text-[16px] border-2 border-[#1F5A3D] active:scale-[0.99] transition-transform"
        >
          Generate Grocery List
        </button>
      </div>

      <p className="text-[11px] text-[#6b6b6b] mt-4 text-center px-4">
        Estimated pricing for planning only. Final pricing and availability are confirmed at Instacart checkout.
      </p>
    </div>
  );
}
