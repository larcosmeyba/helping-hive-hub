import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Printer, Download, Store, Sparkles, Loader2, MapPin, Tag, Plus, TrendingDown, PiggyBank, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { GroceryItem, PricingConfidenceSummary, SavingsSummary } from "@/types/mealPlan";
import { useLocation } from "@/contexts/LocationContext";
import { PermissionDeniedBanner } from "@/components/dashboard/PermissionDeniedBanner";

import { SendToInstacartButton, type InstacartLineItem } from "@/components/dashboard/SendToInstacartButton";
import { GroceryItemImage } from "@/components/dashboard/GroceryItemImage";
import { InstacartDisclaimer } from "@/components/InstacartDisclaimer";
import { computeGroceryRange, formatRange } from "@/lib/groceryConfidence";
import { useAdminRole } from "@/hooks/useAdminRole";
import { sanitizeForInstacart, toDisplayProduct } from "@/lib/instacartSanitizer";

const STORE_BRAND_BY_RETAILER: Record<string, string> = {
  target: "Good & Gather",
  aldi: "Simply Nature",
  safeway: "Signature Select",
  vons: "Signature Select",
  albertsons: "Signature Select",
  "whole foods": "365 by Whole Foods Market",
  publix: "Publix",
  "h-e-b": "HEB",
  heb: "HEB",
};

function getDefaultStoreBrand(storeName: string): string | undefined {
  const lower = storeName.toLowerCase();
  for (const [key, brand] of Object.entries(STORE_BRAND_BY_RETAILER)) {
    if (lower.includes(key)) return brand;
  }
  return undefined;
}

// Image policy: no keyword-matched stock photos. We render the
// <GroceryItemImage> component, which uses the real product image if Open
// Food Facts returned one and otherwise falls back to a flat icon tile.


function getStoreSpecificProduct(item: GroceryItem, activeStore: string) {
  const storeSpecific = activeStore ? item.storeProducts?.[activeStore] : undefined;
  if (storeSpecific?.productDescription || storeSpecific?.brand) {
    return {
      productDescription: storeSpecific.productDescription || item.productDescription || item.name,
      brand: storeSpecific.brand || item.brand,
    };
  }

  const fallbackBrand = activeStore ? getDefaultStoreBrand(activeStore) : undefined;
  if (fallbackBrand) {
    const quantitySuffix = item.quantity ? `, ${item.quantity}` : "";
    return {
      productDescription: `${fallbackBrand} ${item.name}${quantitySuffix}`.trim(),
      brand: fallbackBrand,
    };
  }

  return {
    productDescription: item.productDescription || item.name,
    brand: item.brand,
  };
}

