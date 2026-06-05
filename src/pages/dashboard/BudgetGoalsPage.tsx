import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

export default function BudgetGoalsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [monthly, setMonthly] = useState(400);
  const [grocery, setGrocery] = useState(250);
  const [restaurant, setRestaurant] = useState(80);
  const [coffee, setCoffee] = useState(25);
  const [delivery, setDelivery] = useState(45);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("food_budget_settings")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setMonthly(Number(data.monthly_food_budget ?? 400));
        setGrocery(Number(data.grocery_budget ?? 250));
        setRestaurant(Number(data.restaurant_budget ?? 80));
        setCoffee(Number(data.coffee_budget ?? 25));
        setDelivery(Number(data.food_delivery_budget ?? 45));
      });
  }, [user]);

  async function save() {
    if (!user) return;
    setSaving(true);
    const month = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
      .toISOString()
      .slice(0, 10);
    const { error } = await supabase.from("food_budget_settings").upsert(
      {
        user_id: user.id,
        monthly_food_budget: monthly,
        grocery_budget: grocery,
        restaurant_budget: restaurant,
        coffee_budget: coffee,
        food_delivery_budget: delivery,
        budget_month: month,
      },
      { onConflict: "user_id,budget_month" },
    );
    setSaving(false);
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Goals saved" });
    navigate("/dashboard/budget-snapshot");
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[13px] text-[#6b6b6b] py-3">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-[22px] font-extrabold text-[#1a1a1a] mb-1">Budget Goals</h1>
      <p className="text-[13px] text-[#6b6b6b] mb-5">Set monthly limits for your food spending.</p>

      <div className="space-y-3">
        <Field label="Monthly Food Budget" value={monthly} onChange={setMonthly} />
        <Field label="Groceries" value={grocery} onChange={setGrocery} />
        <Field label="Restaurants" value={restaurant} onChange={setRestaurant} />
        <Field label="Coffee" value={coffee} onChange={setCoffee} />
        <Field label="Food Delivery" value={delivery} onChange={setDelivery} />
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="w-full mt-6 bg-[#1F5A3D] text-white font-semibold py-3.5 rounded-xl disabled:opacity-60"
      >
        {saving ? "Saving…" : "Save Goals"}
      </button>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block bg-white border border-[#EEE7DA] rounded-xl px-4 py-3">
      <span className="block text-[12px] text-[#6b6b6b] mb-1">{label}</span>
      <div className="flex items-center gap-2">
        <span className="text-[16px] font-bold text-[#1a1a1a]">$</span>
        <input
          type="number"
          inputMode="numeric"
          value={value}
          onChange={(e) => onChange(Number(e.target.value || 0))}
          className="flex-1 text-[16px] font-bold text-[#1a1a1a] bg-transparent outline-none"
        />
      </div>
    </label>
  );
}
