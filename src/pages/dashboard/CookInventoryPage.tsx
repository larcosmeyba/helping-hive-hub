import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, AlertTriangle, Loader2, Refrigerator, Package, Snowflake, Plus, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateRecipesFromInventory } from "@/lib/cookFromWhatIHave";

type Location = "pantry" | "fridge" | "freezer";

interface PantryRow {
  id: string;
  item_name: string;
  location: string | null;
  expiration_date: string | null;
  is_out_of_stock: boolean | null;
  is_low_stock: boolean | null;
}

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function normalizeLocation(loc: string | null): Location {
  const l = (loc || "pantry").toLowerCase();
  if (l.includes("freezer")) return "freezer";
  if (l.includes("fridge")) return "fridge";
  return "pantry";
}

export default function CookInventoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<PantryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [finding, setFinding] = useState(false);
  const [addOpen, setAddOpen] = useState<Location | null>(null);

  const loadItems = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("pantry_items")
      .select("id,item_name,location,expiration_date,is_out_of_stock,is_low_stock")
      .eq("user_id", user.id);
    setItems((data ?? []).filter((r) => !r.is_out_of_stock) as PantryRow[]);
    setLoading(false);
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const { pantry, fridge, freezer, expiring } = useMemo(() => {
    const p: PantryRow[] = [];
    const f: PantryRow[] = [];
    const fz: PantryRow[] = [];
    const exp: { name: string; days: number }[] = [];
    for (const it of items) {
      const loc = normalizeLocation(it.location);
      if (loc === "fridge") f.push(it);
      else if (loc === "freezer") fz.push(it);
      else p.push(it);
      const d = daysUntil(it.expiration_date);
      if (d !== null && d >= 0 && d <= 5) exp.push({ name: it.item_name, days: d });
    }
    exp.sort((a, b) => a.days - b.days);
    return { pantry: p, fridge: f, freezer: fz, expiring: exp };
  }, [items]);

  const findMeals = async () => {
    if (!items.length) {
      toast({ title: "Add items first", description: "We need something to cook with.", variant: "destructive" });
      return;
    }
    setFinding(true);
    try {
      const recipes = await generateRecipesFromInventory({ count: 3 });
      if (!recipes.length) {
        toast({ title: "No recipes found", description: "Try adding more ingredients.", variant: "destructive" });
        return;
      }
      navigate("/dashboard/cook/recipes", { state: { recipes } });
    } catch (err) {
      toast({ title: "Couldn't generate recipes", description: (err as Error).message, variant: "destructive" });
    } finally {
      setFinding(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-3 pb-28">
      <h1 className="text-center text-[20px] font-extrabold text-[#1a1a1a] mb-4">
        What Do You Already Have?
      </h1>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#5B3FBF]" />
        </div>
      ) : (
        <div className="space-y-3">
          <SectionCard title="Pantry" headerBg="#FDECEC" titleColor="#C0392B" Icon={Package}
            onAdd={() => setAddOpen("pantry")}>
            {pantry.length ? <ItemList rows={pantry} /> : <EmptyHint label="No pantry items yet" />}
          </SectionCard>

          <SectionCard title="Fridge" headerBg="#E8F0FE" titleColor="#1A56DB" Icon={Refrigerator}
            onAdd={() => setAddOpen("fridge")}>
            {fridge.length ? <ItemList rows={fridge} /> : <EmptyHint label="No fridge items yet" />}
          </SectionCard>

          <SectionCard title="Freezer" headerBg="#E0F2FE" titleColor="#0369A1" Icon={Snowflake}
            onAdd={() => setAddOpen("freezer")}>
            {freezer.length ? <ItemList rows={freezer} /> : <EmptyHint label="No freezer items yet" />}
          </SectionCard>

          {expiring.length > 0 && (
            <SectionCard title="Expiring Soon" headerBg="#FFF3E0" titleColor="#B26A00" Icon={AlertTriangle}>
              <ul className="divide-y divide-border">
                {expiring.map((e) => (
                  <li key={e.name} className="flex items-center px-4 py-3">
                    <AlertTriangle className="w-4 h-4 text-[#E67E22] mr-3 shrink-0" />
                    <span className="text-base font-semibold text-[#1a1a1a] flex-1 truncate">
                      {e.name}
                    </span>
                    <span className="text-[12px] text-[#B26A00] font-semibold">
                      {e.days === 0 ? "Today" : `${e.days} Day${e.days === 1 ? "" : "s"} Left`}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      )}

      <button
        onClick={findMeals}
        disabled={finding || loading}
        className="mt-6 w-full h-[52px] rounded-2xl bg-[#5B3FBF] text-white font-bold text-[15px] disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {finding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {finding ? "Finding meals…" : "Find Meals"}
      </button>

      {addOpen && (
        <AddItemSheet
          location={addOpen}
          onClose={() => setAddOpen(null)}
          onSaved={() => {
            setAddOpen(null);
            loadItems();
            toast({ title: "Item added" });
          }}
        />
      )}
    </div>
  );
}

function SectionCard({
  title, headerBg, titleColor, Icon, children, onAdd,
}: { title: string; headerBg: string; titleColor: string; Icon: typeof Package; children: React.ReactNode; onAdd?: () => void }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: headerBg }}>
        <Icon className="w-4 h-4" style={{ color: titleColor }} />
        <p className="text-[13px] font-extrabold flex-1" style={{ color: titleColor }}>{title}</p>
        {onAdd && (
          <button
            onClick={onAdd}
            className="flex items-center gap-1 text-[12px] font-bold rounded-full px-2.5 py-1 bg-white/70"
            style={{ color: titleColor }}
          >
            <Plus className="w-3.5 h-3.5" /> Add
          </button>
        )}
      </div>
      {children}
    </div>
  );
}

function ItemList({ rows }: { rows: PantryRow[] }) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center px-4 py-3">
          <div className="w-5 h-5 rounded-full bg-[#2E7D32] flex items-center justify-center shrink-0 mr-3">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
          <span className="text-base text-[#1a1a1a] font-medium truncate">{r.item_name}</span>
        </li>
      ))}
    </ul>
  );
}

