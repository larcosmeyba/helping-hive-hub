import { useMemo, useState } from "react";
import { Leaf, Beef, Milk, Package, ShoppingBasket, Sparkles, Loader2, CheckCircle2 } from "lucide-react";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { GroceryItem } from "@/types/mealPlan";
import { toDisplayProduct, dedupeKey } from "@/lib/grocerySanitizer";
import { ShopWithInstacartButton } from "@/components/grocery/ShopWithInstacartButton";
import { PricingModeBadge } from "@/components/grocery/PricingModeBadge";
import { getAppUrl } from "@/lib/appUrl";
import { trackEvent } from "@/lib/analytics";
import { phCapture } from "@/lib/posthog";
import { openPendingWindow, redirectPendingWindow } from "@/lib/popupRedirect";

function parseQty(q: string): { num: number; unit: string } {
  if (!q) return { num: 1, unit: "each" };
  const m = q.match(/([\d.]+)\s*(.*)/);
  return { num: m ? parseFloat(m[1]) || 1 : 1, unit: m && m[2] ? m[2].trim() : "each" };
}

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

// Need-to-buy bucket check. Backend sets `bucket: "need_to_buy" | "already_have" | "use_first"`
// and `alreadyHave: boolean` on each line. Treat anything explicitly already_have as owned.
function isAlreadyHave(i: GroceryItem): boolean {
  const b = (i as any).bucket;
  if (b === "already_have") return true;
  if (b === "need_to_buy" || b === "use_first") return false;
  return Boolean((i as any).alreadyHave);
}

