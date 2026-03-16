import { useState } from "react";
import { ShoppingCart, Printer, Download, Store } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

const GROCERY_ITEMS = [
  { name: "Chicken Breast", quantity: "2 lbs", price: 6.58, section: "Meat" },
  { name: "Rice (Long Grain)", quantity: "1 bag", price: 2.50, section: "Grains" },
  { name: "Bell Peppers", quantity: "3", price: 3.20, section: "Produce" },
  { name: "Onions", quantity: "2", price: 1.30, section: "Produce" },
  { name: "Canned Black Beans", quantity: "2 cans", price: 1.80, section: "Canned Goods" },
  { name: "Eggs (12 ct)", quantity: "1 dozen", price: 3.50, section: "Dairy" },
  { name: "Pasta", quantity: "1 box", price: 1.29, section: "Grains" },
  { name: "Ground Beef", quantity: "1 lb", price: 5.49, section: "Meat" },
  { name: "Tomato Sauce", quantity: "2 cans", price: 2.00, section: "Canned Goods" },
  { name: "Bananas", quantity: "1 bunch", price: 0.89, section: "Produce" },
  { name: "Yogurt", quantity: "32 oz", price: 3.99, section: "Dairy" },
  { name: "Bread (Whole Wheat)", quantity: "1 loaf", price: 2.79, section: "Grains" },
  { name: "Frozen Vegetables", quantity: "2 bags", price: 4.00, section: "Frozen" },
  { name: "Oats", quantity: "1 container", price: 3.49, section: "Grains" },
  { name: "Tortillas", quantity: "1 pack", price: 2.99, section: "Grains" },
  { name: "Cheese (Shredded)", quantity: "8 oz", price: 3.29, section: "Dairy" },
];

const STORES = [
  { name: "Aldi", cost: 68.00 },
  { name: "Walmart", cost: 71.00 },
  { name: "Target", cost: 74.00 },
];

export default function GroceryListPage() {
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [selectedStore, setSelectedStore] = useState("Aldi");

  const toggle = (name: string) => {
    const next = new Set(checked);
    next.has(name) ? next.delete(name) : next.add(name);
    setChecked(next);
  };

  const sections = Array.from(new Set(GROCERY_ITEMS.map((i) => i.section)));
  const subtotal = GROCERY_ITEMS.reduce((sum, i) => sum + i.price, 0);
  const tax = subtotal * 0.03;
  const total = subtotal + tax;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <ShoppingCart className="w-6 h-6 text-primary" /> Grocery List
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{GROCERY_ITEMS.length} items • Generated from your meal plan</p>
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
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
          <Store className="w-5 h-5 text-primary" /> Recommended Stores
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {STORES.map((store) => (
            <button
              key={store.name}
              onClick={() => setSelectedStore(store.name)}
              className={`p-4 rounded-xl border text-left transition-colors ${
                selectedStore === store.name
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/30"
              }`}
            >
              <p className="font-semibold text-foreground">{store.name}</p>
              <p className="text-lg font-bold text-primary">${store.cost.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Estimated total</p>
            </button>
          ))}
        </div>
      </div>

      {/* Grocery Items by Section */}
      {sections.map((section) => (
        <div key={section} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="bg-muted/50 px-5 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">{section}</h3>
          </div>
          <div className="divide-y divide-border">
            {GROCERY_ITEMS.filter((i) => i.section === section).map((item) => (
              <label
                key={item.name}
                className="flex items-center gap-4 px-5 py-3 hover:bg-muted/20 cursor-pointer transition-colors"
              >
                <Checkbox
                  checked={checked.has(item.name)}
                  onCheckedChange={() => toggle(item.name)}
                />
                <div className="flex-1">
                  <p className={`font-medium ${checked.has(item.name) ? "line-through text-muted-foreground" : "text-foreground"}`}>
                    {item.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{item.quantity}</p>
                </div>
                <span className="text-sm font-medium text-foreground">${item.price.toFixed(2)}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* Totals */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span className="text-foreground">${subtotal.toFixed(2)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">State Tax (3%)</span><span className="text-foreground">${tax.toFixed(2)}</span></div>
          <div className="border-t border-border pt-2 flex justify-between">
            <span className="font-semibold text-foreground">Total</span>
            <span className="font-bold text-lg text-primary">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
