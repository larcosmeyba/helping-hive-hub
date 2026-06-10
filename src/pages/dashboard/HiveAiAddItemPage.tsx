import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Search, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const QUICK_ADD = [
  { name: "Eggs", category: "dairy", quantity: "1 dozen" },
  { name: "Rice", category: "grains", quantity: "1 bag" },
  { name: "Chicken", category: "proteins", quantity: "1 lb" },
  { name: "Milk", category: "dairy", quantity: "1 gallon" },
  { name: "Bread", category: "grains", quantity: "1 loaf" },
  { name: "Spinach", category: "vegetables", quantity: "1 bag" },
];

const LOCATIONS = ["Fridge", "Pantry", "Freezer"] as const;

export default function HiveAiAddItemPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [picked, setPicked] = useState<{ name: string; category: string; quantity: string } | null>(null);
  const [quantity, setQuantity] = useState("");
  const [location, setLocation] = useState<(typeof LOCATIONS)[number]>("Pantry");
  const [expiration, setExpiration] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = search ? QUICK_ADD.filter((q) => q.name.toLowerCase().includes(search.toLowerCase())) : QUICK_ADD;

  const handleSave = async () => {
    const name = picked?.name || search.trim();
    if (!user || !name) {
      toast({ title: "Enter or pick an item", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const { error } = await supabase.from("pantry_items").insert({
        user_id: user.id,
        item_name: name,
        quantity: quantity || picked?.quantity || "1",
        category: picked?.category || "pantry_staples",
        expiration_date: expiration || null,
      });
      if (error) throw error;
      toast({ title: "Saved!", description: `${name} added to ${location}.` });
      navigate("/dashboard/pantry");
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-1 pb-32">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-base text-[#1a1a1a]">
        <ArrowLeft className="w-4 h-4" />
      </button>
      <h1 className="text-center text-[18px] font-extrabold text-[#1a1a1a] mb-4">Add Item</h1>

      <div className="relative mb-4">
        <Search className="w-4 h-4 text-[#999] absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPicked(null); }}
          placeholder="Search for an item"
          className="w-full rounded-xl border border-[#E5E5E5] pl-9 pr-3 py-3 text-base bg-white"
        />
      </div>

      <h2 className="text-[13px] font-bold text-[#1a1a1a] mb-2">Quick Add</h2>
      <div className="grid grid-cols-3 gap-2 mb-5">
        {filtered.map((q) => (
          <button
            key={q.name}
            onClick={() => { setPicked(q); setQuantity(q.quantity); setSearch(q.name); }}
            className={`px-3 py-2 rounded-xl text-[13px] font-semibold border ${
              picked?.name === q.name ? "bg-[#5B3FBF] text-white border-[#5B3FBF]" : "bg-white text-[#1a1a1a] border-[#E5E5E5]"
            }`}
          >
            + {q.name}
          </button>
        ))}
      </div>

      <div className="space-y-3 mb-5">
        <Field label="Quantity">
          <input
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="e.g. 1 lb, 2 boxes"
            className="w-full rounded-xl border border-[#E5E5E5] px-3 py-2.5 text-base bg-white"
          />
        </Field>
        <Field label="Location">
          <div className="grid grid-cols-3 gap-2">
            {LOCATIONS.map((l) => (
              <button
                key={l}
                onClick={() => setLocation(l)}
                className={`py-2 rounded-xl text-[13px] font-semibold border ${
                  location === l ? "bg-[#5B3FBF] text-white border-[#5B3FBF]" : "bg-white text-[#1a1a1a] border-[#E5E5E5]"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Expiration date (optional)">
          <input
            type="date"
            value={expiration}
            onChange={(e) => setExpiration(e.target.value)}
            className="w-full rounded-xl border border-[#E5E5E5] px-3 py-2.5 text-base bg-white"
          />
        </Field>
      </div>

      <button
        disabled={saving}
        onClick={handleSave}
        className="w-full bg-[#5B3FBF] text-white font-bold text-[15px] py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Save Item
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-[#1a1a1a] mb-1">{label}</label>
      {children}
    </div>
  );
}
