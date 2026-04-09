import { useState } from "react";
import { Package, Plus, AlertTriangle, Clock, Utensils, Trash2, Loader2, CheckCircle2, Circle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";

const CATEGORIES = ["grains", "proteins", "vegetables", "fruits", "dairy", "pantry_staples", "frozen_foods", "canned_goods"] as const;
const CATEGORY_LABELS: Record<string, string> = {
  grains: "Grains", proteins: "Proteins", vegetables: "Vegetables", fruits: "Fruits",
  dairy: "Dairy", pantry_staples: "Pantry Staples", frozen_foods: "Frozen Foods", canned_goods: "Canned Goods",
};

const PANTRY_ITEM_IMAGES: Record<string, string> = {
  oats: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=80&h=80&fit=crop",
  oatmeal: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=80&h=80&fit=crop",
  "peanut butter": "https://images.unsplash.com/photo-1598511726623-d2e9996892f0?w=80&h=80&fit=crop",
  rice: "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=80&h=80&fit=crop",
  beans: "https://images.unsplash.com/photo-1511690743698-d9d18f7e20f1?w=80&h=80&fit=crop",
  pasta: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=80&h=80&fit=crop",
  eggs: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=80&h=80&fit=crop",
  milk: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=80&h=80&fit=crop",
  bread: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=80&h=80&fit=crop",
  chicken: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=80&h=80&fit=crop",
  tomato: "https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=80&h=80&fit=crop",
  butter: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc0d?w=80&h=80&fit=crop",
  frozen: "https://images.unsplash.com/photo-1580910365203-91ea9115a319?w=80&h=80&fit=crop",
};

const DEFAULT_PANTRY_IMAGE = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=80&h=80&fit=crop";

function getPantryImage(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, url] of Object.entries(PANTRY_ITEM_IMAGES)) {
    if (lower.includes(keyword)) return url;
  }
  return DEFAULT_PANTRY_IMAGE;
}

// Quick-add items with category mapping
const QUICK_ADD_ITEMS = [
  { name: "Eggs", quantity: "1 dozen", category: "dairy" },
  { name: "Rice", quantity: "1 bag", category: "grains" },
  { name: "Chicken", quantity: "1 lb", category: "proteins" },
  { name: "Pasta", quantity: "1 box", category: "grains" },
  { name: "Beans", quantity: "2 cans", category: "canned_goods" },
  { name: "Milk", quantity: "1 gallon", category: "dairy" },
  { name: "Butter", quantity: "1 stick", category: "dairy" },
  { name: "Bread", quantity: "1 loaf", category: "grains" },
  { name: "Frozen Veggies", quantity: "1 bag", category: "frozen_foods" },
  { name: "Onions", quantity: "3 lb bag", category: "vegetables" },
  { name: "Potatoes", quantity: "5 lb bag", category: "vegetables" },
  { name: "Garlic", quantity: "1 head", category: "vegetables" },
];

const PANTRY_STAPLES = [
  { name: "Rice (10 lb bag)", category: "Grains", shelf: "6-12 months" },
  { name: "Dried Pinto Beans (4 lb bag)", category: "Proteins", shelf: "1-2 years" },
  { name: "Dried Black Beans (4 lb bag)", category: "Proteins", shelf: "1-2 years" },
  { name: "Dried Lentils (2 lb bag)", category: "Proteins", shelf: "1-2 years" },
  { name: "Oats (Large canister)", category: "Grains", shelf: "1-2 years" },
  { name: "Flour (5 lb bag)", category: "Grains", shelf: "6-8 months" },
  { name: "Pasta (2 lb box)", category: "Grains", shelf: "1-2 years" },
  { name: "Canned Tomatoes (28 oz)", category: "Canned Goods", shelf: "1-2 years" },
  { name: "Canned Tuna", category: "Proteins", shelf: "2-5 years" },
  { name: "Peanut Butter (Large jar)", category: "Proteins", shelf: "6-9 months" },
  { name: "Cooking Oil (48 oz)", category: "Pantry Staples", shelf: "1-2 years" },
  { name: "Salt (26 oz)", category: "Pantry Staples", shelf: "Indefinite" },
  { name: "Sugar (4 lb bag)", category: "Pantry Staples", shelf: "Indefinite" },
  { name: "Dried Chickpeas (2 lb bag)", category: "Proteins", shelf: "1-2 years" },
  { name: "Cornmeal (5 lb bag)", category: "Grains", shelf: "6-12 months" },
  { name: "Canned Corn", category: "Canned Goods", shelf: "2-5 years" },
  { name: "Canned Green Beans", category: "Canned Goods", shelf: "2-5 years" },
  { name: "Powdered Milk", category: "Dairy", shelf: "1-2 years" },
  { name: "Honey (Large bottle)", category: "Pantry Staples", shelf: "Indefinite" },
  { name: "Soy Sauce", category: "Pantry Staples", shelf: "2-3 years" },
];

