import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { MealPlanHistory } from "@/components/dashboard/MealPlanHistory";

export default function PastMealPlansPage() {
  const navigate = useNavigate();
  return (
    <div className="max-w-3xl mx-auto px-1 pb-10">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1 text-[13px] text-[#6b6b6b] py-3"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="font-display text-2xl font-bold text-[#1a1a1a] mb-1">Past Meal Plans</h1>
      <p className="text-sm text-muted-foreground mb-6">
        Browse plans you've generated, with totals and meals included.
      </p>
      <MealPlanHistory />
    </div>
  );
}
