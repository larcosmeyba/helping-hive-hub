import { useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";

export default function MealCookedPage() {
  const navigate = useNavigate();
  const { state } = useLocation() as {
    state?: {
      recipe_name?: string;
      updated_items?: Array<{ name: string; before: string; after: string }>;
      money_saved?: number;
      food_waste_prevented?: number;
    };
  };

  const recipeName = state?.recipe_name ?? "Your Meal";
  const updated = state?.updated_items ?? [];
  const moneySaved = state?.money_saved ?? 0;
  const wastePrevented = state?.food_waste_prevented ?? updated.length;

  return (
    <div className="max-w-md mx-auto px-1 pb-32 text-center">
      <h1 className="text-[16px] font-extrabold text-[#1a1a1a] mt-2 mb-6">Meal Cooked!</h1>

      <div className="mx-auto w-24 h-24 rounded-full border-4 border-[#1F7A3D] flex items-center justify-center mb-4">
        <CheckCircle2 className="w-12 h-12 text-[#1F7A3D]" />
      </div>

      <h2 className="text-[20px] font-extrabold text-[#1a1a1a] mb-1">{recipeName}</h2>
      <p className="text-[13px] text-[#6b6b6b] mb-6">Great job! Your inventory has been updated.</p>

      {updated.length > 0 && (
        <div className="rounded-2xl bg-[#E4F4E4] p-4 mb-4 text-left">
          <p className="font-bold text-[14px] text-[#1F5A3D] mb-2">Updated Items</p>
          <ul className="space-y-1.5 text-[13px] text-[#1a1a1a]">
            {updated.map((u, i) => (
              <li key={i} className="flex justify-between">
                <span>{u.name}</span>
                <span className="text-[#4a4a4a]">{u.before} → {u.after}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="rounded-2xl bg-[#FFF1D6] p-4">
          <p className="text-[12px] text-[#6b6b6b]">Money Saved</p>
          <p className="text-[22px] font-extrabold text-[#1F5A3D]">${moneySaved.toFixed(0)}</p>
        </div>
        <div className="rounded-2xl bg-[#EAE4FB] p-4">
          <p className="text-[12px] text-[#6b6b6b]">Food Waste Prevented</p>
          <p className="text-[22px] font-extrabold text-[#5B3FBF]">{wastePrevented} Items</p>
        </div>
      </div>

      <button
        onClick={() => navigate("/dashboard/hive-ai")}
        className="w-full bg-[#5B3FBF] text-white font-bold text-[15px] py-4 rounded-xl"
      >
        Back to Dashboard
      </button>
    </div>
  );
}