function PantryStaplesSection() {
  const [open, setOpen] = useState(false);

  return (
    <div className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <span className="font-display font-semibold text-foreground text-sm">Pantry Staples Every Family Should Have</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-1.5 border-t border-border pt-3">
          <p className="text-xs text-muted-foreground mb-2">
            Long-shelf-life essentials to stock up on. Prices vary by location.
          </p>
          {PANTRY_STAPLES.map((item, i) => (
            <div key={i} className="flex items-center justify-between py-1.5 border-b border-border/50 last:border-0">
              <div>
                <p className="text-sm font-medium text-foreground">{item.name}</p>
                <p className="text-[10px] text-muted-foreground">{item.category}</p>
              </div>
              <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{item.shelf}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PantryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("");
  const [newCat, setNewCat] = useState("");
  const [newExp, setNewExp] = useState("");

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["pantry_items", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pantry_items")
        .select("*")
        .eq("user_id", user!.id)
        .order("category");
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async (params?: { name: string; quantity: string; category: string }) => {
      const itemName = params?.name || newName;
      const itemQty = params?.quantity || newQty;
      const itemCat = params?.category || newCat;
      const { error } = await supabase.from("pantry_items").insert({
        user_id: user!.id,
        item_name: itemName,
        quantity: itemQty,
        category: itemCat,
        expiration_date: params ? null : (newExp || null),
      });
      if (error) throw error;
      return itemName;
    },
    onSuccess: (itemName) => {
      queryClient.invalidateQueries({ queryKey: ["pantry_items"] });
      if (!itemName) {
        setNewName(""); setNewQty(""); setNewCat(""); setNewExp("");
        setAddOpen(false);
      }
      toast({ title: "Added!", description: `${itemName || newName} added to pantry.` });
    },
    onError: (err: any) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pantry_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry_items"] });
      toast({ title: "Removed", description: "Item removed from pantry." });
    },
  });

  const toggleLowStock = useMutation({
    mutationFn: async ({ id, isLow }: { id: string; isLow: boolean }) => {
      const { error } = await supabase.from("pantry_items").update({ is_low_stock: !isLow }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pantry_items"] }),
  });

  const toggleOutOfStock = useMutation({
    mutationFn: async ({ id, isOut }: { id: string; isOut: boolean }) => {
      const { error } = await supabase.from("pantry_items").update({ is_out_of_stock: !isOut } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry_items"] });
    },
  });

  const handleQuickAdd = (item: typeof QUICK_ADD_ITEMS[0]) => {
    // Check if item already exists
    const exists = items.some(i => i.item_name.toLowerCase() === item.name.toLowerCase());
    if (exists) {
      toast({ title: "Already in pantry", description: `${item.name} is already in your pantry.` });
      return;
    }
    addMutation.mutate({ name: item.name, quantity: item.quantity, category: item.category });
  };

  const inStockItems = items.filter((i) => !(i as any).is_out_of_stock);
  const outOfStockItems = items.filter((i) => (i as any).is_out_of_stock);
  const lowStock = items.filter((i) => i.is_low_stock && !(i as any).is_out_of_stock);
  const expiringSoon = items.filter((i) => {
    if (!i.expiration_date) return false;
    const diff = new Date(i.expiration_date).getTime() - Date.now();
    return diff > 0 && diff < 3 * 24 * 60 * 60 * 1000;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const renderItem = (item: typeof items[0]) => {
    const isOut = (item as any).is_out_of_stock;
    return (
      <div key={item.id} className={`flex items-center gap-3 px-4 py-3 hover:bg-muted/10 transition-colors ${isOut ? "opacity-50" : ""}`}>
        <img
          src={getPantryImage(item.item_name)}
          alt={item.item_name}
          className="w-9 h-9 rounded-lg object-cover shrink-0"
          onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_PANTRY_IMAGE; }}
        />
        <button
          onClick={() => toggleOutOfStock.mutate({ id: item.id, isOut: !!isOut })}
          className="shrink-0"
          title={isOut ? "Mark as in stock" : "Mark as out"}
        >
          {isOut ? (
            <CheckCircle2 className="w-5 h-5 text-muted-foreground" />
          ) : (
            <Circle className="w-5 h-5 text-muted-foreground hover:text-primary transition-colors" />
          )}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-foreground text-sm ${isOut ? "line-through" : ""}`}>{item.item_name}</p>
          <p className="text-xs text-muted-foreground">{item.quantity}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {!isOut && (
            <button
              onClick={() => toggleLowStock.mutate({ id: item.id, isLow: !!item.is_low_stock })}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${
                item.is_low_stock
                  ? "bg-destructive/10 text-destructive border-destructive/30"
                  : "bg-muted/50 text-muted-foreground border-border hover:border-destructive/30 hover:text-destructive"
              }`}
              title={item.is_low_stock ? "Remove low stock" : "Mark as low"}
            >
              {item.is_low_stock ? "Low" : "Mark Low"}
            </button>
          )}
          {item.expiration_date && (
            <span className="text-[10px] text-muted-foreground hidden sm:inline">Exp: {item.expiration_date}</span>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={() => deleteMutation.mutate(item.id)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Intro Section */}
      <div className="space-y-4">
        <h1 className="font-display text-[28px] md:text-[32px] font-bold text-[#2F2F2F] leading-[1.15] flex items-center gap-2.5">
          <Package className="w-6 h-6 text-accent shrink-0" />
          Your Pantry
        </h1>

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <Dialog open={addOpen} onOpenChange={setAddOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-honey text-primary-foreground hover:opacity-90 h-[48px] px-5 text-sm font-semibold rounded-xl">
                <Plus className="w-4 h-4 mr-1.5" /> Add Item
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
                <div><Label>Expiration Date (optional)</Label><Input type="date" value={newExp} onChange={(e) => setNewExp(e.target.value)} /></div>
                <Button onClick={() => addMutation.mutate(undefined)} disabled={!newName || !newQty || !newCat || addMutation.isPending} className="w-full bg-gradient-honey text-primary-foreground hover:opacity-90">
                  {addMutation.isPending ? "Adding..." : "Add to Pantry"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <p className="text-[15px] md:text-base text-[#6B6B6B] leading-relaxed">
          Add what you already have so your meal plan uses it first, reduces waste, and keeps grocery costs lower.
        </p>
      </div>

      {/* Quick Add Section */}
      <div className="bg-card rounded-2xl border border-border shadow-card p-4">
        <h3 className="font-display font-semibold text-foreground text-sm mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-primary" /> Quick Add Common Items
        </h3>
        <div className="flex flex-wrap gap-2">
          {QUICK_ADD_ITEMS.map((item) => {
            const alreadyInPantry = items.some(i => i.item_name.toLowerCase() === item.name.toLowerCase());
            return (
              <button
                key={item.name}
                onClick={() => handleQuickAdd(item)}
                disabled={alreadyInPantry || addMutation.isPending}
                className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all ${
                  alreadyInPantry
                    ? "bg-primary/10 text-primary border-primary/30 cursor-default"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-primary active:scale-95"
                }`}
              >
                {alreadyInPantry ? "✓ " : "+ "}{item.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Pantry Staples Checklist */}
      <PantryStaplesSection />

      {/* Alerts */}
      {(lowStock.length > 0 || expiringSoon.length > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {lowStock.length > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-3">
              <h3 className="font-semibold text-destructive flex items-center gap-2 text-sm mb-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> Low Stock ({lowStock.length})
              </h3>
              {lowStock.map((i) => <p key={i.id} className="text-xs text-foreground">{i.item_name} — {i.quantity}</p>)}
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-3">
              <h3 className="font-semibold text-primary flex items-center gap-2 text-sm mb-1.5">
                <Clock className="w-3.5 h-3.5" /> Expiring Soon ({expiringSoon.length})
              </h3>
              {expiringSoon.map((i) => <p key={i.id} className="text-xs text-foreground">{i.item_name} — {i.expiration_date}</p>)}
            </div>
          )}
        </div>
      )}

      {/* How it works */}
      <div className="bg-accent/10 border border-accent/20 rounded-xl p-4">
        <h3 className="font-display font-semibold text-foreground text-sm mb-0.5 flex items-center gap-2">
          <Utensils className="w-3.5 h-3.5 text-accent" /> How It Works
        </h3>
        <p className="text-xs text-muted-foreground">
          Add what's in your fridge. Mark items as <strong>Low</strong> when running out, or <strong>check them off</strong> when they're gone. Your AI meal plans prioritize what you have.
        </p>
      </div>

      {/* Tabs: In Stock / Out of Stock */}
      {items.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-card p-8 text-center">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-display text-lg font-semibold text-foreground mb-2">Pantry is Empty</h2>
          <p className="text-sm text-muted-foreground mb-4">Use the quick add buttons above, or tap "Add Item" to get started.</p>
        </div>
      ) : (
        <Tabs defaultValue="in-stock">
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="in-stock" className="text-xs">In Stock ({inStockItems.length})</TabsTrigger>
            <TabsTrigger value="out" className="text-xs">Out / Used Up ({outOfStockItems.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="in-stock" className="space-y-3 mt-3">
            {CATEGORIES.filter((c) => inStockItems.some((i) => i.category === c)).map((cat) => (
              <div key={cat} className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b border-border flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-xs">{CATEGORY_LABELS[cat]}</h3>
                  <span className="text-[10px] text-muted-foreground">{inStockItems.filter((i) => i.category === cat).length}</span>
                </div>
                <div className="divide-y divide-border">
                  {inStockItems.filter((i) => i.category === cat).map(renderItem)}
                </div>
              </div>
            ))}
            {inStockItems.length === 0 && (
              <div className="text-center py-8 text-muted-foreground text-sm">All items are checked off!</div>
            )}
          </TabsContent>

          <TabsContent value="out" className="mt-3">
            {outOfStockItems.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">No items checked off yet</div>
            ) : (
              <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b border-border">
                  <h3 className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5" /> Used Up / Out of Stock
                  </h3>
                </div>
                <div className="divide-y divide-border">
                  {outOfStockItems.map(renderItem)}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
