import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { createFoodWasteAlerts, fetchFoodWasteAlerts } from "@/lib/hiveAi";
import { toast } from "@/components/ui/sonner";

export default function FoodWasteAlertsPage() {
  const navigate = useNavigate();
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      await createFoodWasteAlerts();
      const a = await fetchFoodWasteAlerts();
      setAlerts(a);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not load alerts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-8">
      <div className="flex items-center gap-2 mb-1">
        <AlertTriangle className="w-5 h-5 text-[#E85D2F]" />
        <h1 className="text-xl font-extrabold text-foreground">Food waste alerts</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-4">Items that may go bad soon. Cook with these first to save money and reduce waste.</p>

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Checking your inventory…</div>
      ) : alerts.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <p className="text-foreground font-semibold mb-1">No alerts</p>
          <p className="text-sm text-muted-foreground">Nothing in your pantry, fridge, or freezer needs attention right now.</p>
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-4">
            {alerts.map((a) => (
              <div key={a.id} className="bg-card border border-border rounded-xl p-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-[#E85D2F]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{a.message}</p>
                  <p className="text-[11px] text-muted-foreground uppercase tracking-wide">{a.alert_type.replace(/_/g, " ")}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => navigate("/dashboard/cook")} className="w-full py-3 rounded-xl bg-[#1F5A3D] text-white font-semibold flex items-center justify-center gap-2">
            Use These Items First <ArrowRight className="w-4 h-4" />
          </button>
        </>
      )}
    </div>
  );
}
