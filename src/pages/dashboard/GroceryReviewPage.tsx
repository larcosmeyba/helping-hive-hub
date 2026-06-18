import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { SendToInstacartButton, type InstacartLineItem } from "@/components/dashboard/SendToInstacartButton";
import { InstacartDisclaimer } from "@/components/InstacartDisclaimer";
import { useToast } from "@/hooks/use-toast";
import { addItemsToGroceryList } from "@/lib/groceryList";
import type { GroceryItem } from "@/types/mealPlan";
import { sanitizeForInstacart, toDisplayProduct, dedupeKey } from "@/lib/instacartSanitizer";
import { estimateBasketRange, estimateBasketRangeFromDB, formatBasketRange, PRICING_DISCLAIMER, calculateEstimatedPrice, type EstimatedPrice } from "@/lib/pricingService";
import { KrogerBudgetCard } from "@/components/kroger/KrogerBudgetCard";
import { KrogerConnectReminder } from "@/components/kroger/KrogerConnectReminder";
import { useKrogerConnection } from "@/hooks/useKrogerConnection";
import { Loader2 } from "lucide-react";

function normalize(name: string) {
  return name.toLowerCase().trim().replace(/s$/, "");
}

function parseQty(q: string): { num: number; unit: string } {
  if (!q) return { num: 1, unit: "each" };
  const m = q.match(/([\d.]+)\s*(.*)/);
  return { num: m ? parseFloat(m[1]) || 1 : 1, unit: m && m[2] ? m[2].trim() : "each" };
}

const ADJUST_SECTIONS = ["protein", "meat", "produce", "vegetable", "fruit", "seafood"];

const NON_FOOD_KEYWORDS = [
  "phone", "laptop", "computer", "tv", "tablet", "camera", "headphone", "speaker",
  "charger", "cable", "battery", "electronics",
  "shoe", "shirt", "pants", "dress", "jacket", "sock", "underwear", "hat", "glove",
  "furniture", "chair", "table", "desk", "couch", "sofa", "bed", "mattress", "lamp",
  "toy", "doll", "action figure", "board game", "video game", "console",
  "tool", "hammer", "screwdriver", "drill", "saw", "wrench", "pliers",
  "motor oil", "windshield wiper", "car part", "tire",
  "book", "magazine", "notebook", "journal", "pen", "pencil", "marker", "stapler",
  "toilet paper", "paper towel", "facial tissue", "napkin",
  "laundry detergent", "fabric softener", "bleach", "all-purpose cleaner",
  "disinfectant", "glass cleaner",
  "shampoo", "conditioner", "body wash", "hand soap", "bar soap", "face wash",
  "toothpaste", "toothbrush", "mouthwash", "floss", "deodorant", "antiperspirant",
  "razor", "shaving cream", "hair dye", "nail polish", "makeup", "cosmetic",
  "lotion", "moisturizer", "sunscreen", "lip balm", "cotton ball", "cotton swab",
  "diaper", "baby wipe", "pull-up",
  "pad", "tampon", "menstrual",
  "trash bag", "garbage bag", "storage bag", "plastic wrap", "foil", "parchment paper",
  "air freshener", "candle", "incense",
  "pet food", "dog food", "cat food", "bird seed", "fish food",
];

function isFoodItem(name: string): boolean {
  const lower = name.toLowerCase();
  return !NON_FOOD_KEYWORDS.some((k) => lower.includes(k));
}

