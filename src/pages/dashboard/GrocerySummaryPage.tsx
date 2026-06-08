import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight, Leaf, Beef, Milk, Package, ShoppingBasket, Sparkles, Loader2 } from "lucide-react";
import { useMealPlan } from "@/contexts/MealPlanContext";
import type { GroceryItem } from "@/types/mealPlan";
import { estimateBasketRange, formatBasketRange, PRICING_DISCLAIMER } from "@/lib/pricingService";

const CATEGORY_META: Record<string, { label: string; Icon: typeof Leaf; iconBg: string; iconColor: string; match: string[] }> = {
  produce: { label: "Produce", Icon: Leaf, iconBg: "#E6F4E6", iconColor: "#2E7D32", match: ["produce", "fruit", "vegetable"] },
  protein: { label: "Protein", Icon: Beef, iconBg: "#FDECEC", iconColor: "#C0392B", match: ["protein", "meat", "seafood", "fish"] },
  dairy:   { label: "Dairy",   Icon: Milk, iconBg: "#E8F0FE", iconColor: "#1A56DB", match: ["dairy", "egg"] },
  pantry:  { label: "Pantry",  Icon: Package, iconBg: "#FDEEDC", iconColor: "#C2410C", match: ["pantry", "canned", "grain", "bread", "oil", "condiment", "baking", "spice"] },
  frozen:  { label: "Frozen",  Icon: Package, iconBg: "#E0F2FE", iconColor: "#0369A1", match: ["frozen"] },
  beverages:{ label: "Beverages",Icon: Package, iconBg: "#FEF3C7", iconColor: "#A16207", match: ["beverage", "drink"] },
  snacks:  { label: "Snacks",  Icon: Package, iconBg: "#FAE8FF", iconColor: "#A21CAF", match: ["snack"] },
  other:   { label: "Other",   Icon: Package, iconBg: "#F1F1F1", iconColor: "#525252", match: [] },
};

function bucketFor(section: string): string {
  const lower = (section || "").toLowerCase();
  for (const [key, meta] of Object.entries(CATEGORY_META)) {
    if (meta.match.some((m) => lower.includes(m))) return key;
  }
  return "other";
}

export default function GrocerySummaryPage() {
  const navigate = useNavigate();
  const { mealPlan, generating, generate } = useMealPlan();

  const items = mealPlan?.groceryList ?? [];

  const range = useMemo(() => estimateBasketRange(items), [items]);

  const grouped = useMemo(() => {
    const map = new Map<string, GroceryItem[]>();
    for (const it of items) {
      const k = bucketFor(it.section || "Other");
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    // ordered
    const order = ["produce", "protein", "dairy", "pantry", "frozen", "beverages", "snacks", "other"];
    return order.filter((k) => map.has(k)).map((k) => ({ key: k, items: map.get(k)! }));
  }, [items]);

  if (!mealPlan || !items.length) {
    return (
      <div className="max-w-md mx-auto px-4 pt-6 pb-10">
        <div className="rounded-3xl bg-card border border-border p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShoppingBasket className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-xl font-bold text-foreground mb-2">No grocery list yet</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Generate a meal plan and we'll build your grocery list automatically.
          </p>
          <button
            onClick={generate}
            disabled={generating}
            className="inline-flex items-center justify-center gap-2 h-12 px-6 rounded-xl bg-[#1F5A3D] text-white font-semibold text-sm disabled:opacity-60"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Generate Meal Plan
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-3 pb-10">
      <h1 className="text-center text-[20px] font-extrabold text-[#1a1a1a] mb-4">
        Your Grocery List
      </h1>

      {/* Top stats card — green tint */}
      <div className="rounded-2xl p-4 mb-4" style={{ backgroundColor: "#E8F3E4" }}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-[#2E7D32] font-semibold">
              Estimated Total
            </p>
            <p className="text-[24px] font-extrabold text-[#1F5A3D] leading-none mt-1">
              {formatRange(range)}
            </p>
            {range.showRange && (
              <p className="text-[10px] text-[#3a3a3a]/70 mt-1 italic">
                Range shown — final price confirmed at Instacart checkout
              </p>
            )}
          </div>
        </div>
        <p className="text-[12px] text-[#3a3a3a] mt-2">
          {items.length} item{items.length === 1 ? "" : "s"}
        </p>
        <InstacartDisclaimer variant="inline" className="text-[10px] mt-2" />
      </div>

      {/* Category tiles */}
      <div className="space-y-2 mb-5">
        {grouped.map(({ key, items: catItems }) => {
          const meta = CATEGORY_META[key];
          const Icon = meta.Icon;
          return (
            <button
              key={key}
              onClick={() => navigate("/dashboard/grocery-list/review", { state: { section: meta.label } })}
              className="w-full bg-card border border-border rounded-2xl px-4 py-3.5 flex items-center gap-3 active:scale-[0.99] transition-transform"
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: meta.iconBg }}
              >
                <Icon className="w-5 h-5" style={{ color: meta.iconColor }} />
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-[15px] font-bold text-[#1a1a1a] leading-tight">{meta.label}</p>
                <p className="text-[12px] text-[#6b6b6b] mt-0.5">
                  {catItems.length} item{catItems.length === 1 ? "" : "s"}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-[#9a9a9a] shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Primary CTA */}
      <button
        onClick={() => navigate("/dashboard/grocery-list/review")}
        className="w-full h-[52px] rounded-2xl bg-[#1F5A3D] text-white font-bold text-[15px] active:opacity-90 transition-opacity"
      >
        Review Grocery List
      </button>
    </div>
  );
}
