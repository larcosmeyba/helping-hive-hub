import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Package, Plus, Search, SlidersHorizontal, Clock, Leaf, DollarSign,
  AlertTriangle, ChevronRight, Trash2, Lightbulb, Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { trackEvent } from "@/lib/analytics";

// ── Category model used by the new pantry tab ──────────────────────────────
type CategoryKey =
  | "dairy" | "produce" | "protein" | "grains"
  | "pantry_staples" | "frozen" | "household" | "other";

const CATEGORY_LABEL: Record<string, string> = {
  dairy: "Dairy", produce: "Produce", protein: "Protein", grains: "Grains",
  pantry_staples: "Pantry Staples", frozen: "Frozen", household: "Household", other: "Other",
  // Legacy values – mapped for display only
  proteins: "Protein", vegetables: "Produce", fruits: "Produce",
  frozen_foods: "Frozen", canned_goods: "Pantry Staples",
};

const CATEGORY_OPTIONS: { key: CategoryKey; label: string }[] = [
  { key: "dairy", label: "Dairy" },
  { key: "produce", label: "Produce" },
  { key: "protein", label: "Protein" },
  { key: "grains", label: "Grains" },
  { key: "pantry_staples", label: "Pantry Staples" },
  { key: "frozen", label: "Frozen" },
  { key: "household", label: "Household" },
  { key: "other", label: "Other" },
];

const CHIPS: { key: string; label: string }[] = [
  { key: "all", label: "All Items" },
  { key: "dairy", label: "Dairy" },
  { key: "produce", label: "Produce" },
  { key: "protein", label: "Protein" },
  { key: "grains", label: "Grains" },
  { key: "frozen", label: "Frozen" },
  { key: "pantry_staples", label: "Pantry" },
  { key: "low_stock", label: "Low Stock" },
  { key: "expiring_soon", label: "Expiring Soon" },
];

const LOCATIONS = ["pantry", "fridge", "freezer"] as const;
type Location = typeof LOCATIONS[number];

// ── Image helper ───────────────────────────────────────────────────────────
const ITEM_IMAGES: Record<string, string> = {
  milk: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200&h=200&fit=crop",
  broccoli: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=200&h=200&fit=crop",
  eggs: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?w=200&h=200&fit=crop",
  yogurt: "https://images.unsplash.com/photo-1571212515416-fca325d2a4d3?w=200&h=200&fit=crop",
  rice: "https://images.unsplash.com/photo-1516684732162-798a0062be99?w=200&h=200&fit=crop",
  chicken: "https://images.unsplash.com/photo-1598103442097-8b74394b95c6?w=200&h=200&fit=crop",
  pasta: "https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=200&h=200&fit=crop",
  bread: "https://images.unsplash.com/photo-1525351484163-7529414344d8?w=200&h=200&fit=crop",
  butter: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc0d?w=200&h=200&fit=crop",
  tomato: "https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=200&h=200&fit=crop",
  beans: "https://images.unsplash.com/photo-1511690743698-d9d18f7e20f1?w=200&h=200&fit=crop",
  oats: "https://images.unsplash.com/photo-1517673400267-0251440c45dc?w=200&h=200&fit=crop",
};
const DEFAULT_IMG = "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200&h=200&fit=crop";
function itemImage(name: string): string {
  const lower = (name || "").toLowerCase();
  for (const [k, v] of Object.entries(ITEM_IMAGES)) if (lower.includes(k)) return v;
  return DEFAULT_IMG;
}

// ── Freshness ──────────────────────────────────────────────────────────────
function daysUntil(d?: string | null): number | null {
  if (!d) return null;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const exp = new Date(d); exp.setHours(0, 0, 0, 0);
  return Math.floor((exp.getTime() - today.getTime()) / 86400000);
}
function freshnessOf(item: any): "good" | "use_soon" | "expiring_today" | "expired" | "low_stock" {
  const d = daysUntil(item.expiration_date);
  if (d !== null) {
    if (d < 0) return "expired";
    if (d === 0) return "expiring_today";
    if (d <= 3) return "use_soon";
  }
  if (item.is_low_stock) return "low_stock";
  return "good";
}
function freshnessBadge(f: ReturnType<typeof freshnessOf>) {
  switch (f) {
    case "expired": return { label: "Expired", cls: "bg-destructive/15 text-destructive border-destructive/30" };
    case "expiring_today": return { label: "Today", cls: "bg-destructive/10 text-destructive border-destructive/30" };
    case "use_soon": return { label: "Use Soon", cls: "bg-[#F2A900]/15 text-[#A56A00] border-[#F2A900]/30" };
    case "low_stock": return { label: "Low", cls: "bg-orange-100 text-orange-700 border-orange-200" };
    default: return { label: "Good", cls: "bg-emerald-100 text-emerald-700 border-emerald-200" };
  }
}