function guessCategory(name: string): string {
  const lower = name.toLowerCase();
  if (/\b(milk|cheese|yogurt|butter|egg|cream)\b/.test(lower)) return "Dairy & Eggs";
  if (/\b(chicken|beef|pork|turkey|fish|salmon|shrimp|meat|steak|sausage|bacon|ham)\b/.test(lower))
    return "Meat & Protein";
  if (/\b(rice|pasta|bread|noodle|cereal|oat|flour|grain|tortilla|cracker)\b/.test(lower))
    return "Grains & Bread";
  if (/\b(apple|banana|orange|grape|strawberry|fruit|berry|melon|mango|peach|pear|plum)\b/.test(lower))
    return "Fruits";
  if (/\b(carrot|potato|onion|tomato|lettuce|spinach|broccoli|vegetable|pepper|cucumber|celery)\b/.test(lower))
    return "Vegetables";
  if (/\b(canned|soup|bean|lentil|chickpea|tuna|corn|green bean|broth)\b/.test(lower))
    return "Canned & Pantry";
  if (/\b(oil|vinegar|sauce|condiment|spice|salt|sugar|honey|syrup|mayo|ketchup|mustard)\b/.test(lower))
    return "Oils & Condiments";
  if (/\b(frozen|ice cream|pizza|fries|nugget)\b/.test(lower)) return "Frozen";
  if (/\b(water|juice|soda|coffee|tea|sports drink|energy drink)\b/.test(lower))
    return "Beverages";
  if (/\b(chip|cracker|cookie|candy|snack|chocolate|popcorn|pretzel|nut|granola bar)\b/.test(lower))
    return "Snacks";
  return "Other";
}

const QUICK_ADDS: { name: string; quantity: string; category: string; estimatedPrice: number }[] = [
  { name: "Milk", quantity: "1 gallon", category: "Dairy & Eggs", estimatedPrice: 4.5 },
  { name: "Eggs", quantity: "1 dozen", category: "Dairy & Eggs", estimatedPrice: 4.0 },
  { name: "Bread", quantity: "1 loaf", category: "Grains & Bread", estimatedPrice: 3.5 },
  { name: "Rice", quantity: "2 lb", category: "Grains & Bread", estimatedPrice: 3.0 },
  { name: "Chicken", quantity: "2 lb", category: "Meat & Protein", estimatedPrice: 8.0 },
  { name: "Fruit", quantity: "3 lb", category: "Produce", estimatedPrice: 6.0 },
  { name: "Vegetables", quantity: "3 lb", category: "Produce", estimatedPrice: 5.0 },
  { name: "Snacks", quantity: "1 bag", category: "Snacks", estimatedPrice: 4.0 },
];

