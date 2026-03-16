import { useState } from "react";
import { Package, Plus, AlertTriangle, Clock, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const CATEGORIES = ["grains", "proteins", "vegetables", "fruits", "dairy", "pantry_staples", "frozen_foods", "canned_goods"] as const;
const CATEGORY_LABELS: Record<string, string> = {
  grains: "Grains", proteins: "Proteins", vegetables: "Vegetables", fruits: "Fruits",
  dairy: "Dairy", pantry_staples: "Pantry Staples", frozen_foods: "Frozen Foods", canned_goods: "Canned Goods",
};

interface PantryItem {
  id: string;
  name: string;
  quantity: string;
  category: string;
  expiration?: string;
  isLow?: boolean;
}

const INITIAL_ITEMS: PantryItem[] = [
  { id: "1", name: "Rice", quantity: "1 bag", category: "grains" },
  { id: "2", name: "Eggs", quantity: "12", category: "proteins", isLow: true },
  { id: "3", name: "Frozen Vegetables", quantity: "2 bags", category: "frozen_foods" },
  { id: "4", name: "Pasta", quantity: "2 boxes", category: "grains" },
  { id: "5", name: "Black Beans (canned)", quantity: "3 cans", category: "canned_goods" },
  { id: "6", name: "Chicken Breast", quantity: "1 lb", category: "proteins", expiration: "2026-03-20" },
  { id: "7", name: "Milk", quantity: "1/2 gallon", category: "dairy", expiration: "2026-03-18", isLow: true },
  { id: "8", name: "Bananas", quantity: "3", category: "fruits", expiration: "2026-03-19" },
];

const PANTRY_RECIPES = [
  { name: "Fried Rice", ingredients: "Rice, Eggs, Frozen Vegetables" },
  { name: "Bean Burrito Bowls", ingredients: "Rice, Black Beans" },
  { name: "Vegetable Pasta", ingredients: "Pasta, Frozen Vegetables" },
];

export default function PantryPage() {
  const [items, setItems] = useState<PantryItem[]>(INITIAL_ITEMS);
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newCat, setNewCat] = useState("");

  const handleAdd = () => {
    if (!newName || !newQty || !newCat) return;
    setItems([...items, { id: Date.now().toString(), name: newName, quantity: newQty, category: newCat }]);
    setNewName(""); setNewQty(""); setNewCat("");
    setAddOpen(false);
  };

  const lowStock = items.filter((i) => i.isLow);
  const expiringSoon = items.filter((i) => {
    if (!i.expiration) return false;
    const diff = new Date(i.expiration).getTime() - Date.now();
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
  });

  const originalEstimate = 82;
  const pantrySavings = 18;
  const finalCost = originalEstimate - pantrySavings;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-accent" /> Smart Pantry
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{items.length} items tracked</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-honey text-primary-foreground hover:opacity-90">
              <Plus className="w-4 h-4 mr-2" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Add Pantry Item</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Item Name</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Rice" /></div>
              <div><Label>Quantity</Label><Input value={newQty} onChange={(e) => setNewQty(e.target.value)} placeholder="e.g. 1 bag" /></div>
              <div>
                <Label>Category</Label>
                <Select value={newCat} onValueChange={setNewCat}>
                  <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CATEGORY_LABELS[c]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleAdd} className="w-full bg-gradient-honey text-primary-foreground hover:opacity-90">Add to Pantry</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Alerts */}
      {(lowStock.length > 0 || expiringSoon.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lowStock.length > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
              <h3 className="font-semibold text-destructive flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" /> Low Stock
              </h3>
              {lowStock.map((i) => <p key={i.id} className="text-sm text-foreground">{i.name} — {i.quantity}</p>)}
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <h3 className="font-semibold text-primary flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4" /> Expiring Soon
              </h3>
              {expiringSoon.map((i) => <p key={i.id} className="text-sm text-foreground">{i.name} — expires {i.expiration}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Pantry Savings */}
      <div className="bg-accent/10 border border-accent/20 rounded-xl p-5">
        <h3 className="font-display font-semibold text-foreground mb-2">Pantry Savings This Week</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div><p className="text-sm text-muted-foreground">Original Estimate</p><p className="text-lg font-bold text-foreground">${originalEstimate}</p></div>
          <div><p className="text-sm text-muted-foreground">Pantry Savings</p><p className="text-lg font-bold text-green-600">−${pantrySavings}</p></div>
          <div><p className="text-sm text-muted-foreground">Final Cost</p><p className="text-lg font-bold text-primary">${finalCost}</p></div>
        </div>
      </div>

      {/* Pantry Recipe Suggestions */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <h3 className="font-display text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
          <Utensils className="w-5 h-5 text-primary" /> Meals You Can Make With What You Have
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PANTRY_RECIPES.map((r) => (
            <div key={r.name} className="p-4 rounded-xl border border-border hover:border-primary/30 transition-colors">
              <p className="font-semibold text-foreground">{r.name}</p>
              <p className="text-xs text-muted-foreground mt-1">{r.ingredients}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Inventory by Category */}
      {CATEGORIES.filter((c) => items.some((i) => i.category === c)).map((cat) => (
        <div key={cat} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
          <div className="bg-muted/50 px-5 py-3 border-b border-border">
            <h3 className="font-semibold text-foreground text-sm">{CATEGORY_LABELS[cat]}</h3>
          </div>
          <div className="divide-y divide-border">
            {items.filter((i) => i.category === cat).map((item) => (
              <div key={item.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="font-medium text-foreground">{item.name}</p>
                  <p className="text-xs text-muted-foreground">{item.quantity}</p>
                </div>
                <div className="flex items-center gap-2">
                  {item.isLow && <Badge variant="destructive" className="text-xs">Low</Badge>}
                  {item.expiration && (
                    <span className="text-xs text-muted-foreground">Exp: {item.expiration}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
