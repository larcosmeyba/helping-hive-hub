import { useState } from "react";
import { Package, Plus, AlertTriangle, Clock, Utensils, Trash2, Loader2, CheckCircle2, Circle, AlertCircle, Camera } from "lucide-react";
import { PhotoScanner } from "@/components/dashboard/PhotoScanner";
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
    mutationFn: async () => {
      const { error } = await supabase.from("pantry_items").insert({
        user_id: user!.id,
        item_name: newName,
        quantity: newQty,
        category: newCat,
        expiration_date: newExp || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pantry_items"] });
      setNewName(""); setNewQty(""); setNewCat(""); setNewExp("");
      setAddOpen(false);
      toast({ title: "Added!", description: `${newName} added to pantry.` });
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
        {/* Check off / mark out */}
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
          {/* Low stock toggle */}
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-5 h-5 md:w-6 md:h-6 text-accent" /> My Fridge & Pantry
          </h1>
          <p className="text-xs md:text-sm text-muted-foreground mt-0.5">{inStockItems.length} in stock • {outOfStockItems.length} out • AI uses this data</p>
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="bg-gradient-honey text-primary-foreground hover:opacity-90">
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
              <Button onClick={() => addMutation.mutate()} disabled={!newName || !newQty || !newCat || addMutation.isPending} className="w-full bg-gradient-honey text-primary-foreground hover:opacity-90">
                {addMutation.isPending ? "Adding..." : "Add to Pantry"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

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
        <div className="bg-card rounded-2xl border border-border shadow-card p-10 text-center">
          <Package className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <h2 className="font-display text-lg font-semibold text-foreground mb-2">Pantry is Empty</h2>
          <p className="text-sm text-muted-foreground mb-4">Add items you already have to save money on your next meal plan.</p>
          <Button onClick={() => setAddOpen(true)} className="bg-gradient-honey text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" /> Add Your First Item
          </Button>
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
