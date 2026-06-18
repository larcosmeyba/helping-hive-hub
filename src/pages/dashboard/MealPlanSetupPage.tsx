import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, DollarSign, Users, Store, Leaf, Package,
  ChefHat, Snowflake, AlertCircle, Plus, Loader2, Check,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useInstacartRetailers } from "@/hooks/useInstacartRetailers";
import { KrogerRequiredDialog } from "@/components/kroger/KrogerRequiredDialog";
import { useKrogerConnection } from "@/hooks/useKrogerConnection";

const DIET_OPTIONS = [
  "Vegetarian", "Vegan", "Gluten-free", "Dairy-free",
  "Low-carb", "Halal", "Kosher", "No seafood",
];
const ALLERGY_OPTIONS = [
  "Gluten", "Dairy", "Nuts", "Shellfish", "Soy", "Eggs", "Other",
];
const COOKING_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

type SheetKey =
  | "budget" | "family" | "store" | "diet" | "allergies"
  | "pantry" | "fridge" | "cooking" | null;

const SELECTED_PANTRY_KEY = "mealplan_selected_pantry_ids";
const SELECTED_FRIDGE_KEY = "mealplan_selected_fridge_ids";

function readIds(key: string): string[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch { return []; }
}

export default function MealPlanSetupPage() {
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const { generate, generating } = useMealPlan();
  const { toast } = useToast();

  // Local mirror of profile so rows update instantly after each save.
  const [budget, setBudget] = useState<number>(profile?.weekly_budget ?? 75);
  const [household, setHousehold] = useState<number>(profile?.household_size ?? 2);
  const [adults, setAdults] = useState<number>(
    Math.max(1, (profile?.household_size as number) ?? 2),
  );
  const [kids, setKids] = useState<number>(0);
  const [zip, setZip] = useState<string>((profile?.zip_code as string) ?? "");
  const [homeStore, setHomeStore] = useState<string>((profile?.home_store as string) ?? "");
  const [homeStoreKey, setHomeStoreKey] = useState<string>("");
  const [diet, setDiet] = useState<string[]>(
    ((profile?.dietary_preferences as string[]) ?? []),
  );
  const [allergies, setAllergies] = useState<string[]>(
    ((profile?.allergies as string[]) ?? []),
  );
  const [cooking, setCooking] = useState<string>(
    ((profile?.cooking_confidence as string) ?? "beginner"),
  );

  // Sync when profile loads
  useEffect(() => {
    if (!profile) return;
    setBudget(profile.weekly_budget ?? 75);
    setHousehold(profile.household_size ?? 2);
    setAdults(Math.max(1, (profile.household_size as number) ?? 2));
    setZip((profile.zip_code as string) ?? "");
    setHomeStore((profile.home_store as string) ?? "");
    setDiet(((profile.dietary_preferences as string[]) ?? []));
    setAllergies(((profile.allergies as string[]) ?? []));
    setCooking(((profile.cooking_confidence as string) ?? "beginner"));
  }, [profile]);

  // Pantry / fridge items + selections
  const [pantryItems, setPantryItems] = useState<any[]>([]);
  const [fridgeItems, setFridgeItems] = useState<any[]>([]);
  const [pantryCount, setPantryCount] = useState(0);
  const [fridgeCount, setFridgeCount] = useState(0);
  const [selectedPantry, setSelectedPantry] = useState<Set<string>>(
    new Set(readIds(SELECTED_PANTRY_KEY)),
  );
  const [selectedFridge, setSelectedFridge] = useState<Set<string>>(
    new Set(readIds(SELECTED_FRIDGE_KEY)),
  );

  const loadInventory = async () => {
    if (!user) return;
    const { data: pdata } = await supabase
      .from("pantry_items")
      .select("id,item_name,quantity,unit,location,is_low_stock,expiration_date")
      .eq("user_id", user.id);
    const all = (pdata ?? []) as any[];
    const pantry = all.filter((i) => (i.location ?? "pantry") === "pantry");
    const fridge = all.filter((i) => i.location === "fridge" || i.location === "freezer");
    setPantryItems(pantry);
    setFridgeItems(fridge);
    setPantryCount(pantry.length);
    setFridgeCount(fridge.length);
    // Default: if user has never set a selection, include everything.
    setSelectedPantry((prev) => {
      if (prev.size > 0) return prev;
      return new Set(pantry.map((i) => i.id as string));
    });
    setSelectedFridge((prev) => {
      if (prev.size > 0) return prev;
      return new Set(fridge.map((i) => i.id as string));
    });
  };

  useEffect(() => { loadInventory(); /* eslint-disable-next-line */ }, [user?.id]);

  const [openSheet, setOpenSheet] = useState<SheetKey>(null);
  const [saving, setSaving] = useState(false);
  const [krogerPromptOpen, setKrogerPromptOpen] = useState(false);
  const { ready: krogerReady, loading: krogerLoading } = useKrogerConnection();

  const saveProfile = async (patch: Record<string, unknown>, label = "Updated") => {
    if (!user) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile?.();
      toast({ title: label });
      setOpenSheet(null);
    } catch (e: any) {
      toast({ title: "Error", description: e?.message ?? "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const runGenerate = async (mode?: "kroger" | "estimated") => {
    try {
      localStorage.setItem(SELECTED_PANTRY_KEY, JSON.stringify([...selectedPantry]));
      localStorage.setItem(SELECTED_FRIDGE_KEY, JSON.stringify([...selectedFridge]));
    } catch { /* ignore */ }
    navigate("/dashboard/meal-plan/generating");
    await generate(mode ? { pricingMode: mode } : undefined);
  };

  const handleGenerate = async () => {
    // Strongly encourage Kroger connection for accurate pricing before generating.
    if (!krogerLoading && !krogerReady) {
      setKrogerPromptOpen(true);
      return;
    }
    await runGenerate("kroger");
  };


  return (
    <div className="w-full max-w-3xl mx-auto -mx-4 px-4 pb-6 min-h-full bg-[hsl(43_100%_96%)]">
      <div className="flex items-center gap-3 pt-2 pb-3">
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5 text-[#1a1a1a]" />
        </button>
        <h1 className="text-[20px] font-extrabold text-[#1a1a1a]">Meal Plan Settings</h1>
      </div>
      <p className="text-[12px] text-[#6b6b6b] mb-3">
        Review and edit your inputs, then generate this week's plan.
      </p>

      <div className="space-y-3">
        <SettingRow
          icon={<DollarSign className="w-5 h-5 text-white" />} iconBg="#3FAE5A"
          label="Weekly Budget" value={`$${budget}`}
          onClick={() => setOpenSheet("budget")}
        />
        <SettingRow
          icon={<Users className="w-5 h-5 text-white" />} iconBg="#7A6BD8"
          label="Family Size" value={`${household} ${household === 1 ? "Person" : "People"}`}
          onClick={() => setOpenSheet("family")}
        />
        <SettingRow
          icon={<Leaf className="w-5 h-5 text-white" />} iconBg="#3FAE5A"
          label="Dietary Preferences" value={diet.length ? diet.join(", ") : "None"}
          onClick={() => setOpenSheet("diet")}
        />
        <SettingRow
          icon={<AlertCircle className="w-5 h-5 text-white" />} iconBg="#E85D2F"
          label="Allergies" value={allergies.length ? allergies.join(", ") : "None"}
          onClick={() => setOpenSheet("allergies")}
        />
        <SettingRow
          icon={<Package className="w-5 h-5 text-white" />} iconBg="#3B7DD8"
          label="Pantry Items"
          value={`${selectedPantry.size} of ${pantryCount} selected`}
          onClick={() => setOpenSheet("pantry")}
        />
        <SettingRow
          icon={<Snowflake className="w-5 h-5 text-white" />} iconBg="#4FB3E0"
          label="Fridge Items"
          value={`${selectedFridge.size} of ${fridgeCount} selected`}
          onClick={() => setOpenSheet("fridge")}
        />
        <SettingRow
          icon={<ChefHat className="w-5 h-5 text-white" />} iconBg="#E85D2F"
          label="Cooking Skill Level"
          value={COOKING_LEVELS.find((c) => c.value === cooking)?.label ?? "Beginner"}
          onClick={() => setOpenSheet("cooking")}
        />
      </div>

      <button
        onClick={handleGenerate}
        disabled={generating}
        className="mt-6 w-full bg-[#1F5A3D] disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-[16px] active:scale-[0.99] transition-transform"
      >
        {generating ? "Generating…" : "Generate Plan"}
      </button>

      <p className="text-[11px] text-[#6b6b6b] mt-3 text-center px-4">
        Estimated pricing for planning only. Final pricing and availability are confirmed at your store at checkout.
      </p>

      {/* ── Sheets ───────────────────────────────────────────────── */}
      <BudgetSheet
        open={openSheet === "budget"} onOpenChange={(o) => !o && setOpenSheet(null)}
        value={budget} setValue={setBudget}
        saving={saving} onSave={() => saveProfile({ weekly_budget: budget }, "Budget updated")}
      />
      <FamilySheet
        open={openSheet === "family"} onOpenChange={(o) => !o && setOpenSheet(null)}
        adults={adults} setAdults={setAdults} kids={kids} setKids={setKids}
        saving={saving}
        onSave={() => {
          const total = Math.max(1, adults + kids);
          setHousehold(total);
          saveProfile({ household_size: total }, "Family size updated");
        }}
      />
      <ChipSheet
        open={openSheet === "diet"} onOpenChange={(o) => !o && setOpenSheet(null)}
        title="Dietary Preferences" options={DIET_OPTIONS}
        selected={diet} setSelected={setDiet}
        saving={saving} onSave={() => saveProfile({ dietary_preferences: diet }, "Dietary preferences updated")}
      />
      <ChipSheet
        open={openSheet === "allergies"} onOpenChange={(o) => !o && setOpenSheet(null)}
        title="Allergies" options={ALLERGY_OPTIONS}
        selected={allergies} setSelected={setAllergies}
        saving={saving} onSave={() => saveProfile({ allergies }, "Allergies updated")}
      />
      <InventorySheet
        open={openSheet === "pantry"} onOpenChange={(o) => !o && setOpenSheet(null)}
        title="Pantry Items" addLocation="pantry"
        items={pantryItems} selected={selectedPantry} setSelected={setSelectedPantry}
        onItemAdded={loadInventory}
        onSave={() => {
          try { localStorage.setItem(SELECTED_PANTRY_KEY, JSON.stringify([...selectedPantry])); } catch {}
          toast({ title: "Pantry selection updated" });
          setOpenSheet(null);
        }}
      />
      <InventorySheet
        open={openSheet === "fridge"} onOpenChange={(o) => !o && setOpenSheet(null)}
        title="Fridge Items" addLocation="fridge"
        items={fridgeItems} selected={selectedFridge} setSelected={setSelectedFridge}
        onItemAdded={loadInventory}
        onSave={() => {
          try { localStorage.setItem(SELECTED_FRIDGE_KEY, JSON.stringify([...selectedFridge])); } catch {}
          toast({ title: "Fridge selection updated" });
          setOpenSheet(null);
        }}
      />
      <CookingSheet
        open={openSheet === "cooking"} onOpenChange={(o) => !o && setOpenSheet(null)}
        value={cooking} setValue={setCooking}
        saving={saving} onSave={() => saveProfile({ cooking_confidence: cooking }, "Cooking level updated")}
      />

      <KrogerRequiredDialog
        open={krogerPromptOpen}
        onOpenChange={setKrogerPromptOpen}
        onContinueWithout={() => { void runGenerate("estimated"); }}
        redirectAfter="/dashboard/meal-plan/setup"
      />
    </div>
  );
}

function SettingRow({
  icon, iconBg, label, value, onClick,
}: { icon: React.ReactNode; iconBg: string; label: string; value: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-3.5 flex items-center gap-3 border border-[#EEE7DA] active:scale-[0.99] transition-transform text-left"
    >
      <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ backgroundColor: iconBg }}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-[#1a1a1a]">{label}</div>
        <div className="text-[13px] text-[#6b6b6b] truncate">{value}</div>
      </div>
      <ChevronRight className="w-5 h-5 text-[#b0b0b0] shrink-0" />
    </button>
  );
}

// ── Sheets ────────────────────────────────────────────────────────────────

function SheetShell({
  open, onOpenChange, title, children, footer,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  title: string; children: React.ReactNode; footer: React.ReactNode;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl max-h-[88vh] overflow-y-auto bg-[hsl(43_100%_96%)]">
        <SheetHeader>
          <SheetTitle className="text-left text-[18px] font-extrabold text-[#1a1a1a]">{title}</SheetTitle>
        </SheetHeader>
        <div className="py-4">{children}</div>
        <SheetFooter className="sticky bottom-0 bg-[hsl(43_100%_96%)] pt-3">
          {footer}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function SaveButton({ saving, onClick, disabled }: { saving?: boolean; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={saving || disabled}
      className="w-full bg-[#1F5A3D] disabled:opacity-60 text-white font-bold py-3.5 rounded-2xl text-[15px]"
    >
      {saving ? "Saving…" : "Save"}
    </button>
  );
}

function BudgetSheet({
  open, onOpenChange, value, setValue, saving, onSave,
}: any) {
  return (
    <SheetShell open={open} onOpenChange={onOpenChange} title="Weekly Budget"
      footer={<SaveButton saving={saving} onClick={onSave} />}>
      <div className="space-y-5">
        <div className="text-center">
          <div className="text-[42px] font-extrabold text-[#1F5A3D]">${value}</div>
          <div className="text-[12px] text-[#6b6b6b]">per week</div>
        </div>
        <Slider min={25} max={500} step={5} value={[value]} onValueChange={(v) => setValue(v[0])} />
        <div>
          <Label>Manual amount</Label>
          <Input
            type="number" min={10} max={1000}
            value={value}
            onChange={(e) => setValue(Math.max(10, Math.min(1000, Number(e.target.value) || 0)))}
            className="mt-1.5"
          />
        </div>
      </div>
    </SheetShell>
  );
}

function Stepper({ value, setValue, min = 0 }: { value: number; setValue: (n: number) => void; min?: number }) {
  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" size="icon" onClick={() => setValue(Math.max(min, value - 1))}>−</Button>
      <span className="text-2xl font-bold w-10 text-center">{value}</span>
      <Button variant="outline" size="icon" onClick={() => setValue(value + 1)}>+</Button>
    </div>
  );
}

function FamilySheet({
  open, onOpenChange, adults, setAdults, kids, setKids, saving, onSave,
}: any) {
  return (
    <SheetShell open={open} onOpenChange={onOpenChange} title="Family Size"
      footer={<SaveButton saving={saving} onClick={onSave} />}>
      <div className="space-y-5">
        <div className="bg-white rounded-2xl p-4 flex items-center justify-between border border-[#EEE7DA]">
          <div>
            <div className="text-[15px] font-bold text-[#1a1a1a]">Adults</div>
            <div className="text-[12px] text-[#6b6b6b]">Age 13+</div>
          </div>
          <Stepper value={adults} setValue={setAdults} min={1} />
        </div>
        <div className="bg-white rounded-2xl p-4 flex items-center justify-between border border-[#EEE7DA]">
          <div>
            <div className="text-[15px] font-bold text-[#1a1a1a]">Kids</div>
            <div className="text-[12px] text-[#6b6b6b]">Optional</div>
          </div>
          <Stepper value={kids} setValue={setKids} />
        </div>
        <div className="text-center text-[13px] text-[#6b6b6b]">
          Total household size: <span className="font-bold text-[#1a1a1a]">{adults + kids}</span>
        </div>
      </div>
    </SheetShell>
  );
}

function StoreSheet({
  open, onOpenChange, zip, setZip, homeStore, setHomeStore, homeStoreKey, setHomeStoreKey, saving, onSave,
}: any) {
  const cleanZip = /^\d{5}$/.test(zip) ? zip : null;
  const { retailers, loading, error } = useInstacartRetailers(cleanZip);
  return (
    <SheetShell open={open} onOpenChange={onOpenChange} title="Store"
      footer={<SaveButton saving={saving} onClick={onSave} disabled={!homeStore} />}>
      <div className="space-y-4">
        <div>
          <Label>ZIP code</Label>
          <Input
            inputMode="numeric" maxLength={5} value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="90210" className="mt-1.5"
          />
        </div>
        <div>
          <Label>Nearby stores</Label>
          {!cleanZip && (
            <p className="text-[12px] text-[#6b6b6b] mt-2">Enter a 5-digit ZIP to see stores.</p>
          )}
          {cleanZip && loading && (
            <div className="flex items-center gap-2 text-[13px] text-[#6b6b6b] mt-3">
              <Loader2 className="w-4 h-4 animate-spin" /> Looking up stores…
            </div>
          )}
          {cleanZip && !loading && error && (
            <p className="text-[12px] text-destructive mt-2">{error}</p>
          )}
          {cleanZip && !loading && !error && retailers.length === 0 && (
            <p className="text-[12px] text-[#6b6b6b] mt-2">No stores found for this ZIP.</p>
          )}
          {cleanZip && !loading && !error && retailers.length > 0 && (
            <p className="text-[12px] text-[#6b6b6b] mt-2">
              Stores shown are typical grocery retailers in your ZIP code.
            </p>
          )}
          <div className="mt-2 space-y-2">
            {[...retailers]
              .sort((a, b) => a.name.localeCompare(b.name))
              .sort((a, b) => {
                if (homeStore === a.name) return -1;
                if (homeStore === b.name) return 1;
                return 0;
              })
              .map((r) => {
                const active = homeStore === r.name;
                return (
                  <RetailerRow
                    key={r.retailer_key}
                    name={r.name}
                    logoUrl={r.retailer_logo_url ?? null}
                    active={active}
                    onSelect={() => { setHomeStore(r.name); setHomeStoreKey(r.retailer_key); }}
                  />
                );
              })}
          </div>
        </div>
      </div>
    </SheetShell>
  );
}

function RetailerRow({
  name, logoUrl, active, onSelect,
}: {
  name: string; logoUrl: string | null; active: boolean; onSelect: () => void;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const showLogo = !!logoUrl && !logoFailed;
  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-colors ${
        active ? "bg-[#1F5A3D]/10 border-[#1F5A3D]" : "bg-white border-[#EEE7DA] hover:border-[#d9d2c4]"
      }`}
    >
      {showLogo && (
        <img
          src={logoUrl!}
          alt=""
          className="w-9 h-9 rounded-md object-contain bg-white"
          onError={() => setLogoFailed(true)}
        />
      )}
      <span className="flex-1 text-[14px] font-semibold text-[#1a1a1a]">{name}</span>
      {active && <Check className="w-5 h-5 text-[#1F5A3D]" />}
    </button>
  );
}

function ChipSheet({
  open, onOpenChange, title, options, selected, setSelected, saving, onSave,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  title: string; options: string[]; selected: string[];
  setSelected: (v: string[]) => void; saving?: boolean; onSave: () => void;
}) {
  const toggle = (o: string) => {
    setSelected(selected.includes(o) ? selected.filter((x) => x !== o) : [...selected, o]);
  };
  return (
    <SheetShell open={open} onOpenChange={onOpenChange} title={title}
      footer={<SaveButton saving={saving} onClick={onSave} />}>
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = selected.includes(o);
          return (
            <button
              key={o} onClick={() => toggle(o)}
              className={`inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full border-2 text-sm font-medium transition-all ${
                active
                  ? "bg-[#1F5A3D] text-white border-[#1F5A3D]"
                  : "bg-white text-[#6b6b6b] border-[#EEE7DA]"
              }`}
            >
              {active && <Check className="w-3.5 h-3.5" />}
              {o}
            </button>
          );
        })}
      </div>
    </SheetShell>
  );
}

function InventorySheet({
  open, onOpenChange, title, addLocation, items, selected, setSelected, onItemAdded, onSave,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  title: string; addLocation: "pantry" | "fridge";
  items: any[]; selected: Set<string>; setSelected: (s: Set<string>) => void;
  onItemAdded: () => void; onSave: () => void;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  const toggle = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id); else next.add(id);
    setSelected(next);
  };

  const addItem = async () => {
    if (!user || !newName.trim()) return;
    setAdding(true);
    try {
      const { error } = await supabase.from("pantry_items").insert({
        user_id: user.id,
        item_name: newName.trim(),
        normalized_item_name: newName.trim().toLowerCase(),
        location: addLocation,
        category: "other",
        manually_added: true,
      });
      if (error) throw error;
      setNewName("");
      await onItemAdded();
      toast({ title: "Added" });
    } catch (e: any) {
      toast({ title: "Error", description: e?.message, variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const allSelected = useMemo(
    () => items.length > 0 && items.every((i) => selected.has(i.id)),
    [items, selected],
  );

  return (
    <SheetShell open={open} onOpenChange={onOpenChange} title={title}
      footer={<SaveButton onClick={onSave} />}>
      <div className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder={`Add a new ${addLocation === "pantry" ? "pantry" : "fridge"} item`}
            value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addItem(); }}
          />
          <Button onClick={addItem} disabled={!newName.trim() || adding}
            className="bg-[#F2A900] hover:bg-[#D69500] text-white">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {items.length === 0 ? (
          <p className="text-[13px] text-[#6b6b6b] text-center py-6">No items yet. Add one above.</p>
        ) : (
          <>
            <button
              onClick={() => setSelected(allSelected ? new Set() : new Set(items.map((i) => i.id)))}
              className="text-[12px] font-semibold text-[#1F5A3D]"
            >
              {allSelected ? "Deselect all" : "Select all"}
            </button>
            <div className="space-y-2">
              {items.map((it) => {
                const active = selected.has(it.id);
                return (
                  <button
                    key={it.id} onClick={() => toggle(it.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors ${
                      active ? "bg-[#1F5A3D]/10 border-[#1F5A3D]" : "bg-white border-[#EEE7DA]"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${
                      active ? "bg-[#1F5A3D] border-[#1F5A3D]" : "border-[#d0d0d0]"
                    }`}>
                      {active && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-[14px] font-semibold text-[#1a1a1a] truncate">{it.item_name}</div>
                      {(it.quantity || it.unit) && (
                        <div className="text-[12px] text-[#6b6b6b]">
                          {it.quantity ?? ""} {it.unit ?? ""}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>
    </SheetShell>
  );
}

function CookingSheet({
  open, onOpenChange, value, setValue, saving, onSave,
}: any) {
  return (
    <SheetShell open={open} onOpenChange={onOpenChange} title="Cooking Skill Level"
      footer={<SaveButton saving={saving} onClick={onSave} />}>
      <div className="space-y-2">
        {COOKING_LEVELS.map((opt) => {
          const active = value === opt.value;
          return (
            <button
              key={opt.value} onClick={() => setValue(opt.value)}
              className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left transition-colors ${
                active ? "bg-[#1F5A3D]/10 border-[#1F5A3D]" : "bg-white border-[#EEE7DA]"
              }`}
            >
              <span className="text-[15px] font-semibold text-[#1a1a1a]">{opt.label}</span>
              {active && <Check className="w-5 h-5 text-[#1F5A3D]" />}
            </button>
          );
        })}
      </div>
    </SheetShell>
  );
}