export default function GroceryReviewPage() {
  const { mealPlan } = useMealPlan();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const kroger = useKrogerConnection();
  const store = profile?.home_store ?? mealPlan?.storeRecommendations?.[0]?.store ?? "";

  // Normalize raw recipe ingredients into purchasable grocery products and
  // drop recipe headers / sub-recipe labels BEFORE rendering. Items are
  // deduped by normalized product name so the same item never appears twice
  // (e.g. "Banana" showing up multiple times from different recipes).
  const allItems: GroceryItem[] = (() => {
    const seen = new Map<string, GroceryItem>();
    for (const i of mealPlan?.groceryList ?? []) {
      const d = toDisplayProduct({ name: i.name, rawQuantity: String(i.quantity ?? "") });
      if (!d) continue;
      const key = dedupeKey(d.displayName);
      if (seen.has(key)) continue;
      seen.set(key, { ...i, name: d.displayName, quantity: d.displayQuantity });
    }
    return Array.from(seen.values());
  })();


  // Already-have set: items overlapping with user's pantry (by normalized name).
  const [pantryNames, setPantryNames] = useState<Set<string>>(new Set());
  const [alreadyHaveOverride, setAlreadyHaveOverride] = useState<Set<string>>(new Set());
  const [qtyOverride, setQtyOverride] = useState<Record<string, number>>({});
  const [checked, setChecked] = useState<Set<string>>(new Set());

  // Manual add state
  const [searchQuery, setSearchQuery] = useState("");
  const [manualItems, setManualItems] = useState<GroceryItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  const manualNames = useMemo(() => new Set(manualItems.map((m) => m.name)), [manualItems]);

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
    return { alreadyHave: ah, toAdjust: [] as GroceryItem[], toBuy: [...adj, ...buy] };
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
    const mealPlanTotal = [...toAdjust, ...toBuy].reduce((s, it) => {
      const ratio = parseQty(it.quantity).num
        ? getQty(it) / parseQty(it.quantity).num
        : 1;
      return s + getPrice(it) * ratio;
    }, 0);
    const manualTotal = manualItems.reduce((s, it) => s + (it.estimatedPrice || 0), 0);
    return mealPlanTotal + manualTotal;
  }, [toAdjust, toBuy, qtyOverride, store, manualItems]);

  const toggleCheck = (name: string) => {
    setChecked((p) => {
      const n = new Set(p);
      n.has(name) ? n.delete(name) : n.add(name);
      return n;
    });
  };

  // Auto-select all buyable items on first load so unchecked = excluded from Instacart
  const hasInitChecked = useRef(false);
  useEffect(() => {
    if (hasInitChecked.current) return;
    const names = new Set<string>();
    for (const it of toAdjust) names.add(it.name);
    for (const it of toBuy) names.add(it.name);
    for (const it of manualItems) names.add(it.name);
    if (names.size > 0) {
      setChecked(names);
      hasInitChecked.current = true;
    }
  }, [toAdjust, toBuy, manualItems]);

  const sendItems: InstacartLineItem[] = useMemo(() => {
    const buyable = [...toAdjust, ...toBuy, ...manualItems];
    // Sanitize recipe-portion strings into purchasable products before
    // sending to Instacart. UI continues to display the original recipe
    // text and the user-adjusted recipe quantity.
    const sourceItems = buyable
      .filter((it) => checked.has(it.name))
      .map((it) => ({ name: it.name, rawQuantity: String(it.quantity ?? "") }));
    return sanitizeForInstacart(sourceItems).map((s) => ({
      name: s.name,
      quantity: s.quantity,
      unit: s.unit,
    }));
  }, [toAdjust, toBuy, manualItems, qtyOverride, checked]);

  const isDuplicate = (name: string) => {
    const norm = normalize(name);
    return allItems.some((it) => normalize(it.name) === norm);
  };

  const persistManualItem = async (item: GroceryItem) => {
    if (!user) return;
    try {
      await addItemsToGroceryList("manual_add", [
        {
          item_name: item.name,
          quantity: item.quantity,
          unit: parseQty(item.quantity).unit,
          category: item.section,
          estimated_price: item.estimatedPrice || undefined,
          instacart_search_term: item.name,
        },
      ]);
    } catch (err) {
      console.error("Failed to persist manual item:", err);
      // Still show in UI; persistence failure is non-blocking for the review flow
    }
  };

  const addFromSearch = async () => {
    const name = searchQuery.trim();
    if (!name) return;
    if (!isFoodItem(name)) {
      toast({
        title: "Not a food item",
        description: "Please add grocery or food items only.",
        variant: "destructive",
      });
      return;
    }
    if (isDuplicate(name)) {
      toast({ title: "Already in list", description: `${name} is already in your grocery list.` });
      return;
    }

    setIsAdding(true);
    try {
      const category = guessCategory(name);
      const item: GroceryItem = {
        name,
        quantity: "1 each",
        estimatedPrice: 0,
        section: category,
      };
      await persistManualItem(item);
      setManualItems((prev) => [...prev, item]);
      setChecked((p) => new Set([...p, name]));
      setSearchQuery("");
    } catch (e) {
      toast({ title: "Failed to add item", description: String(e), variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const addQuickItem = async (quick: (typeof QUICK_ADDS)[0]) => {
    if (isDuplicate(quick.name)) {
      toast({ title: "Already in list", description: `${quick.name} is already in your grocery list.` });
      return;
    }
    setIsAdding(true);
    try {
      const item: GroceryItem = {
        name: quick.name,
        quantity: quick.quantity,
        estimatedPrice: quick.estimatedPrice,
        section: quick.category,
      };
      await persistManualItem(item);
      setManualItems((prev) => [...prev, item]);
      setChecked((p) => new Set([...p, quick.name]));
    } catch (e) {
      toast({ title: "Failed to add item", description: String(e), variant: "destructive" });
    } finally {
      setIsAdding(false);
    }
  };

  const removeManualItem = (name: string) => {
    setManualItems((prev) => prev.filter((m) => m.name !== name));
    setChecked((p) => {
      const n = new Set(p);
      n.delete(name);
      return n;
    });
  };

  const selectedItemsAll = [...toAdjust, ...toBuy, ...manualItems].filter((it) =>
    checked.has(it.name)
  );
  const selectedCount = selectedItemsAll.length;
  const selectedTotal = selectedItemsAll.reduce((s, it) => {
    const ratio = parseQty(it.quantity).num
      ? getQty(it) / parseQty(it.quantity).num
      : 1;
    return s + getPrice(it) * ratio;
  }, 0);

  // Per-item DB pricing from grocery_price_reference (normalized fuzzy match).
  // Matches "Garlic Bulb" → garlic, "Medium Banana" → banana, etc.
  const [itemPrices, setItemPrices] = useState<Record<string, EstimatedPrice | null>>({});
  const [pricesLoading, setPricesLoading] = useState(false);
  const buyableNamesKey = useMemo(
    () => [...toBuy, ...manualItems].map((i) => i.name).join("|"),
    [toBuy, manualItems],
  );
  const stateCode = (profile as any)?.state || undefined;
  const storeCodeForPricing = store || undefined;

  useEffect(() => {
    const items = [...toBuy, ...manualItems];
    if (!items.length) return;
    // Don't fetch or surface internal estimated prices unless the user has
    // connected Kroger AND saved a home store. Pricing must come from
    // Kroger Production only in the user-facing grocery review.
    if (!kroger.ready) {
      setItemPrices({});
      setPricesLoading(false);
      return;
    }
    let cancelled = false;
    setPricesLoading(true);
    (async () => {
      const entries = await Promise.all(
        items.map(async (it) => {
          try {
            const p = await calculateEstimatedPrice(it.name, {
              storeCode: storeCodeForPricing,
              stateCode,
            });
            return [it.name, p] as const;
          } catch {
            return [it.name, null] as const;
          }
        }),
      );
      if (cancelled) return;
      const map: Record<string, EstimatedPrice | null> = {};
      for (const [name, p] of entries) map[name] = p;
      setItemPrices(map);
      setPricesLoading(false);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buyableNamesKey, storeCodeForPricing, stateCode, kroger.ready]);

  const formatItemPrice = (p: EstimatedPrice | null | undefined): string | null => {
    if (!p) return null;
    if (p.low === p.high) return `$${p.estimate.toFixed(2)}`;
    return `$${p.low.toFixed(2)} – $${p.high.toFixed(2)}`;
  };

  if (!allItems.length) {
    return (
      <div className="max-w-md mx-auto px-4 pt-8 text-center">
        <p className="text-sm text-muted-foreground">No grocery items to review yet.</p>
      </div>
    );
  }

  const combinedToBuy = [...toBuy, ...manualItems];

  return (
    <div className="max-w-md mx-auto px-4 pt-3 pb-32">
      <h1 className="text-center text-[20px] font-extrabold text-[#1a1a1a] mb-4">
        Review Grocery List
      </h1>
      <KrogerConnectReminder />


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


      {/* To Buy */}
      {combinedToBuy.length > 0 && (
        <Section title="To Buy" headerBg="#E8F0FE" titleColor="#1A56DB">
          <ul className="divide-y divide-border">
            {combinedToBuy.map((it) => {
              const isChecked = checked.has(it.name);
              const isManual = manualNames.has(it.name);
              const priceObj = itemPrices[it.name];
              const priceLabel = formatItemPrice(priceObj);
              return (
                <li
                  key={`${it.name}-${isManual ? "manual" : "plan"}`}
                  className="flex items-start gap-3 px-4 py-3"
                >
                  <button
                    onClick={() => toggleCheck(it.name)}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                      isChecked ? "bg-[#1F5A3D] border-[#1F5A3D]" : "border-[#bdbdbd] bg-white"
                    }`}
                    aria-label={isChecked ? "Uncheck" : "Check"}
                  >
                    {isChecked && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-medium text-[#1a1a1a] truncate">{it.name}</p>
                    <p
                      className={`text-[11px] mt-0.5 ${
                        isChecked ? "text-[#1F5A3D] font-medium" : "text-[#9e9e9e]"
                      }`}
                    >
                      {isChecked ? "Added to list" : "Tap to add to list"}
                    </p>
                  </div>
                  <div className="flex flex-col items-end shrink-0 ml-2 min-w-[88px]">
                    {!kroger.ready ? (
                      <span className="text-[10px] text-[#9e9e9e] italic text-right leading-tight">
                        Connect Kroger<br />for accurate pricing
                      </span>
                    ) : priceLabel ? (
                      <>
                        <span className="text-[13px] font-bold text-[#1a1a1a] leading-tight">
                          {priceLabel}
                        </span>
                        <span className="text-[10px] text-[#9e9e9e] leading-tight">Kroger</span>
                      </>
                    ) : pricesLoading ? (
                      <span className="text-[11px] text-[#9e9e9e] italic">…</span>
                    ) : (
                      <span className="text-[11px] text-[#9e9e9e] italic text-right leading-tight">
                        Price<br />unavailable
                      </span>
                    )}
                    {isManual && (
                      <button
                        onClick={() => removeManualItem(it.name)}
                        className="text-[10px] text-[#6b6b6b] underline mt-1"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        </Section>
      )}

      {/* Add More Food Items */}
      <Section title="Add More Food Items" headerBg="#FFF8E1" titleColor="#B8860B">
        <div className="px-4 pt-3 pb-2 flex gap-2">
          <input
            type="text"
            placeholder="Search food item…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFromSearch();
              }
            }}
            className="flex-1 h-10 rounded-xl border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <button
            onClick={addFromSearch}
            disabled={!searchQuery.trim() || isAdding}
            className="h-10 px-4 rounded-xl bg-[#1F5A3D] text-white text-sm font-semibold disabled:opacity-50 active:scale-95 transition-transform"
          >
            + Add Food Item
          </button>
        </div>
        <div className="px-4 pb-3 flex flex-wrap gap-2">
          {QUICK_ADDS.map((q) => (
            <button
              key={q.name}
              onClick={() => addQuickItem(q)}
              disabled={isAdding || isDuplicate(q.name)}
              className="px-3 py-1.5 rounded-full border border-border bg-background text-[13px] text-[#1a1a1a] font-medium hover:border-primary/50 transition-colors disabled:opacity-40"
            >
              {q.name}
            </button>
          ))}
        </div>
      </Section>

      {/* Estimated total — ONLY when Kroger is connected with a home store.
          Internal estimated pricing stays in the backend; we never surface it
          to users in the grocery review. */}
      {kroger.ready ? (
        <EstimatedTotal
          allItems={[...toAdjust, ...toBuy, ...manualItems]}
          selectedItems={selectedItemsAll}
          selectedCount={selectedCount}
          storeCode={store || undefined}
          stateCode={(profile as any)?.state || undefined}
          weeklyBudget={
            (mealPlan as any)?.weeklyBudget ?? (profile as any)?.weekly_budget ?? null
          }
          budgetExceeded={(mealPlan as any)?.budgetExceeded ?? false}
          budgetWarningText={(mealPlan as any)?.budgetWarningText ?? null}
          channelBreakdown={(mealPlan as any)?.channelBreakdown ?? null}
          instacartTitle={`Help The Hive Grocery List${mealPlan?.regionLabel ? ` — ${mealPlan.regionLabel}` : ""}`}
          sendItems={sendItems}
        />
      ) : (
        <ConnectKrogerForPricing
          loading={kroger.loading}
          connected={kroger.connected}
          onConnect={() => kroger.connect()}
        />
      )}

      <KrogerBudgetCard
        items={[...toAdjust, ...toBuy, ...manualItems]}
        weeklyBudget={
          (mealPlan as any)?.weeklyBudget ?? (profile as any)?.weekly_budget ?? null
        }
      />
    </div>
  );
}

function EstimatedTotal({
  allItems,
  selectedItems,
  selectedCount,
  storeCode,
  stateCode,
  weeklyBudget,
  budgetExceeded,
  budgetWarningText,
  channelBreakdown,
  instacartTitle,
  sendItems,
}: {
  allItems: GroceryItem[];
  selectedItems: GroceryItem[];
  selectedCount: number;
  storeCode?: string;
  stateCode?: string;
  weeklyBudget?: number | null;
  budgetExceeded?: boolean;
  budgetWarningText?: string | null;
  channelBreakdown?: {
    in_store_subtotal: number;
    item_markup: number;
    service_fee: number;
    delivery_fee: number;
    bag_fee: number;
    tip: number;
    tax: number;
    delivered_total: number;
    store: string;
    as_of_date: string;
  } | null;
  instacartTitle: string;
  sendItems: InstacartLineItem[];
}) {
  const [totalRange, setTotalRange] = useState<{ low: number; high: number } | null>(
    estimateBasketRange(allItems),
  );
  const [selectedRange, setSelectedRange] = useState<{ low: number; high: number } | null>(
    estimateBasketRange(selectedItems),
  );

  useEffect(() => {
    let cancelled = false;
    estimateBasketRangeFromDB(allItems, { storeCode, stateCode }).then((r) => {
      if (!cancelled) setTotalRange(r);
    });
    return () => {
      cancelled = true;
    };
  }, [allItems.map((i) => i.name).join("|"), storeCode, stateCode]);

  useEffect(() => {
    let cancelled = false;
    estimateBasketRangeFromDB(selectedItems, { storeCode, stateCode }).then((r) => {
      if (!cancelled) setSelectedRange(r);
    });
    return () => {
      cancelled = true;
    };
  }, [selectedItems.map((i) => i.name).join("|"), storeCode, stateCode]);

  // When the server provided a delivered-total breakdown, prefer that as the
  // authoritative number — it already includes whole-package costs, Instacart
  // markup, fees, tip, and tax. The client-side basket range is a fallback.
  const useServerDelivered = !!channelBreakdown;
  const displayedTotal = useServerDelivered ? channelBreakdown!.delivered_total : (totalRange?.high ?? 0);
  const estimateForBudget = useServerDelivered ? channelBreakdown!.delivered_total : (totalRange ? totalRange.low : 0);
  const hasBudget = typeof weeklyBudget === "number" && weeklyBudget > 0;
  const remaining = hasBudget ? Math.max(0, (weeklyBudget as number) - estimateForBudget) : null;
  const overBudget = hasBudget && (estimateForBudget > (weeklyBudget as number) || budgetExceeded);

  return (
    <>
      <div className="mt-5 rounded-2xl border border-border bg-card px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <span className="block text-[13px] text-[#6b6b6b]">
              {useServerDelivered ? "Estimated Delivered Total" : "Estimated Grocery Total"}
            </span>
            <span className="block text-[10px] text-[#9e9e9e] italic mt-0.5">
              {useServerDelivered
                ? `incl. markup, fees, tip & tax · ${channelBreakdown!.store} · as of ${channelBreakdown!.as_of_date}`
                : "range, not exact"}
            </span>
          </div>
          <span className="text-[18px] font-extrabold text-[#1a1a1a]">
            {useServerDelivered ? `$${displayedTotal.toFixed(2)}` : formatBasketRange(totalRange)}
          </span>
        </div>

        {useServerDelivered && (
          <div className="pt-2 border-t border-border/60 space-y-1 text-[12px]">
            <Row label="In-store subtotal" value={channelBreakdown!.in_store_subtotal} />
            {channelBreakdown!.item_markup > 0 && <Row label="Item markup" value={channelBreakdown!.item_markup} />}
            {channelBreakdown!.service_fee > 0 && <Row label="Service fee" value={channelBreakdown!.service_fee} />}
            {channelBreakdown!.delivery_fee > 0 && <Row label="Delivery fee" value={channelBreakdown!.delivery_fee} />}
            {channelBreakdown!.bag_fee > 0 && <Row label="Bag fee" value={channelBreakdown!.bag_fee} />}
            {channelBreakdown!.tip > 0 && <Row label="Tip (est.)" value={channelBreakdown!.tip} />}
            {channelBreakdown!.tax > 0 && <Row label="Tax" value={channelBreakdown!.tax} />}
          </div>
        )}

        {hasBudget && (
          <>
            <div className="flex items-center justify-between text-[13px] pt-2 border-t border-border/60">
              <span className="text-[#6b6b6b]">Budget</span>
              <span className="font-semibold text-[#1a1a1a]">${(weeklyBudget as number).toFixed(2)}</span>
            </div>
            <div className="flex items-center justify-between text-[13px]">
              <span className="text-[#6b6b6b]">Remaining</span>
              <span
                className={`font-semibold ${overBudget ? "text-[#B91C1C]" : "text-[#1F5A3D]"}`}
              >
                {overBudget ? "Over budget" : `$${(remaining as number).toFixed(2)}`}
              </span>
            </div>
          </>
        )}
      </div>

      {hasBudget && !overBudget && (
        <p className="text-[11px] text-[#1F5A3D] leading-relaxed mt-2 px-1 font-medium">
          Your meal plan was built to stay within your grocery budget. Final pricing and availability are confirmed at your store at checkout.
        </p>
      )}
      {overBudget && (
        <p className="text-[11px] text-[#B91C1C] leading-relaxed mt-2 px-1 font-medium">
          {budgetWarningText || "This basket is above your weekly budget. Uncheck items or regenerate your meal plan to bring it back in range. Final pricing and availability are confirmed at your store at checkout."}
        </p>
      )}
      {/* Universal Instacart cost-saving tip — every user sees how to trim
          their cart at checkout without leaving the app. */}
      <div className="mt-3 rounded-xl bg-[#FFF8E1] border border-[#F2D88A] px-3 py-2">
        <p className="text-[11px] text-[#7A5A00] leading-relaxed">
          <span className="font-semibold">Tip:</span> If your grocery total comes in over budget, uncheck pricier items or swap meals to lower your total for the week.
        </p>
      </div>

      <p className="text-[10px] text-[#6b6b6b] leading-relaxed mt-2 px-1">{PRICING_DISCLAIMER}</p>

      <div className="mt-4 flex flex-col items-center gap-2">
        <p className="text-[13px] text-[#6b6b6b] font-medium">
          {selectedCount} {selectedCount === 1 ? "item" : "items"} selected • Estimated {formatBasketRange(selectedRange)}
        </p>
        <SendToInstacartButton
          title={instacartTitle}
          linkType="shopping_list"
          lineItems={sendItems}
          label="Shop at Kroger"
          fullWidth
        />
        <InstacartDisclaimer variant="inline" className="text-center max-w-sm px-2" />
      </div>
    </>
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

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between text-[#6b6b6b]">
      <span>{label}</span>
      <span className="text-[#1a1a1a] font-medium">${value.toFixed(2)}</span>
    </div>
  );
}
