import { useState } from "react";
import { ShoppingCart, Printer, Download, Store, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useMealPlan } from "@/contexts/MealPlanContext";

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

  const toggle = (name: string) => {
    const next = new Set(checked);
    next.has(name) ? next.delete(name) : next.add(name);
    setChecked(next);
  };

  const sections = Array.from(new Set(groceryItems.map((i) => i.section || "Other")));
  const subtotal = groceryItems.reduce((sum, i) => sum + (i.estimatedPrice || 0), 0);
  const taxRate = mealPlan.taxEstimate ? mealPlan.taxEstimate / subtotal : 0.03;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" /> Grocery List
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{groceryItems.length} items • Generated from your meal plan</p>
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

      {/* Store Recommendation */}
      {stores.length > 0 && (
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
            <Store className="w-5 h-5 text-primary" /> Recommended Stores
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {stores.map((store) => (
              <button
                key={store.store}
                onClick={() => setSelectedStore(store.store)}
                className={`p-4 rounded-xl border text-left transition-colors ${
                  activeStore === store.store
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <p className="font-semibold text-foreground">{store.store}</p>
                <p className="text-lg font-bold text-primary">${store.estimatedTotal?.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">Estimated total</p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Grocery Items by Section */}
      {sections.map((section) => (
        <div key={section} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="bg-muted/50 px-5 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">{section}</h3>
          </div>
          <div className="divide-y divide-border">
            {groceryItems.filter((i) => (i.section || "Other") === section).map((item) => (
              <label
                key={item.name}
                className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 cursor-pointer transition-colors"
              >
                <Checkbox checked={checked.has(item.name)} onCheckedChange={() => toggle(item.name)} />
                <div className="flex-1">
                  <p className={`font-medium ${checked.has(item.name) ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.quantity}</p>
                </div>
                <span className="text-sm font-medium text-foreground">${(item.estimatedPrice || 0).toFixed(2)}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* Totals */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">${subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Estimated Tax</span><span className="text-foreground">${tax.toFixed(2)}</span></div>
          {mealPlan.pantrySavings > 0 && (
            <div className="flex justify-between"><span className="text-muted-foreground">Pantry Savings</span><span className="text-accent font-medium">−${mealPlan.pantrySavings.toFixed(2)}</span></div>
          )}
          <div className="border-t border-border pt-2 flex justify-between">
            <span className="font-semibold text-foreground">Total</span>
            <span className="font-bold text-lg text-primary">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
