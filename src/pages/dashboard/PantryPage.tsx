import { useState, useEffect } from "react";
import { Package, Plus, AlertTriangle, Clock, Utensils, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
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

  const lowStock = items.filter((i) => i.is_low_stock);
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-accent" /> Smart Pantry
          </h1>
          <p className="text-sm text-muted-foreground mt-1">{items.length} items tracked • Pantry data feeds AI meal planning</p>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {lowStock.length > 0 && (
            <div className="bg-destructive/5 border border-destructive/20 rounded-xl p-4">
              <h3 className="font-semibold text-destructive flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4" /> Low Stock ({lowStock.length})
              </h3>
              {lowStock.map((i) => <p key={i.id} className="text-sm text-foreground">{i.item_name} — {i.quantity}</p>)}
            </div>
          )}
          {expiringSoon.length > 0 && (
            <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
              <h3 className="font-semibold text-primary flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4" /> Expiring Soon ({expiringSoon.length})
              </h3>
              {expiringSoon.map((i) => <p key={i.id} className="text-sm text-foreground">{i.item_name} — {i.expiration_date}</p>)}
            </div>
          )}
        </div>
      )}

      {/* Info card */}
      <div className="bg-accent/10 border border-accent/20 rounded-xl p-5">
        <h3 className="font-display font-semibold text-foreground mb-1 flex items-center gap-2">
          <Utensils className="w-4 h-4 text-accent" /> How Pantry Works
        </h3>
        <p className="text-sm text-muted-foreground">
          Items in your pantry are sent to our AI meal engine when generating plans. The AI prioritizes using what you already have to maximize savings and minimize waste.
        </p>
      </div>

      {/* Inventory by Category */}
      {items.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border shadow-card p-12 text-center">
          <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-display text-lg font-semibold text-foreground mb-2">Pantry is Empty</h2>
          <p className="text-sm text-muted-foreground mb-4">Add items you already have to save money on your next meal plan.</p>
          <Button onClick={() => setAddOpen(true)} className="bg-gradient-honey text-primary-foreground hover:opacity-90">
            <Plus className="w-4 h-4 mr-2" /> Add Your First Item
          </Button>
        </div>
      ) : (
        CATEGORIES.filter((c) => items.some((i) => i.category === c)).map((cat) => (
          <div key={cat} className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
            <div className="bg-muted/50 px-5 py-3 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold text-foreground text-sm">{CATEGORY_LABELS[cat]}</h3>
              <span className="text-xs text-muted-foreground">{items.filter((i) => i.category === cat).length} items</span>
            </div>
            <div className="divide-y divide-border">
              {items.filter((i) => i.category === cat).map((item) => (
                <div key={item.id} className="flex items-center justify-between px-5 py-3 hover:bg-muted/10 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{item.item_name}</p>
                    <p className="text-xs text-muted-foreground">{item.quantity}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.is_low_stock && <Badge variant="destructive" className="text-xs">Low</Badge>}
                    {item.expiration_date && (
                      <span className="text-xs text-muted-foreground">Exp: {item.expiration_date}</span>
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
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
