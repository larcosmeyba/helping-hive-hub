import { useEffect, useMemo, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SendToInstacartButton, type InstacartLineItem } from "@/components/dashboard/SendToInstacartButton";
import { InstacartDisclaimer } from "@/components/InstacartDisclaimer";
import type { GroceryItem } from "@/types/mealPlan";

function normalize(name: string) {
  return name.toLowerCase().trim().replace(/s$/, "");
}

function parseQty(q: string): { num: number; unit: string } {
  if (!q) return { num: 1, unit: "each" };
  const m = q.match(/([\d.]+)\s*(.*)/);
  return { num: m ? parseFloat(m[1]) || 1 : 1, unit: m && m[2] ? m[2].trim() : "each" };
}

const ADJUST_SECTIONS = ["protein", "meat", "produce", "vegetable", "fruit", "seafood"];

export default function GroceryReviewPage() {
  const { mealPlan } = useMealPlan();
  const { user, profile } = useAuth();
  const store = profile?.home_store ?? mealPlan?.storeRecommendations?.[0]?.store ?? "";

  const allItems: GroceryItem[] = mealPlan?.groceryList ?? [];

  // Already-have set: items overlapping with user's pantry (by normalized name).
  const [pantryNames, setPantryNames] = useState<Set<string>>(new Set());
  const [alreadyHaveOverride, setAlreadyHaveOverride] = useState<Set<string>>(new Set());
  const [qtyOverride, setQtyOverride] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    supabase
      .from("pantry_items")
      .select("item_name, normalized_item_name")
      .eq("user_id", user.id)
      .then(({ data }) => {
        if (!data) return;
        const set = new Set<string>();
        for (const row of data) {
          set.add(normalize(row.normalized_item_name || row.item_name));
        }
        setPantryNames(set);
      });
  }, [user]);

  const { alreadyHave, toAdjust, toBuy } = useMemo(() => {
    const ah: GroceryItem[] = [];
    const adj: GroceryItem[] = [];
    const buy: GroceryItem[] = [];
    for (const it of allItems) {
      const norm = normalize(it.name);
      const isAlready = alreadyHaveOverride.has(it.name) || pantryNames.has(norm);
      if (isAlready) ah.push(it);
      else if (ADJUST_SECTIONS.some((s) => (it.section || "").toLowerCase().includes(s))) adj.push(it);
      else buy.push(it);
    }
    return { alreadyHave: ah, toAdjust: adj.slice(0, 6), toBuy: [...adj.slice(6), ...buy] };
  }, [allItems, pantryNames, alreadyHaveOverride]);

  const getQty = (it: GroceryItem) => {
    if (qtyOverride[it.name] !== undefined) return qtyOverride[it.name];
    return parseQty(it.quantity).num;
  };

  const adjustQty = (it: GroceryItem, delta: number) => {
    const current = getQty(it);
    const next = Math.max(0, +(current + delta).toFixed(2));
    setQtyOverride((p) => ({ ...p, [it.name]: next }));
  };

  const getPrice = (it: GroceryItem) =>
    (it.storePrices?.[store] ?? it.estimatedPrice ?? 0);

  const total = useMemo(() => {
    return [...toAdjust, ...toBuy].reduce((s, it) => {
      const ratio = parseQty(it.quantity).num
        ? getQty(it) / parseQty(it.quantity).num
        : 1;
      return s + getPrice(it) * ratio;
    }, 0);
  }, [toAdjust, toBuy, qtyOverride, store]);

  const toggleCheck = (name: string) => {
    setChecked((p) => {
      const n = new Set(p);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });
  };

  const sendItems: InstacartLineItem[] = useMemo(() => {
    const buyable = [...toAdjust, ...toBuy];
    return buyable.map((it) => {
      const { unit } = parseQty(it.quantity);
      return {
        name: it.name,
        quantity: getQty(it) || 1,
        unit: unit || "each",
      };
    });
  }, [toAdjust, toBuy, qtyOverride]);

  if (!allItems.length) {
    return (
      <div className="max-w-md mx-auto px-4 pt-8 text-center">
        <p className="text-sm text-muted-foreground">No grocery items to review yet.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 pt-3 pb-32">
      <h1 className="text-center text-[20px] font-extrabold text-[#1a1a1a] mb-4">
        Review Grocery List
      </h1>

      {/* Already Have */}
      {alreadyHave.length > 0 && (
        <Section title="Already Have" headerBg="#E8F3E4" titleColor="#2E7D32">
          <ul className="divide-y divide-border">
            {alreadyHave.map((it) => (
              <li key={it.name} className="flex items-center gap-3 px-4 py-3">
                <div className="w-5 h-5 rounded-full bg-[#2E7D32] flex items-center justify-center shrink-0">
                  <Check className="w-3 h-3 text-white" strokeWidth={3} />
                </div>
                <span className="text-[14px] text-[#1a1a1a] font-medium flex-1 truncate">
                  {it.name}
                </span>
                <button
                  onClick={() => {
                    setAlreadyHaveOverride((p) => {
                      const n = new Set(p);
                      n.has(it.name) ? n.delete(it.name) : n.add(it.name);
                      return n;
                    });
                  }}
                  className="text-[11px] text-[#6b6b6b] underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Adjust Quantities */}
      {toAdjust.length > 0 && (
        <Section title="Adjust Quantities" headerBg="#FDECEC" titleColor="#C0392B">
          <ul className="divide-y divide-border">
            {toAdjust.map((it) => {
              const { unit } = parseQty(it.quantity);
              const qty = getQty(it);
              return (
                <li key={it.name} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-semibold text-[#1a1a1a] truncate">{it.name}</p>
                    <p className="text-[12px] text-[#6b6b6b] mt-0.5">
                      {qty} {unit}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => adjustQty(it, -1)}
                      className="w-8 h-8 rounded-full border border-border flex items-center justify-center active:scale-95"
                      aria-label="Decrease"
                    >
                      <Minus className="w-4 h-4 text-[#1a1a1a]" />
                    </button>
                    <button
                      onClick={() => adjustQty(it, 1)}
                      className="w-8 h-8 rounded-full bg-[#1F5A3D] flex items-center justify-center active:scale-95"
                      aria-label="Increase"
                    >
                      <Plus className="w-4 h-4 text-white" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* To Buy */}
      {toBuy.length > 0 && (
        <Section title="To Buy" headerBg="#E8F0FE" titleColor="#1A56DB">
          <ul className="divide-y divide-border">
            {toBuy.map((it) => {
              const price = getPrice(it);
              const isChecked = checked.has(it.name);
              return (
                <li key={it.name} className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => toggleCheck(it.name)}
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                      isChecked ? "bg-[#1F5A3D] border-[#1F5A3D]" : "border-[#bdbdbd] bg-white"
                    }`}
                    aria-label={isChecked ? "Uncheck" : "Check"}
                  >
                    {isChecked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </button>
                  <span className="text-[14px] text-[#1a1a1a] font-medium flex-1 truncate">
                    {it.name}
                  </span>
                  <span className="text-[14px] font-bold text-[#1a1a1a] shrink-0">
                    ${price.toFixed(2)}
                  </span>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* Estimated total */}
      <div className="mt-5 flex items-center justify-between px-1">
        <span className="text-[14px] text-[#6b6b6b]">Estimated Total</span>
        <span className="text-[18px] font-extrabold text-[#1a1a1a]">~${total.toFixed(2)}</span>
      </div>

      {/* Send to Instacart (existing approved flow) */}
      <div className="mt-4 flex flex-col items-center gap-2">
        <SendToInstacartButton
          title={`Help The Hive Grocery List${mealPlan?.regionLabel ? ` — ${mealPlan.regionLabel}` : ""}`}
          linkType="shopping_list"
          lineItems={sendItems}
          label="Send to Instacart"
          fullWidth
        />
        <InstacartDisclaimer variant="inline" className="text-center max-w-sm px-2" />
      </div>
    </div>
  );
}

function Section({
  title,
  headerBg,
  titleColor,
  children,
}: {
  title: string;
  headerBg: string;
  titleColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden mb-3">
      <div className="px-4 py-2.5" style={{ backgroundColor: headerBg }}>
        <p className="text-[13px] font-extrabold" style={{ color: titleColor }}>{title}</p>
      </div>
      {children}
    </div>
  );
}