export default function GroceryListPage() {
  const { mealPlan, generating, generate } = useMealPlan();
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const { role: adminRole } = useAdminRole();
  const homeStore = profile?.home_store ?? "";
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [selectedStore, setSelectedStore] = useState(homeStore);
  const [showPricingInfo, setShowPricingInfo] = useState(false);
  
  

  // Sync selected store to home store when profile loads
  useEffect(() => {
    if (homeStore && !selectedStore) setSelectedStore(homeStore);
  }, [homeStore, selectedStore]);

  const [extraItems, setExtraItems] = useState<{ name: string; price: number }[]>([]);
  const [showAddItem, setShowAddItem] = useState(false);
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const { status: locationStatus } = useLocation();

  // Instacart return-flow handler — detect ?from=instacart and welcome user back
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("from") === "instacart") {
      toast({
        title: "Welcome back from Instacart",
        description: "Your cart is ready in your Instacart account.",
      });
      if (user) {
        supabase.from("activity_logs").insert({
          user_id: user.id,
          action: "instacart_return",
          entity_type: "grocery_list",
          entity_id: null,
          details: {},
        }).then(() => {});
      }
      // Clean the URL so the toast doesn't fire again on remount
      const url = new URL(window.location.href);
      url.searchParams.delete("from");
      window.history.replaceState({}, "", url.pathname + url.search);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mealPlan || !mealPlan.groceryList?.length) {
    return (
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-gradient-to-b from-primary/5 to-transparent border border-primary/15 rounded-3xl p-8 md:p-12 text-center mt-6">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <ShoppingCart className="w-8 h-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Your grocery list lives here</h1>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            Generate a meal plan and we'll build a categorized, store-tailored grocery list with estimated prices.
          </p>
          <Button onClick={generate} disabled={generating} className="bg-gradient-honey text-primary-foreground hover:opacity-90 h-12 px-6 rounded-xl">
            {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Meal Plan</>}
          </Button>
        </div>
      </div>
    );
  }

  // Normalize raw recipe ingredients into purchasable grocery products
  // BEFORE rendering. This filters out recipe headers ("salmon marinade:"),
  // sub-recipe labels, and pure prep instructions, and maps lines like
  // "garlic clove, crushed" → "Garlic Bulb · 1 each". The displayed list now
  // matches the payload sent to Instacart exactly.
  const groceryItems = (mealPlan.groceryList ?? [])
    .map((i) => {
      const d = toDisplayProduct({ name: i.name, rawQuantity: String(i.quantity ?? "") });
      if (!d) return null;
      // Overwrite name/quantity AND clear the stale recipe-text fields
      // (productDescription, storeProducts) so the UI renders the sanitized
      // grocery product name, not the raw recipe instruction.
      return {
        ...i,
        name: d.displayName,
        quantity: d.displayQuantity,
        productDescription: d.displayName,
        storeProducts: undefined,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);
  const stores = mealPlan.storeRecommendations || [];
  const activeStore = selectedStore || stores[0]?.store || "";
  const pricingConf = mealPlan.pricingConfidence as PricingConfidenceSummary | undefined;
  const savings = mealPlan.savingsSummary as SavingsSummary | undefined;

  // Single-store totals from internal estimates only — no third-party retailer comparison
  const getStoreTotalFromItems = (storeName: string) => {
    return groceryItems.reduce((sum, item) => {
      if (item.storePrices && item.storePrices[storeName]) {
        return sum + item.storePrices[storeName];
      }
      return sum + (item.estimatedPrice || 0);
    }, 0);
  };

  const toggle = (name: string) => {
    const next = new Set(checked);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setChecked(next);
  };

  // Order sections by grocery store aisle logic
  const SECTION_ORDER = [
    "Fruits", "Vegetables", "Produce",
    "Meat & Protein", "Protein",
    "Dairy & Eggs", "Dairy",
    "Grains & Bread",
    "Canned & Pantry", "Pantry",
    "Oils & Condiments",
    "Baking & Spices",
    "Frozen",
    "Beverages",
    "Snacks",
    "Other",
  ];
  const rawSections = Array.from(new Set(groceryItems.map((i) => i.section || "Other")));
  const sections = rawSections.sort((a, b) => {
    const ai = SECTION_ORDER.findIndex(s => a.toLowerCase().includes(s.toLowerCase()));
    const bi = SECTION_ORDER.findIndex(s => b.toLowerCase().includes(s.toLowerCase()));
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  // Internal-estimate-only pricing (no cross-retailer comparison).
  type PriceInfo = {
    price: number;
    source: 'store_estimate' | 'estimate';
    store?: string;
  };

  const getItemPriceInfo = (item: typeof groceryItems[0]): PriceInfo => {
    if (item.storePrices && activeStore && item.storePrices[activeStore]) {
      return { price: item.storePrices[activeStore], source: 'store_estimate', store: activeStore };
    }
    return { price: item.estimatedPrice || 0, source: 'estimate' };
  };

  // Product image: no keyword-matched stock photos. Returns null so the
  // GroceryItemImage component falls back to its flat icon tile.
  const getItemImage = (_item: typeof groceryItems[0]): string | null => null;

  // Use getStoreTotalFromItems for subtotal so it matches store card totals exactly
  const subtotal = getStoreTotalFromItems(activeStore);
  const taxRate = mealPlan.taxEstimate && mealPlan.totalEstimatedCost ? mealPlan.taxEstimate / mealPlan.totalEstimatedCost : 0.03;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const checkedCount = checked.size;
  const basketRange = computeGroceryRange(groceryItems, subtotal, pricingConf);

  return (
    <div className="max-w-4xl mx-auto space-y-3 md:space-y-6 px-1 md:px-0">
      {/* Subtle store + items caption */}
      {activeStore && (
        <div className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm" style={{ backgroundColor: "#F5F0E4" }}>
          <Store className="w-4 h-4 text-muted-foreground shrink-0" />
          <span className="text-foreground/80">
            Estimated prices for <strong className="text-foreground">{activeStore}</strong>
            <span className="text-muted-foreground"> · {groceryItems.length} item{groceryItems.length === 1 ? '' : 's'}</span>
          </span>
        </div>
      )}
      {/* Pricing transparency note (replaces 98% accuracy claim) */}
      <p className="text-[11px] text-muted-foreground px-1">
        Estimated for planning. Final prices shown at Instacart checkout.{" "}
        <button
          onClick={() => setShowPricingInfo(true)}
          className="underline hover:text-foreground transition-colors"
        >
          Learn more
        </button>
      </p>
      {/* Weekly Savings Banner */}
      {savings && savings.estimatedSavings > 0 && (
        <div className="bg-gradient-to-r from-accent/10 to-primary/10 rounded-2xl border border-accent/30 p-4 md:p-5">
          <div className="flex items-center gap-2 mb-3">
            <PiggyBank className="w-5 h-5 text-accent" />
            <h3 className="font-display text-sm md:text-base font-semibold text-foreground">Estimated Weekly Grocery Savings</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-[10px] md:text-xs text-muted-foreground mb-1">Est. Your Cost</p>
              <p className="text-base md:text-xl font-bold text-primary">~${savings.actualGroceryCost.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] md:text-xs text-muted-foreground mb-1">Typical Cost</p>
              <p className="text-base md:text-xl font-bold text-muted-foreground line-through">~${savings.regionalAverageCost.toFixed(2)}</p>
            </div>
            <div className="text-center">
              <p className="text-[10px] md:text-xs text-muted-foreground mb-1">Est. You Save</p>
              <p className="text-base md:text-xl font-bold text-accent flex items-center justify-center gap-1">
                <TrendingDown className="w-4 h-4" />~${savings.estimatedSavings.toFixed(2)}
              </p>
            </div>
          </div>
          <p className="text-[10px] md:text-xs text-muted-foreground text-center mt-2">
            Estimated ~{savings.savingsPercent}% vs typical grocery spending in your area. Final pricing confirmed at Instacart checkout.
          </p>
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-sm md:text-2xl font-bold text-foreground flex items-center gap-1 md:gap-2">
            <ShoppingCart className="w-3.5 h-3.5 md:w-6 md:h-6 text-primary" /> Grocery List
          </h1>
          <p className="text-[8px] md:text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
            {groceryItems.length} items • {checkedCount} checked
            {mealPlan.regionLabel && (
              <span className="flex items-center gap-0.5 text-primary font-medium">
                <MapPin className="w-2 h-2 md:w-3 md:h-3" /> {mealPlan.regionLabel}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-1 md:gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="h-6 text-[8px] px-1.5 md:h-9 md:text-sm md:px-3">
            <Printer className="w-2.5 h-2.5 mr-0.5 md:w-4 md:h-4 md:mr-2" /> Print
          </Button>
          <Button variant="outline" size="sm" className="h-6 text-[8px] px-1.5 md:h-9 md:text-sm md:px-3">
            <Download className="w-2.5 h-2.5 mr-0.5 md:w-4 md:h-4 md:mr-2" /> Save
          </Button>
        </div>
      </div>

      {/* Bold instructional banner guiding users into the Instacart flow */}
      <div className="rounded-2xl border-2 border-primary/20 bg-primary/[0.06] p-5 md:p-6">
        <p className="text-center font-bold text-foreground text-sm md:text-base leading-relaxed">
          Select the items you want to shop for, then send items to Instacart to complete your purchase.
        </p>
        <p className="text-center text-muted-foreground text-[11px] md:text-xs mt-2">
          {checkedCount > 0
            ? `${checkedCount} item${checkedCount === 1 ? "" : "s"} selected to send to Instacart`
            : `All ${groceryItems.length + extraItems.length} items will be sent to Instacart`}
        </p>
      </div>

      {/* Send to Instacart — branded CTA (opens external) */}
      <div className="flex flex-col items-center gap-3">
        <SendToInstacartButton
          title={`Help The Hive Grocery List${mealPlan.regionLabel ? ` — ${mealPlan.regionLabel}` : ""}`}
          linkType="shopping_list"
          lineItems={(() => {
            // Sanitize recipe-portion strings ("1 tbsp olive oil") into
            // purchasable grocery products ("olive oil bottle") before sending
            // anything to Instacart. The on-screen list still shows the recipe
            // text; only the wire payload is normalized.
            const sourceItems = (() => {
              if (checked.size === 0) {
                return [
                  ...groceryItems.map((i) => ({ name: i.name, rawQuantity: String(i.quantity ?? "") })),
                  ...extraItems.map((e) => ({ name: e.name, rawQuantity: "" })),
                ];
              }
              const selectedGrocery = groceryItems
                .filter((i) => checked.has(i.name))
                .map((i) => ({ name: i.name, rawQuantity: String(i.quantity ?? "") }));
              const selectedExtras = extraItems
                .filter((e) => checked.has(e.name))
                .map((e) => ({ name: e.name, rawQuantity: "" }));
              const picked = [...selectedGrocery, ...selectedExtras];
              if (picked.length > 0) return picked;
              return [
                ...groceryItems.map((i) => ({ name: i.name, rawQuantity: String(i.quantity ?? "") })),
                ...extraItems.map((e) => ({ name: e.name, rawQuantity: "" })),
              ];
            })();
            const sanitized = sanitizeForInstacart(sourceItems);
            // TEMP DIAGNOSTIC — verify grocery cleanup end-to-end.
            // eslint-disable-next-line no-console
            console.log("[DIAG] Instacart CTA (top)", {
              rawCount: sourceItems.length,
              sanitizedCount: sanitized.length,
              rawSample: sourceItems.slice(0, 20).map((s) => s.name),
              sanitizedSample: sanitized.slice(0, 20).map((s) => s.name),
            });
            return sanitized.map<InstacartLineItem>((s) => ({
              name: s.name,
              quantity: s.quantity,
              unit: s.unit,
            }));
          })()}
          label="Send to Instacart"
          fullWidth
        />
        <p className="text-[11px] text-muted-foreground text-center px-2 leading-relaxed max-w-lg">
          Opens your Instacart cart with these ingredients pre-loaded in your browser. Instacart handles checkout, substitutions, payment, and delivery. Help The Hive may earn a small affiliate fee that helps keep the app free.
        </p>
        <InstacartDisclaimer variant="inline" className="text-center max-w-lg px-2" />
      </div>




      {/* Home Store Pill — single store focus */}
      {activeStore && (
        <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Home className="w-4 h-4 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">Shopping at</p>
              <p className="text-sm md:text-base font-bold text-foreground truncate">{activeStore}</p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-base md:text-lg font-bold text-primary">{formatRange(basketRange)}</p>
            <p className="text-[9px] text-muted-foreground/80 italic -mt-0.5">
              {basketRange.showRange ? "estimated range — final price at Instacart checkout" : "estimated basket"}
            </p>
          </div>
        </div>
      )}

      {adminRole && (
        <div className="text-right -mt-1">
          <Link
            to="/dashboard/grocery-list/debug"
            className="text-[11px] text-muted-foreground underline hover:text-foreground"
          >
            Open pricing debug →
          </Link>
        </div>
      )}


      {/* Grocery Items by Section */}
      {sections.map((section) => (
        <div key={section} className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
          <div className="bg-muted/50 px-5 py-3 border-b border-border flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">{section}</h3>
            <span className="text-xs text-muted-foreground ml-auto">
              {groceryItems.filter((i) => (i.section || "Other") === section).length} items
            </span>
          </div>
          <div className="divide-y divide-border">
            {groceryItems.filter((i) => (i.section || "Other") === section).map((item, idx) => {
              const priceInfo = getItemPriceInfo(item);
              const price = priceInfo.price;
              const isChecked = checked.has(item.name);
              const displayProduct = getStoreSpecificProduct(item, activeStore);
              return (
                <label
                  key={`${section}-${item.name}-${idx}`}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 cursor-pointer transition-colors"
                >
                  <Checkbox checked={isChecked} onCheckedChange={() => toggle(item.name)} />
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0 border border-border">
                    <GroceryItemImage src={getItemImage(item)} alt={displayProduct.productDescription} className="w-full h-full" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm leading-tight text-foreground">
                      {displayProduct.productDescription}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <span className="text-xs text-muted-foreground">{item.quantity}</span>
                      {item.pricingSource === 'internal_estimate' && (
                        <span className="text-[9px] text-muted-foreground/70 italic">est.</span>
                      )}
                    </div>
                    {isChecked && (
                      <p className="text-[11px] font-bold text-primary mt-1">
                        added
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-foreground">${price.toFixed(2)}</span>
                    <p className="text-[10px] text-muted-foreground/70 italic">estimated</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {/* Add Extra Items */}
      <div className="bg-card rounded-2xl border border-border shadow-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display text-sm font-semibold text-foreground flex items-center gap-2">
            <Plus className="w-4 h-4 text-primary" /> Additional Purchases
          </h3>
          <button
            onClick={() => setShowAddItem(!showAddItem)}
            className="text-xs text-primary font-medium hover:underline"
          >
            {showAddItem ? "Cancel" : "Add Item"}
          </button>
        </div>
        {showAddItem && (
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Item name"
              value={newItemName}
              onChange={(e) => setNewItemName(e.target.value)}
              className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm"
            />
            <input
              type="number"
              placeholder="Price"
              value={newItemPrice}
              onChange={(e) => setNewItemPrice(e.target.value)}
              className="w-20 h-9 rounded-lg border border-border bg-background px-3 text-sm"
              step="0.01"
              min="0"
            />
            <button
              onClick={() => {
                if (newItemName && newItemPrice) {
                  setExtraItems([...extraItems, { name: newItemName, price: parseFloat(newItemPrice) }]);
                  setNewItemName("");
                  setNewItemPrice("");
                  setShowAddItem(false);
                }
              }}
              className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium"
            >
              Add
            </button>
          </div>
        )}
        {extraItems.length > 0 && (
          <div className="space-y-2">
            {extraItems.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm bg-muted/30 px-3 py-2 rounded-lg">
                <span className="text-foreground">{item.name}</span>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">${item.price.toFixed(2)}</span>
                  <button
                    onClick={() => setExtraItems(extraItems.filter((_, idx) => idx !== i))}
                    className="text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Estimated Totals */}
      <div className="bg-card rounded-2xl border border-border shadow-card p-6">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estimated Subtotal ({activeStore || "Average"})</span>
            <span className="text-foreground font-medium">~${subtotal.toFixed(2)}</span>
          </div>
          {extraItems.length > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Additional Items ({extraItems.length})</span>
              <span className="text-foreground font-medium">~${extraItems.reduce((s, i) => s + i.price, 0).toFixed(2)}</span>
            </div>
          )}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estimated Tax ({(taxRate * 100).toFixed(1)}%)</span>
            <span className="text-foreground">~${((subtotal + extraItems.reduce((s, i) => s + i.price, 0)) * taxRate).toFixed(2)}</span>
          </div>
          {mealPlan.pantrySavings > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pantry Savings</span>
              <span className="text-accent font-semibold">-~${mealPlan.pantrySavings.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-border pt-3 flex justify-between items-baseline">
            <div>
              <span className="font-semibold text-foreground text-base">Estimated Grocery Total</span>
              <p className="text-[10px] text-muted-foreground italic mt-0.5">approximate budget</p>
            </div>
            <span className="font-bold text-2xl text-primary">
              ~${(subtotal + extraItems.reduce((s, i) => s + i.price, 0) + (subtotal + extraItems.reduce((s, i) => s + i.price, 0)) * taxRate - (mealPlan.pantrySavings || 0)).toFixed(2)}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1 leading-relaxed">
            These are planning estimates. Final pricing and availability are confirmed at Instacart checkout.
          </p>
          {mealPlan.costOfLivingMultiplier && mealPlan.costOfLivingMultiplier !== 1 && (
            <p className="text-[11px] text-muted-foreground flex items-center gap-1.5">
              <MapPin className="w-3 h-3 text-primary" />
              Estimates adjusted for your region{mealPlan.regionLabel ? ` · ${mealPlan.regionLabel}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* Bottom Send to Instacart — branded CTA (opens external) */}
      <div className="flex flex-col items-center gap-3">
        <SendToInstacartButton
          title={`Help The Hive Grocery List${mealPlan.regionLabel ? ` — ${mealPlan.regionLabel}` : ""}`}
          linkType="shopping_list"
          lineItems={(() => {
            // Same sanitizer path as the top CTA — keep both buttons in sync.
            const sourceItems = (() => {
              const all = [
                ...groceryItems.map((i) => ({ name: i.name, rawQuantity: String(i.quantity ?? "") })),
                ...extraItems.map((e) => ({ name: e.name, rawQuantity: "" })),
              ];
              if (checked.size === 0) return all;
              const picked = all.filter((i) => checked.has(i.name));
              return picked.length > 0 ? picked : all;
            })();
            const sanitized = sanitizeForInstacart(sourceItems);
            // eslint-disable-next-line no-console
            console.log("[DIAG] Instacart CTA (bottom)", {
              rawCount: sourceItems.length,
              sanitizedCount: sanitized.length,
              rawSample: sourceItems.slice(0, 20).map((s) => s.name),
              sanitizedSample: sanitized.slice(0, 20).map((s) => s.name),
            });
            return sanitized.map<InstacartLineItem>((s) => ({
              name: s.name,
              quantity: s.quantity,
              unit: s.unit,
            }));
          })()}
          label="Send to Instacart"
          fullWidth
        />
        <p className="text-[11px] text-muted-foreground text-center px-2 leading-relaxed max-w-lg">
          Opens Ralphs on Instacart in your browser. Instacart handles checkout, substitutions, payment, and delivery. Help The Hive may earn a small affiliate fee that helps keep the app free.
        </p>
        <InstacartDisclaimer variant="inline" className="text-center max-w-lg px-2" />
      </div>

      {/* Change home store — escape hatch (not a comparison view) */}
      <div className="text-center py-3">
        <p className="text-xs text-muted-foreground mb-1">Shopping somewhere different this week?</p>
        <Link
          to="/dashboard/settings"
          className="text-xs text-muted-foreground underline hover:text-foreground transition-colors"
        >
          Change your home store
        </Link>
      </div>

      {/* Pricing transparency modal */}
      {showPricingInfo && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => setShowPricingInfo(false)}
        >
          <div
            className="bg-card rounded-2xl border border-border shadow-elevated p-5 w-full max-w-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-base font-semibold text-foreground mb-3">
              About our pricing
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed mb-4">
              Prices shown are internal estimates for meal-planning purposes only.
              Final prices, availability, and substitutions are confirmed at Instacart checkout.
            </p>
            <button
              onClick={() => setShowPricingInfo(false)}
              className="w-full h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
            >
              Got it
            </button>
          </div>
        </div>
      )}


      {/* Location denied fallback */}
      {locationStatus === "denied" && (
        <PermissionDeniedBanner type="location" onFallback={() => {
          const el = document.querySelector('[data-zip-input]');
          if (el) (el as HTMLInputElement).focus();
        }} />
      )}

      {/* Data attribution */}
      <p className="text-[10px] text-muted-foreground/70 leading-relaxed text-center px-2 pt-2">
        Estimates for planning only. Final prices shown at Instacart checkout. Product images and metadata from Open Food Facts.
      </p>
    </div>
  );
}