function EmptyHint({ label }: { label: string }) {
  return (
    <div className="px-4 py-4 text-center">
      <span className="text-[13px] text-muted-foreground">{label}</span>
    </div>
  );
}

const CATEGORIES = ["dairy", "produce", "protein", "grains", "pantry_staples", "frozen", "canned_goods", "other"];

function AddItemSheet({
  location, onClose, onSaved,
}: { location: Location; onClose: () => void; onSaved: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [loc, setLoc] = useState<Location>(location);
  const [category, setCategory] = useState<string>("other");
  const [expiration, setExpiration] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!user || !name.trim()) {
      toast({ title: "Item name required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("pantry_items").insert({
      user_id: user.id,
      item_name: name.trim(),
      normalized_item_name: name.trim().toLowerCase(),
      quantity: quantity || null,
      unit: unit || null,
      location: loc,
      category,
      expiration_date: expiration || null,
      is_low_stock: lowStock,
      manually_added: true,
    });
    setSaving(false);
    if (error) {
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
      return;
    }
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="w-full max-w-md bg-card rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 max-h-[85dvh] overflow-y-auto overscroll-contain"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 96px)" }}

        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[17px] font-extrabold text-foreground">Add Item</h2>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-2.5">

          <Field label="Item Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spinach"
              className="w-full h-11 px-3 rounded-xl border border-border bg-background text-base"
              autoFocus
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantity">
              <input
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="1"
                className="w-full h-11 px-3 rounded-xl border border-border bg-background text-base"
              />
            </Field>
            <Field label="Unit">
              <input
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="bag, oz, lb…"
                className="w-full h-11 px-3 rounded-xl border border-border bg-background text-base"
              />
            </Field>
          </div>

          <Field label="Location">
            <div className="grid grid-cols-3 gap-2">
              {(["pantry", "fridge", "freezer"] as Location[]).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLoc(l)}
                  className={`h-11 rounded-xl text-[13px] font-semibold capitalize border ${
                    loc === l
                      ? "bg-[#5B3FBF] text-white border-[#5B3FBF]"
                      : "bg-background text-foreground border-border"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border bg-background text-base"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c.replace("_", " ")}</option>
              ))}
            </select>
          </Field>

          <Field label="Expiration Date">
            <input
              type="date"
              value={expiration}
              onChange={(e) => setExpiration(e.target.value)}
              className="w-full h-11 px-3 rounded-xl border border-border bg-background text-base"
            />
          </Field>

          <label className="flex items-center justify-between py-2">
            <span className="text-base font-medium text-foreground">Low stock</span>
            <input
              type="checkbox"
              checked={lowStock}
              onChange={(e) => setLowStock(e.target.checked)}
              className="w-5 h-5 accent-[#5B3FBF]"
            />
          </label>
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="mt-5 w-full h-[50px] rounded-2xl bg-[#5B3FBF] text-white font-bold text-[15px] disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save Item
        </button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-muted-foreground mb-1">{label}</label>
      {children}
    </div>
  );
}