function fmtDate(d?: string | null) {
  if (!d) return "";
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Add / Edit Dialog ──────────────────────────────────────────────────────
type FormState = {
  item_name: string; quantity: string; unit: string;
  category: string; location: Location;
  purchase_date: string; expiration_date: string;
  is_low_stock: boolean;
};
const EMPTY_FORM: FormState = {
  item_name: "", quantity: "", unit: "", category: "",
  location: "pantry", purchase_date: "", expiration_date: "", is_low_stock: false,
};

function ItemForm({
  value, onChange, onSubmit, submitting, submitLabel = "Save Item",
}: {
  value: FormState; onChange: (v: FormState) => void; onSubmit: () => void;
  submitting?: boolean; submitLabel?: string;
}) {
  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => onChange({ ...value, [k]: v });
  return (
    <div className="space-y-3">
      <div>
        <Label>Item name</Label>
        <Input value={value.item_name} onChange={(e) => set("item_name", e.target.value)} placeholder="e.g. Milk" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Quantity</Label>
          <Input value={value.quantity} onChange={(e) => set("quantity", e.target.value)} placeholder="e.g. 1" />
        </div>
        <div>
          <Label>Unit</Label>
          <Input value={value.unit} onChange={(e) => set("unit", e.target.value)} placeholder="e.g. gallon, lb" />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Category</Label>
          <Select value={value.category} onValueChange={(v) => set("category", v)}>
            <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
            <SelectContent>
              {CATEGORY_OPTIONS.map((c) => <SelectItem key={c.key} value={c.key}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Location</Label>
          <Select value={value.location} onValueChange={(v) => set("location", v as Location)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Purchase date</Label>
          <Input type="date" value={value.purchase_date} onChange={(e) => set("purchase_date", e.target.value)} />
        </div>
        <div>
          <Label>Expiration date</Label>
          <Input type="date" value={value.expiration_date} onChange={(e) => set("expiration_date", e.target.value)} />
        </div>
      </div>
      <div className="flex items-center justify-between pt-1">
        <Label className="mb-0">Low stock</Label>
        <Switch checked={value.is_low_stock} onCheckedChange={(v) => set("is_low_stock", v)} />
      </div>
      <Button
        onClick={onSubmit}
        disabled={!value.item_name || submitting}
        className="w-full bg-[#F2A900] hover:bg-[#D69500] text-white h-11 rounded-xl font-semibold"
      >
        {submitting ? "Saving..." : submitLabel}
      </Button>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────
export default function PantryPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState<FormState>(EMPTY_FORM);
  const [editItem, setEditItem] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<FormState>(EMPTY_FORM);

  const [search, setSearch] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [activeChip, setActiveChip] = useState<string>("all");
  const [filterLocation, setFilterLocation] = useState<string>("all");
  const [filterFreshness, setFilterFreshness] = useState<string>("all");

  const { data: rawItems = [], isLoading } = useQuery({
    queryKey: ["pantry_items_v2", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("pantry_items").select("*").eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  const items = useMemo(
    () => (rawItems as any[]).filter((i) => i && !i.checked_off && !i.is_out_of_stock),
    [rawItems],
  );

  // Stats
  const stats = useMemo(() => {
    let expiringSoon = 0, lowStock = 0, savings = 0;
    for (const it of items) {
      const f = freshnessOf(it);
      if (f === "use_soon" || f === "expiring_today") {
        expiringSoon++;
        savings += Number(it.estimated_value ?? 3);
      }
      if (it.is_low_stock || f === "low_stock") lowStock++;
    }
    return {
      total: items.length,
      expiringSoon,
      lowStock,
      savings: Math.round(savings),
    };
  }, [items]);

  // Filter pipeline
  const filtered = useMemo(() => {
    let out = items;
    if (search.trim()) {
      const q = search.toLowerCase();
      out = out.filter((i) => (i.item_name || "").toLowerCase().includes(q));
    }
    if (filterLocation !== "all") out = out.filter((i) => (i.location ?? "pantry") === filterLocation);
    if (filterFreshness !== "all") out = out.filter((i) => freshnessOf(i) === filterFreshness);
    if (activeChip !== "all") {
      if (activeChip === "low_stock") out = out.filter((i) => !!i.is_low_stock);
      else if (activeChip === "expiring_soon") {
        out = out.filter((i) => ["use_soon", "expiring_today"].includes(freshnessOf(i)));
      } else {
        out = out.filter((i) => {
          const c = i.category;
          if (activeChip === "produce") return ["produce", "vegetables", "fruits"].includes(c);
          if (activeChip === "protein") return ["protein", "proteins"].includes(c);
          if (activeChip === "frozen") return ["frozen", "frozen_foods"].includes(c);
          if (activeChip === "pantry_staples") return ["pantry_staples", "canned_goods"].includes(c);
          return c === activeChip;
        });
      }
    }
    return out;
  }, [items, search, filterLocation, filterFreshness, activeChip]);

  const expiringSoonList = useMemo(
    () => items.filter((i) => ["use_soon", "expiring_today"].includes(freshnessOf(i))),
    [items],
  );

  // Mutations ──────────────────────────────────────────────────────────────
  const addItem = useMutation({
    mutationFn: async (v: FormState) => {
      const payload: any = {
        user_id: user!.id,
        item_name: v.item_name,
        normalized_item_name: v.item_name.toLowerCase().trim(),
        quantity: v.quantity || null,
        unit: v.unit || null,
        category: v.category || "other",
        location: v.location,
        purchase_date: v.purchase_date || null,
        expiration_date: v.expiration_date || null,
        is_low_stock: v.is_low_stock,
        manually_added: true,
      };
      const { error } = await supabase.from("pantry_items").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pantry_items_v2"] });
      setAddForm(EMPTY_FORM); setAddOpen(false);
      void trackEvent("pantry_item_added", { source: "manual" });
      toast({ title: "Added", description: "Item saved to your pantry." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("pantry_items").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pantry_items_v2"] }),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pantry_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pantry_items_v2"] });
      void trackEvent("pantry_item_deleted");
      toast({ title: "Removed", description: "Item removed." });
    },
  });

  const sendToGrocery = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.functions.invoke("add-low-stock-to-grocery-list", {
        body: { pantry_item_ids: [id] },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      void trackEvent("pantry_low_stock_sent_to_grocery");
      toast({ title: "Added to grocery list", description: "Find it in the Grocery tab." });
    },
    onError: (e: any) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openEdit = (item: any) => {
    setEditItem(item);
    setEditForm({
      item_name: item.item_name ?? "",
      quantity: item.quantity ?? "",
      unit: item.unit ?? "",
      category: item.category ?? "",
      location: (item.location ?? "pantry") as Location,
      purchase_date: item.purchase_date ?? "",
      expiration_date: item.expiration_date ?? "",
      is_low_stock: !!item.is_low_stock,
    });
  };

  // ── Render ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-pulse">
        <div className="h-10 w-44 bg-muted/60 rounded-lg" />
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted/40 rounded-2xl" />)}
        </div>
        <div className="h-24 bg-muted/40 rounded-2xl" />
        <div className="h-40 bg-muted/40 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-[26px] md:text-[30px] font-bold text-[#2F2F2F] leading-tight flex items-center gap-2">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-[#E9F4EA] text-[#2F7A36]">
              <Package className="w-4 h-4" />
            </span>
            Your Pantry
          </h1>
          <p className="text-[14px] text-[#6B6B6B] mt-1.5 leading-relaxed">
            Add what you have, track freshness, and let Hive AI create smarter meal plans.
          </p>
        </div>

        <Dialog open={addOpen} onOpenChange={(o) => { setAddOpen(o); if (!o) setAddForm(EMPTY_FORM); }}>
          <DialogTrigger asChild>
            <Button className="bg-[#F2A900] hover:bg-[#D69500] text-white h-11 px-4 rounded-xl font-semibold shadow-sm shrink-0">
              <Plus className="w-4 h-4 mr-1.5" /> Add Item
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Add Item</DialogTitle></DialogHeader>
            <ItemForm
              value={addForm} onChange={setAddForm}
              submitting={addItem.isPending}
              onSubmit={() => addItem.mutate(addForm)}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard icon={<Package className="w-3.5 h-3.5 text-[#2F7A36]" />} label="Pantry Items" value={stats.total} suffix="items" />
        <StatCard icon={<Clock className="w-3.5 h-3.5 text-[#A56A00]" />} label="Expiring Soon" value={stats.expiringSoon} suffix="items" valueClass="text-[#A56A00]" />
        <StatCard icon={<AlertTriangle className="w-3.5 h-3.5 text-orange-600" />} label="Low Stock" value={stats.lowStock} suffix="items" valueClass="text-orange-600" />
      </div>

      {/* Reduce Waste banner */}
      {stats.expiringSoon > 0 && (
        <div className="bg-[#EAF5EA] border border-[#CDE6CE] rounded-2xl p-4 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0">
            <Leaf className="w-4 h-4 text-[#2F7A36]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-display font-semibold text-[#2F2F2F] text-sm">Reduce Waste. Save More.</p>
            <p className="text-[12px] text-[#5C5C5C] leading-snug">
              You have {stats.expiringSoon} item{stats.expiringSoon === 1 ? "" : "s"} expiring soon. Hive AI will prioritize using them first.
            </p>
          </div>
          <button
            onClick={() => { setActiveChip("expiring_soon"); }}
            className="text-xs font-semibold px-3 py-1.5 bg-white border border-[#CDE6CE] rounded-full text-[#2F7A36] shrink-0"
          >
            View Items
          </button>
        </div>
      )}

      {/* Search + Filter */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search pantry items..."
            className="pl-9 h-11 rounded-full border-border bg-card"
          />
        </div>
        <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-11 rounded-full px-4 shrink-0">
              <SlidersHorizontal className="w-4 h-4 mr-1.5" /> Filter
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Filter pantry</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Location</Label>
                <Select value={filterLocation} onValueChange={setFilterLocation}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All locations</SelectItem>
                    {LOCATIONS.map((l) => <SelectItem key={l} value={l}>{l[0].toUpperCase() + l.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Freshness</Label>
                <Select value={filterFreshness} onValueChange={setFilterFreshness}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="good">Good</SelectItem>
                    <SelectItem value="use_soon">Use Soon</SelectItem>
                    <SelectItem value="expiring_today">Expiring Today</SelectItem>
                    <SelectItem value="expired">Expired</SelectItem>
                    <SelectItem value="low_stock">Low Stock</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setFilterLocation("all"); setFilterFreshness("all"); }}>Clear</Button>
              <Button onClick={() => setFilterOpen(false)} className="bg-[#F2A900] hover:bg-[#D69500] text-white">Apply</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Category chips */}
      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 px-1 scrollbar-none">
        {CHIPS.map((c) => {
          const active = activeChip === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setActiveChip(c.key)}
              className={`shrink-0 px-3 h-9 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? "bg-[#2F7A36] text-white border-[#2F7A36]"
                  : "bg-card text-[#3F3F3F] border-border hover:border-[#2F7A36]/40"
              }`}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Expiring Soon section */}
      {expiringSoonList.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-display font-semibold text-foreground text-[15px] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#A56A00]" /> Expiring Soon
            </h2>
            <button
              onClick={() => setActiveChip("expiring_soon")}
              className="text-xs font-semibold text-[#2F7A36]"
            >
              View All ({expiringSoonList.length})
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {expiringSoonList.slice(0, 4).map((it) => {
              const d = daysUntil(it.expiration_date);
              return (
                <button
                  key={it.id}
                  onClick={() => openEdit(it)}
                  className="bg-card rounded-2xl border border-border overflow-hidden text-left shadow-sm hover:border-[#2F7A36]/30 transition-colors"
                >
                  <div className="relative aspect-square bg-muted">
                    <img src={itemImage(it.item_name)} alt={it.item_name} className="w-full h-full object-cover"
                      onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }} />
                    <span className="absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F2A900] text-white">
                      {d === 0 ? "Today" : `${d}d`}
                    </span>
                  </div>
                  <div className="p-2.5">
                    <p className="font-semibold text-sm text-foreground truncate">{it.item_name}</p>
                    <p className="text-[11px] text-muted-foreground capitalize">{CATEGORY_LABEL[it.category] ?? it.category ?? "Other"}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Added {fmtDate(it.created_at)}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Inventory list */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-display font-semibold text-foreground text-[15px] flex items-center gap-2">
            <Package className="w-4 h-4 text-[#2F7A36]" /> Pantry Items
          </h2>
          <span className="text-xs text-muted-foreground">{filtered.length} of {items.length}</span>
        </div>

        {filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-2xl p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#2F7A36]/10 flex items-center justify-center mx-auto mb-3">
              <Package className="w-6 h-6 text-[#2F7A36]" />
            </div>
            <p className="font-display font-semibold text-foreground mb-1">No items match</p>
            <p className="text-xs text-muted-foreground">
              {items.length === 0 ? "Add your first item to start tracking your pantry." : "Try a different filter or chip."}
            </p>
          </div>
        ) : (
          <div className="bg-card border border-border rounded-2xl divide-y divide-border overflow-hidden">
            {filtered.map((it) => {
              const f = freshnessOf(it);
              const badge = freshnessBadge(f);
              const qty = [it.quantity, it.unit].filter(Boolean).join(" ");
              return (
                <button
                  key={it.id}
                  onClick={() => openEdit(it)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/20 transition-colors"
                >
                  <img
                    src={itemImage(it.item_name)} alt={it.item_name}
                    className="w-12 h-12 rounded-xl object-cover shrink-0"
                    onError={(e) => { (e.target as HTMLImageElement).src = DEFAULT_IMG; }}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-foreground truncate">{it.item_name}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {CATEGORY_LABEL[it.category] ?? "Other"}
                      {it.location ? ` · ${it.location[0].toUpperCase()}${it.location.slice(1)}` : ""}
                    </p>
                  </div>
                  <div className="text-right shrink-0 mr-2">
                    <p className="text-xs font-medium text-foreground">{qty || "—"}</p>
                    <p className="text-[10px] text-muted-foreground">Added {fmtDate(it.created_at)}</p>
                  </div>
                  {!it.expiration_date ? (
                    <span
                      className="text-[10px] font-semibold px-2 py-0.5 rounded-full border border-[#F2A900] bg-[#FFF4D6] text-[#A56A00] flex items-center gap-1"
                      title="Tap to add an expiration date and help fight food waste"
                    >
                      <AlertTriangle className="w-3 h-3" />
                      Set expiry
                    </span>
                  ) : (
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.cls}`}>
                      {badge.label}
                    </span>
                  )}
                  <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-1" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Pantry Tip */}
      <div className="bg-[#FFF4D6] border border-[#F2D98A] rounded-2xl p-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center shrink-0">
          <Lightbulb className="w-4 h-4 text-[#A56A00]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-foreground text-sm flex items-center gap-1.5">
            Pantry Tip
            <Sparkles className="w-3.5 h-3.5 text-[#A56A00]" />
          </p>
          <p className="text-[12px] text-[#5C5C5C] leading-snug">
            Keeping your pantry updated helps Hive AI build meal plans that save you more money.
          </p>
        </div>
      </div>

      {/* Hidden link kept so existing tests / nav to staples still works */}
      <Link to="/dashboard/resources/bulk-buying" className="hidden" aria-hidden />

      {/* Edit dialog */}
      <Dialog open={!!editItem} onOpenChange={(o) => !o && setEditItem(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle className="font-display">{editItem?.item_name}</DialogTitle></DialogHeader>
          {editItem && (
            <>
              <ItemForm
                value={editForm}
                onChange={setEditForm}
                submitLabel="Save Changes"
                submitting={updateItem.isPending}
                onSubmit={() => {
                  updateItem.mutate({
                    id: editItem.id,
                    patch: {
                      item_name: editForm.item_name,
                      quantity: editForm.quantity || null,
                      unit: editForm.unit || null,
                      category: editForm.category || "other",
                      location: editForm.location,
                      purchase_date: editForm.purchase_date || null,
                      expiration_date: editForm.expiration_date || null,
                      is_low_stock: editForm.is_low_stock,
                    },
                  }, { onSuccess: () => setEditItem(null) });
                }}
              />
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => sendToGrocery.mutate(editItem.id)}
                  disabled={sendToGrocery.isPending}
                >
                  <Plus className="w-3.5 h-3.5 mr-1.5" /> Add to grocery list
                </Button>
                <Button
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={() => { removeItem.mutate(editItem.id); setEditItem(null); }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────
function StatCard({
  icon, label, value, suffix, valueClass = "text-[#2F7A36]",
}: { icon: React.ReactNode; label: string; value: React.ReactNode; suffix?: string; valueClass?: string }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-2.5 text-center">
      <div className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground mb-1">
        {icon}
        <span className="truncate">{label}</span>
      </div>
      <p className={`font-display font-bold text-lg leading-none ${valueClass}`}>{value}</p>
      {suffix && <p className="text-[10px] text-muted-foreground mt-1">{suffix}</p>}
    </div>
  );
}
