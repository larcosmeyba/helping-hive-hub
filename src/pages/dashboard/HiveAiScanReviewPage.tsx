import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Check, X, Plus, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type Item = { item_name: string; quantity?: string; unit?: string; category?: string; location?: string; selected: boolean };

export default function HiveAiScanReviewPage() {
  const navigate = useNavigate();
  const { state } = useLocation() as { state?: { detected?: any[] } };
  const { user } = useAuth();
  const { toast } = useToast();

  const initial: Item[] = (state?.detected ?? []).map((d) => ({ ...d, selected: true }));
  const [items, setItems] = useState<Item[]>(initial);
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);

  const toggle = (i: number) => setItems((arr) => arr.map((it, idx) => (idx === i ? { ...it, selected: !it.selected } : it)));
  const remove = (i: number) => setItems((arr) => arr.filter((_, idx) => idx !== i));
  const addManual = () => {
    if (!newName.trim()) return;
    setItems((arr) => [...arr, { item_name: newName.trim(), quantity: "1", selected: true }]);
    setNewName("");
  };

  const handleSave = async () => {
    if (!user) return;
    const chosen = items.filter((i) => i.selected);
    if (chosen.length === 0) {
      toast({ title: "Pick at least one item", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const rows = chosen.map((i) => ({
        user_id: user.id,
        item_name: i.item_name,
        quantity: [i.quantity, i.unit].filter(Boolean).join(" ") || "1",
        category: i.category || "pantry_staples",
      }));
      const { error } = await supabase.from("pantry_items").insert(rows);
      if (error) throw error;
      toast({ title: "Saved to inventory!", description: `${rows.length} items added.` });
      navigate("/dashboard/pantry");
    } catch (err: any) {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-1 pb-32">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-[14px] text-[#1a1a1a]">
        <ArrowLeft className="w-4 h-4" />
      </button>
      <h1 className="text-center text-[18px] font-extrabold text-[#1a1a1a] mb-4">Detected Items</h1>

      <div className="rounded-xl bg-[#E4F4E4] px-3 py-2 mb-3 text-[13px] font-semibold text-[#1F5A3D]">
        AI Detected ({items.length})
      </div>

      <div className="space-y-2 mb-4">
        {items.map((it, i) => (
          <div key={i} className="rounded-xl bg-white border border-[#EAEAEA] p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-[14px] text-[#1a1a1a]">{it.item_name}</p>
              <p className="text-[12px] text-[#6b6b6b]">{[it.quantity, it.unit].filter(Boolean).join(" ") || "1"}</p>
            </div>
            <button
              onClick={() => toggle(i)}
              className={`w-7 h-7 rounded-md flex items-center justify-center ${it.selected ? "bg-[#1F7A3D] text-white" : "bg-[#F0F0F0] text-[#6b6b6b]"}`}
            >
              <Check className="w-4 h-4" />
            </button>
            <button onClick={() => remove(i)} className="text-[#999] p-1">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 mb-4">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="Add missing item"
          className="flex-1 rounded-xl border border-[#E5E5E5] px-3 py-2 text-[14px] bg-white"
        />
        <button onClick={addManual} className="rounded-xl bg-[#5B3FBF] text-white px-3 py-2 flex items-center gap-1 text-[13px] font-semibold">
          <Plus className="w-4 h-4" /> Add
        </button>
      </div>

      <button
        disabled={saving}
        onClick={handleSave}
        className="w-full bg-[#5B3FBF] text-white font-bold text-[15px] py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Save to Inventory
      </button>
    </div>
  );
}
