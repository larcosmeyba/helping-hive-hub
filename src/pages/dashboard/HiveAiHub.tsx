import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, Camera, Plus, ChefHat, Package, ArrowRight, Sparkles, DollarSign, Calendar, Salad, Wand2 } from "lucide-react";
import { fetchFoodWasteAlerts, createFoodWasteAlerts } from "@/lib/hiveAi";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const STARTERS = [
  { icon: DollarSign, label: "What can I cook for under $15?", to: "/dashboard/cook/recipes?q=under-15" },
  { icon: Calendar, label: "Build a weekly meal plan", to: "/dashboard/meal-plan/setup" },
  { icon: Wand2, label: "Reduce my grocery spending", to: "/dashboard/budget-insights" },
  { icon: Salad, label: "Give me healthy dinner ideas", to: "/dashboard/cook/recipes?q=healthy-dinner" },
];

export default function HiveAiHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [savings, setSavings] = useState(0);
  const [pantryCount, setPantryCount] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (user) {
          const { count } = await supabase
            .from("pantry_items")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id);
          setPantryCount(count ?? 0);
          if ((count ?? 0) > 0) {
            await createFoodWasteAlerts().catch(() => {});
            const list = await fetchFoodWasteAlerts();
            setAlerts(list);
            setSavings(list.reduce((s, a) => s + Number(a.estimated_value || 0), 0));
          }
        } else {
          setPantryCount(0);
        }
      } catch {
        setPantryCount(0);
      }
    })();
  }, [user]);

  const hasItems = (pantryCount ?? 0) > 0;

  return (
    <div className="max-w-md mx-auto px-1 pb-8">
      <h1 className="text-[22px] font-extrabold text-[#1a1a1a] mb-4">Hive AI</h1>

      {!hasItems && pantryCount !== null && (
        <div className="rounded-2xl bg-[hsl(43_100%_96%)] p-5 mb-5 border border-[#EEE7DA]">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-5 h-5 text-[#1F5A3D]" />
            <span className="font-extrabold text-[17px] text-[#1a1a1a]">Welcome to Hive AI</span>
          </div>
          <p className="text-[13px] text-[#4a4a4a] mb-3">Hive AI helps you:</p>
          <ul className="text-[13px] text-[#3a3a3a] space-y-1.5 mb-4">
            <li>• Reduce food waste</li>
            <li>• Build meals from ingredients you already own</li>
            <li>• Save money on groceries</li>
            <li>• Generate recipes and meal plans</li>
          </ul>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate("/dashboard/hive-ai/add")}
              className="w-full bg-[#1F5A3D] text-white font-semibold py-3 rounded-xl text-[14px]"
            >
              Add Pantry Items
            </button>
            <button
              onClick={() => navigate("/dashboard/hive-ai/scan")}
              className="w-full bg-white border border-[#1F5A3D] text-[#1F5A3D] font-semibold py-3 rounded-xl text-[14px]"
            >
              Scan Pantry
            </button>
          </div>
        </div>
      )}

      {hasItems && (
        <div className="rounded-2xl bg-[#FEECEC] p-4 mb-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-[#D64545]" />
            <span className="font-bold text-[15px] text-[#1a1a1a]">Food Waste Alert</span>
          </div>
          {alerts.length === 0 ? (
            <p className="text-[13px] text-[#6b6b6b]">No items expiring soon. Great job!</p>
          ) : (
            <ul className="text-[13px] text-[#3a3a3a] space-y-1 mb-2">
              {alerts.slice(0, 3).map((a) => (
                <li key={a.id}>• {a.message || a.alert_type}</li>
              ))}
            </ul>
          )}
          {savings > 0 && (
            <p className="text-[13px] font-semibold text-[#1F5A3D] mt-1">
              Potential Savings: ${savings.toFixed(0)} 💰
            </p>
          )}
        </div>
      )}

      <h2 className="text-[15px] font-bold text-[#1a1a1a] mb-3">Ask Hive AI</h2>
      <div className="grid grid-cols-2 gap-2 mb-5">
        {STARTERS.map((s) => (
          <button
            key={s.label}
            onClick={() => navigate(s.to)}
            className="text-left rounded-xl bg-white border border-[#EEE7DA] p-3 active:scale-[0.99] transition-transform"
          >
            <s.icon className="w-4 h-4 text-[#1F5A3D] mb-1.5" />
            <p className="text-[12.5px] font-semibold text-[#1a1a1a] leading-snug">{s.label}</p>
          </button>
        ))}
      </div>

      <h2 className="text-[15px] font-bold text-[#1a1a1a] mb-3">What would you like to do?</h2>

      <div className="space-y-3">
        <HubCard
          bg="#EAE4FB"
          icon={<Camera className="w-5 h-5 text-[#5B3FBF]" />}
          title="Scan My Food"
          subtitle="Take a photo to add items"
          onClick={() => navigate("/dashboard/hive-ai/scan")}
        />
        <HubCard
          bg="#E4F4E4"
          icon={<Plus className="w-5 h-5 text-[#1F7A3D]" />}
          title="Add Items Manually"
          subtitle="Add items one by one"
          onClick={() => navigate("/dashboard/hive-ai/add")}
        />
        <HubCard
          bg="#FFF1D6"
          icon={<ChefHat className="w-5 h-5 text-[#B5781A]" />}
          title="Find Meals"
          subtitle="Get meal ideas using what you have"
          onClick={() => navigate("/dashboard/cook/recipes")}
        />
        {hasItems && (
          <HubCard
            bg="#FEECEC"
            icon={<AlertTriangle className="w-5 h-5 text-[#D64545]" />}
            title="Use These Items First"
            subtitle="See expiring items"
            onClick={() => navigate("/dashboard/food-waste-alerts")}
          />
        )}
        <HubCard
          bg="#F0F0F0"
          icon={<Package className="w-5 h-5 text-[#1a1a1a]" />}
          title="My Inventory"
          subtitle="View fridge, pantry & freezer"
          onClick={() => navigate("/dashboard/pantry")}
        />
      </div>
    </div>
  );
}

function HubCard({ bg, icon, title, subtitle, onClick }: { bg: string; icon: React.ReactNode; title: string; subtitle: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl p-4 flex items-center gap-3 active:scale-[0.99] transition-transform"
      style={{ backgroundColor: bg }}
    >
      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-[15px] text-[#1a1a1a]">{title}</h3>
        <p className="text-[12.5px] text-[#4a4a4a] mt-0.5">{subtitle}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-[#1a1a1a]/60 shrink-0" />
    </button>
  );
}
