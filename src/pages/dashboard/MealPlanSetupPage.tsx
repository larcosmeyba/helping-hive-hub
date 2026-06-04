import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronRight, DollarSign, Users, Store, Leaf, Package, ChefHat, Snowflake, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { supabase } from "@/integrations/supabase/client";

export default function MealPlanSetupPage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { generate, generating } = useMealPlan();
  const [pantryCount, setPantryCount] = useState<number>(0);
  const [fridgeCount, setFridgeCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { count } = await supabase
        .from("pantry_items")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      setPantryCount(count ?? 0);
      try {
        const { count: fc } = await supabase
          .from("fridge_items" as any)
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id);
        setFridgeCount(fc ?? 0);
      } catch {
        setFridgeCount(0);
      }
    })();
  }, [user]);

  const budget = profile?.weekly_budget ?? 75;
  const household = profile?.household_size ?? 2;
  const store = (profile?.home_store as string) ||
    ((profile?.preferred_stores as string[] | undefined)?.[0]) ||
    "Not selected";
  const dietary = ((profile?.dietary_preferences as string[] | undefined) ?? []);
  const allergies = ((profile?.allergies as string[] | undefined) ?? []);
  const cooking = (profile?.cooking_confidence as string) || "Beginner";

  const handleGenerate = async () => {
    navigate("/dashboard/meal-plan/generating");
    await generate();
  };

  return (
    <div className="w-full max-w-3xl mx-auto -mx-4 px-4 pb-6 min-h-full bg-[hsl(43_100%_96%)]">
      <div className="flex items-center gap-3 pt-2 pb-3">
        <button onClick={() => navigate(-1)} aria-label="Back" className="p-2 -ml-2">
          <ArrowLeft className="w-5 h-5 text-[#1a1a1a]" />
        </button>
        <h1 className="text-[20px] font-extrabold text-[#1a1a1a]">Meal Plan Settings</h1>
      </div>

      <div className="space-y-3">
        <SettingRow
          icon={<DollarSign className="w-5 h-5 text-white" />}
          iconBg="#3FAE5A"
          label="Weekly Budget"
          value={`$${budget}`}
          onClick={() => navigate("/dashboard/settings")}
        />
        <SettingRow
          icon={<Users className="w-5 h-5 text-white" />}
          iconBg="#7A6BD8"
          label="Family Size"
          value={`${household} ${household === 1 ? "Person" : "People"}`}
          onClick={() => navigate("/dashboard/settings")}
        />
        <SettingRow
          icon={<Store className="w-5 h-5 text-white" />}
          iconBg="#F2A900"
          label="Store"
          value={store}
          onClick={() => navigate("/dashboard/settings")}
        />
        <SettingRow
          icon={<Leaf className="w-5 h-5 text-white" />}
          iconBg="#3FAE5A"
          label="Dietary Preferences"
          value={dietary.length ? dietary.join(", ") : "None"}
          onClick={() => navigate("/dashboard/settings")}
        />
        <SettingRow
          icon={<AlertCircle className="w-5 h-5 text-white" />}
          iconBg="#E85D2F"
          label="Allergies"
          value={allergies.length ? allergies.join(", ") : "None"}
          onClick={() => navigate("/dashboard/settings")}
        />
        <SettingRow
          icon={<Package className="w-5 h-5 text-white" />}
          iconBg="#3B7DD8"
          label="Pantry Items"
          value={`${pantryCount} items selected`}
          onClick={() => navigate("/dashboard/pantry")}
        />
        <SettingRow
          icon={<Snowflake className="w-5 h-5 text-white" />}
          iconBg="#4FB3E0"
          label="Fridge Items"
          value={`${fridgeCount} items selected`}
          onClick={() => navigate("/dashboard/pantry")}
        />
        <SettingRow
          icon={<ChefHat className="w-5 h-5 text-white" />}
          iconBg="#E85D2F"
          label="Cooking Skill Level"
          value={cooking}
          onClick={() => navigate("/dashboard/settings")}
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
        Estimated pricing for planning only. Final pricing and availability are confirmed at Instacart checkout.
      </p>
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
