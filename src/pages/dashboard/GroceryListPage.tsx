import { useState } from "react";
import { ShoppingCart, Printer, Download, Store, Sparkles, Loader2, MapPin, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useMealPlan } from "@/contexts/MealPlanContext";

const STORE_LOGOS: Record<string, string> = {
  Walmart: "https://images.unsplash.com/photo-1632840473780-cb797f6e4c59?w=80&h=80&fit=crop",
  Aldi: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?w=80&h=80&fit=crop",
  Target: "https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=80&h=80&fit=crop",
  Kroger: "https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=80&h=80&fit=crop",
};

const PRODUCT_IMAGES: Record<string, string> = {
  chicken: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=60&h=60&fit=crop",
  rice: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=60&h=60&fit=crop",
  eggs: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=60&h=60&fit=crop",
  pasta: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=60&h=60&fit=crop",
  bread: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=60&h=60&fit=crop",
  milk: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=60&h=60&fit=crop",
  cheese: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=60&h=60&fit=crop",
  tomato: "https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=60&h=60&fit=crop",
  onion: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=60&h=60&fit=crop",
  potato: "https://images.unsplash.com/photo-1518977676601-b53f82ber33?w=60&h=60&fit=crop",
  beef: "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=60&h=60&fit=crop",
  bean: "https://images.unsplash.com/photo-1511690743698-d9d18f7e20f1?w=60&h=60&fit=crop",
  butter: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc0d?w=60&h=60&fit=crop",
  oil: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=60&h=60&fit=crop",
  flour: "https://images.unsplash.com/photo-1627484986972-e544190b3726?w=60&h=60&fit=crop",
  sugar: "https://images.unsplash.com/photo-1598343175882-595a1f4d4e37?w=60&h=60&fit=crop",
  banana: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=60&h=60&fit=crop",
  broccoli: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=60&h=60&fit=crop",
  carrot: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=60&h=60&fit=crop",
  pepper: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=60&h=60&fit=crop",
};

const DEFAULT_PRODUCT_IMG = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=60&h=60&fit=crop";

function getProductImage(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, url] of Object.entries(PRODUCT_IMAGES)) {
    if (lower.includes(keyword)) return url;
  }
  return DEFAULT_PRODUCT_IMG;
}

// Store price multipliers for comparison
const STORE_MULTIPLIERS: Record<string, number> = {
  Aldi: 0.80,
  Walmart: 0.90,
  Target: 0.95,
  Kroger: 1.0,
  Safeway: 1.0,
  Publix: 1.05,
  "H-E-B": 1.05,
  "Trader Joe's": 1.25,
  "Whole Foods": 1.25,
};

export default function GroceryListPage() {
  const { mealPlan, generating, generate } = useMealPlan();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [selectedStore, setSelectedStore] = useState("");

  if (!mealPlan || !mealPlan.groceryList?.length) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <ShoppingCart className="w-12 h-12 text-primary mx-auto mb-4" />
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">No Grocery List Yet</h1>
        <p className="text-muted-foreground mb-6">Generate a meal plan first to get your grocery list</p>
        <Button onClick={generate} disabled={generating} className="bg-gradient-honey text-primary-foreground hover:opacity-90">
          {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Meal Plan</>}
        </Button>
      </div>
    );
  }

  const groceryItems = mealPlan.groceryList;
  const stores = mealPlan.storeRecommendations || [];
  const activeStore = selectedStore || stores[0]?.store || "";
  const storeMultiplier = STORE_MULTIPLIERS[activeStore] || 1.0;
  const baseMultiplier = stores.length > 0 ? (stores[0].estimatedTotal / mealPlan.totalEstimatedCost) : 1.0;

  const toggle = (name: string) => {
    const next = new Set(checked);
    next.has(name) ? next.delete(name) : next.add(name);
    setChecked(next);
  };

  const sections = Array.from(new Set(groceryItems.map((i) => i.section || "Other")));
  
  // Calculate store-specific prices
  const getStorePrice = (basePrice: number) => {
    if (!activeStore) return basePrice;
    return basePrice * (storeMultiplier / (STORE_MULTIPLIERS[stores[0]?.store] || 1.0));
  };

  const subtotal = groceryItems.reduce((sum, i) => sum + getStorePrice(i.estimatedPrice || 0), 0);
  const taxRate = mealPlan.taxEstimate ? mealPlan.taxEstimate / mealPlan.totalEstimatedCost : 0.03;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" /> Grocery List
          </h1>
          <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
            {groceryItems.length} items
            {mealPlan.regionLabel && (
              <span className="flex items-center gap-1 text-primary">
                <MapPin className="w-3 h-3" /> {mealPlan.regionLabel} pricing
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Print
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" /> Download
          </Button>
        </div>
      </div>

      {/* Store Comparison */}
      {stores.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-card p-6">
          <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-2">
            <Store className="w-5 h-5 text-primary" /> Store Price Comparison
          </h2>
          <p className="text-xs text-muted-foreground mb-4">
            Prices reflect your ZIP code region. Select a store to see item-level pricing.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stores.map((store) => {
              const isActive = activeStore === store.store;
              return (
                <button
                  key={store.store}
                  onClick={() => setSelectedStore(store.store)}
                  className={`relative p-5 rounded-xl border text-left transition-all ${
                    isActive
                      ? "border-primary bg-primary/5 shadow-card"
                      : "border-border hover:border-primary/30 hover:shadow-soft"
                  }`}
                >
                  {isActive && (
                    <span className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Selected
                    </span>
                  )}
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center overflow-hidden">
                      <Store className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{store.store}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        {(STORE_MULTIPLIERS[store.store] || 1) < 1 ? "Budget" : (STORE_MULTIPLIERS[store.store] || 1) > 1.1 ? "Premium" : "Standard"} pricing
                      </p>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-primary">${store.estimatedTotal?.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Estimated total + tax</p>
                </button>
              );
            })}
          </div>
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
            {groceryItems.filter((i) => (i.section || "Other") === section).map((item) => {
              const price = getStorePrice(item.estimatedPrice || 0);
              return (
                <label
                  key={item.name}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 cursor-pointer transition-colors"
                >
                  <Checkbox checked={checked.has(item.name)} onCheckedChange={() => toggle(item.name)} />
                  <div className="w-10 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                    <img
                      src={getProductImage(item.name)}
                      alt={item.name}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm ${checked.has(item.name) ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {item.name}
                    </p>
                    <p className="text-xs text-muted-foreground">{item.quantity}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-semibold text-foreground">${price.toFixed(2)}</span>
                    {activeStore && (
                      <p className="text-[10px] text-muted-foreground">at {activeStore}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {/* Totals */}
      <div className="bg-card rounded-2xl border border-border shadow-card p-6">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal ({activeStore || "Average"})</span>
            <span className="text-foreground font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estimated Tax ({(taxRate * 100).toFixed(1)}%)</span>
            <span className="text-foreground">${tax.toFixed(2)}</span>
          </div>
          {mealPlan.pantrySavings > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pantry Savings</span>
              <span className="text-accent font-semibold">−${mealPlan.pantrySavings.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-border pt-3 flex justify-between">
            <span className="font-semibold text-foreground text-base">Total</span>
            <span className="font-bold text-2xl text-primary">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