export default function GrocerySummaryPage() {
  const { mealPlan, generating, generate } = useMealPlan();
  const { toast } = useToast();
  const [instacartLoading, setInstacartLoading] = useState(false);

  const items = mealPlan?.groceryList ?? [];

  const { needItems, ownedItems } = useMemo(() => {
    const need: GroceryItem[] = [];
    const owned: GroceryItem[] = [];
    for (const it of items) (isAlreadyHave(it) ? owned : need).push(it);
    return { needItems: need, ownedItems: owned };
  }, [items]);

  const groupByCategory = (list: GroceryItem[]) => {
    const map = new Map<string, GroceryItem[]>();
    for (const it of list) {
      const k = bucketFor(it.section || "Other");
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    }
    const order = ["produce", "protein", "dairy", "pantry", "frozen", "beverages", "snacks", "other"];
    return order.filter((k) => map.has(k)).map((k) => ({ key: k, items: map.get(k)! }));
  };

  const groupedNeed = useMemo(() => groupByCategory(needItems), [needItems]);
  const groupedOwned = useMemo(() => groupByCategory(ownedItems), [ownedItems]);

  // De-duped list of items to send to Instacart (need-to-buy only).
  const sendableItems: GroceryItem[] = useMemo(() => {
    const seen = new Map<string, GroceryItem>();
    for (const i of needItems) {
      const d = toDisplayProduct({ name: i.name, rawQuantity: String(i.quantity ?? "") });
      if (!d) continue;
      const key = dedupeKey(d.displayName);
      if (seen.has(key)) continue;
      seen.set(key, { ...i, name: d.displayName, quantity: d.displayQuantity });
    }
    return Array.from(seen.values());
  }, [needItems]);

  const handleShopWithInstacart = async () => {
    if (sendableItems.length === 0) {
      toast({ title: "Nothing to send yet", description: "Add items to your buy list first." });
      return;
    }
    // Safari/iOS: open the destination window SYNCHRONOUSLY inside the tap
    // handler before any await, otherwise the popup is blocked.
    const pending = openPendingWindow();
    setInstacartLoading(true);
    try {
      const line_items = sendableItems.map((i) => {
        const parsed = parseQty(i.quantity ?? "");
        const item: { name: string; quantity?: number; unit?: string } = { name: i.name };
        if (parsed.num > 0) item.quantity = parsed.num;
        if (parsed.unit) item.unit = parsed.unit;
        return item;
      });
      const linkback = `${getAppUrl()}/dashboard/grocery-list?from=instacart`;
      const { data, error } = await supabase.functions.invoke("instacart-create-list", {
        body: {
          title: "Help The Hive Grocery List",
          link_type: "shopping_list",
          line_items,
          landing_page_configuration: { partner_linkback_url: linkback },
          expires_in: 30,
        },
      });
      if (error) throw new Error(error.message || "Edge function returned an error");
      const err = (data as any)?.error;
      if (err) throw new Error(typeof err === "string" ? err : JSON.stringify(err));
      const url: string | undefined = (data as any)?.products_link_url;
      if (!url) throw new Error("Instacart did not return a products_link_url");
      phCapture("shop_with_instacart_clicked", { item_count: line_items.length });
      void trackEvent("shop_with_instacart_clicked", { item_count: line_items.length });
      await redirectPendingWindow(pending, url);
    } catch (e: any) {
      if (pending && !pending.closed) pending.close();
      toast({
        title: "Couldn't open Instacart",
        description: e?.message ?? "Please try again.",
        variant: "destructive",
      });
    } finally {
      setInstacartLoading(false);
    }
  };

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
            onClick={() => generate()}
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

  const renderCategory = (
    key: string,
    catItems: GroceryItem[],
    opts: { showPrice: boolean },
  ) => {
    const meta = CATEGORY_META[key];
    const Icon = meta.Icon;
    return (
      <div key={key} className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="w-full px-4 py-3 flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
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
        </div>
        <ul className="border-t border-border divide-y divide-border">
          {catItems.map((it, idx) => {
            const d = toDisplayProduct({ name: it.name, rawQuantity: String(it.quantity ?? "") });
            const name = d?.displayName ?? it.name;
            const qty = d?.displayQuantity ?? String(it.quantity ?? "");
            const priceRaw =
              (it as any).estimatedPrice ?? (it as any).estimated_price ?? null;
            const price = typeof priceRaw === "number" ? priceRaw : null;
            return (
              <li key={`${key}-${idx}`} className="px-4 py-2.5 flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-semibold text-[#1a1a1a] leading-tight truncate">{name}</p>
                  {qty && (
                    <p className="text-[12px] text-[#6b6b6b] mt-0.5">{qty}</p>
                  )}
                </div>
                {opts.showPrice && price !== null && (
                  <span className="text-[13px] font-semibold text-[#1a1a1a] tabular-nums shrink-0">
                    ${price.toFixed(2)}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-3 pb-10">
      <h1 className="text-center text-[20px] font-extrabold text-[#1a1a1a] mb-2">
        Your Grocery List
      </h1>
      {(mealPlan as any)?.pricingMode && (
        <div className="flex justify-center mb-4">
          <PricingModeBadge mode={(mealPlan as any).pricingMode} />
        </div>
      )}

      {/* Need to buy */}
      {groupedNeed.length > 0 && (
        <>
          <div className="flex items-center justify-between mt-1 mb-2 px-1">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-[#1a1a1a]">Need to buy</h2>
            <span className="text-[12px] text-[#6b6b6b]">
              {needItems.length} item{needItems.length === 1 ? "" : "s"}
            </span>
          </div>
          <div className="space-y-3 mb-5">
            {groupedNeed.map(({ key, items: catItems }) =>
              renderCategory(key, catItems, { showPrice: true }),
            )}
          </div>
        </>
      )}

      {/* Already have (no prices) */}
      {groupedOwned.length > 0 && (
        <>
          <div className="flex items-center justify-between mt-1 mb-2 px-1">
            <h2 className="text-[13px] font-bold uppercase tracking-wide text-[#1a1a1a] flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-[#2E7D32]" />
              Already have
            </h2>
            <span className="text-[12px] text-[#6b6b6b]">
              {ownedItems.length} item{ownedItems.length === 1 ? "" : "s"}
            </span>
          </div>
          <p className="text-[12px] text-[#6b6b6b] mb-2 px-1">
            From your pantry — not in your buy total.
          </p>
          <div className="space-y-3 mb-5">
            {groupedOwned.map(({ key, items: catItems }) =>
              renderCategory(key, catItems, { showPrice: false }),
            )}
          </div>
        </>
      )}

      {/* Primary CTA */}
      <div className="space-y-3">
        <ShopWithInstacartButton
          loading={instacartLoading}
          fullWidth
          label="Shop ingredients"
          onClick={handleShopWithInstacart}
        />
        <p className="text-[11px] text-center text-muted-foreground px-2">
          We may earn a commission when you shop via Instacart. Estimate only — final price confirmed at checkout.
        </p>
      </div>
    </div>
  );
}
