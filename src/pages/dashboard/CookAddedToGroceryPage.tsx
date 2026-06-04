import { useLocation, useNavigate } from "react-router-dom";
import { Check, CheckCircle2 } from "lucide-react";
import type { GeneratedRecipe, GeneratedRecipeIngredient } from "@/lib/cookFromWhatIHave";

export default function CookAddedToGroceryPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const state = (location.state as { recipe?: GeneratedRecipe; added?: GeneratedRecipeIngredient[] } | null) ?? {};
  const added = state.added ?? [];

  return (
    <div className="max-w-md mx-auto px-4 pt-3 pb-28">
      <h1 className="text-center text-[20px] font-extrabold text-[#1a1a1a] mb-6">
        Missing Ingredients Added
      </h1>

      <div className="flex justify-center mb-5">
        <div className="w-20 h-20 rounded-full border-[3px] border-[#2E7D32] flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-[#2E7D32]" strokeWidth={2.5} />
        </div>
      </div>

      <p className="text-center text-[15px] font-bold text-[#1a1a1a] mb-3">
        Added To Grocery List
      </p>

      <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
        <ul className="divide-y divide-border">
          {added.length === 0 ? (
            <li className="px-4 py-4 text-center text-sm text-muted-foreground">
              Items added to your grocery list.
            </li>
          ) : (
            added.map((i) => (
              <li key={i.item_name} className="flex items-center px-4 py-3">
                <div className="w-5 h-5 rounded-full bg-[#2E7D32] flex items-center justify-center shrink-0 mr-3">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
                <span className="text-[14px] text-[#1a1a1a] font-medium">{i.item_name}</span>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => navigate("/dashboard/grocery-list")}
          className="w-full h-[52px] rounded-2xl bg-[#5B3FBF] text-white font-bold text-[15px]"
        >
          View Grocery List
        </button>
        <button
          onClick={() => navigate(-1)}
          className="w-full h-[52px] rounded-2xl bg-card border border-border text-[#1a1a1a] font-bold text-[15px]"
        >
          Continue Cooking
        </button>
      </div>
    </div>
  );
}
