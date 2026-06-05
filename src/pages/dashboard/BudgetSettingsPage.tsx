import { useNavigate } from "react-router-dom";
import { ArrowLeft, Target, Trash2, Unlink, Info } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { PRIVACY_COPY } from "@/lib/foodBudget";

export default function BudgetSettingsPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);

  async function disconnect(deleteTx: boolean) {
    if (!user) return;
    const label = deleteTx ? "delete" : "disconnect";
    if (!confirm(deleteTx ? "Disconnect Plaid and delete all imported transactions?" : "Disconnect Plaid? Imported transactions stay.")) return;
    setBusy(label);
    const { error } = await supabase.functions.invoke("disconnect-plaid-account", {
      body: { delete_transactions: deleteTx },
    });
    setBusy(null);
    if (error) {
      toast({ title: "Could not disconnect", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: deleteTx ? "Disconnected and deleted" : "Disconnected" });
    navigate("/dashboard");
  }

  async function deleteOnly() {
    if (!user) return;
    if (!confirm("Delete all imported food transactions?")) return;
    setBusy("delete-tx");
    const { error } = await supabase.from("food_transactions").delete().eq("user_id", user.id);
    await supabase.from("food_budget_summaries").delete().eq("user_id", user.id);
    setBusy(null);
    if (error) {
      toast({ title: "Could not delete", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Transactions deleted" });
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[13px] text-[#6b6b6b] py-3">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>
      <h1 className="text-[22px] font-extrabold text-[#1a1a1a] mb-4">Budget Settings</h1>

      <div className="space-y-2">
        <Row icon={Target} label="Manage Budget Goals" onClick={() => navigate("/dashboard/budget-snapshot/goals")} />
        <Row
          icon={Trash2}
          label={busy === "delete-tx" ? "Deleting…" : "Delete Imported Transactions"}
          onClick={deleteOnly}
          danger
        />
        <Row
          icon={Unlink}
          label={busy === "disconnect" ? "Disconnecting…" : "Disconnect Plaid"}
          onClick={() => disconnect(false)}
          danger
        />
        <Row
          icon={Unlink}
          label={busy === "delete" ? "Working…" : "Disconnect Plaid + Delete Data"}
          onClick={() => disconnect(true)}
          danger
        />
      </div>

      <div className="mt-6 rounded-xl bg-[#FFF8E8] border border-[#F2D77A] p-3">
        <div className="flex items-center gap-2 mb-1">
          <Info className="w-4 h-4 text-[#5a4a1a]" />
          <p className="text-[12px] font-bold text-[#5a4a1a]">Data Usage</p>
        </div>
        <p className="text-[12px] text-[#5a4a1a] leading-snug">{PRIVACY_COPY}</p>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, onClick, danger }: { icon: typeof Target; label: string; onClick: () => void; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 bg-white border border-[#EEE7DA] rounded-xl px-4 py-3.5 text-left"
    >
      <Icon className={`w-4 h-4 ${danger ? "text-[#E63B6B]" : "text-[#1F5A3D]"}`} />
      <span className={`text-[14px] font-semibold flex-1 ${danger ? "text-[#E63B6B]" : "text-[#1a1a1a]"}`}>{label}</span>
    </button>
  );
}
