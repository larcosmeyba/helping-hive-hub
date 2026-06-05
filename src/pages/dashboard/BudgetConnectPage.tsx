import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Eye, Unlink, Sparkles } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { PRIVACY_COPY } from "@/lib/foodBudget";

export default function BudgetConnectPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  async function handleConnect() {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-plaid-link-token", {
        body: { user_id: user.id },
      });
      if (error || !data?.link_token) {
        // Plaid not configured yet — go straight to mock sync flow.
        toast({
          title: "Demo mode",
          description: "Plaid keys aren't live yet. Showing a demo budget so you can preview the flow.",
        });
        navigate("/dashboard/budget-snapshot/syncing?demo=1");
        return;
      }
      // TODO: open Plaid Link with link_token on mobile + web (react-plaid-link).
      // For now, route to the syncing screen which will call sync + calculate.
      navigate(`/dashboard/budget-snapshot/syncing?token=${encodeURIComponent(data.link_token)}`);
    } catch (e) {
      toast({ title: "Could not start Plaid", description: String((e as Error).message), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-10">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-[13px] text-[#6b6b6b] py-3">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="text-center mb-6 mt-2">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-[#1F5A3D] flex items-center justify-center mb-4">
          <Lock className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-[22px] font-extrabold text-[#1a1a1a]">Connect Your Accounts</h1>
        <p className="text-[13px] text-[#6b6b6b] mt-2">
          Securely connect your bank account with Plaid to track food spending.
        </p>
      </div>

      <div className="space-y-3 mb-6">
        <TrustRow icon={Shield} text="Secure and encrypted" />
        <TrustRow icon={Eye} text="Read-only access" />
        <TrustRow icon={Unlink} text="You can disconnect anytime" />
        <TrustRow icon={Sparkles} text="Only food-related transactions are used" />
      </div>

      <div className="rounded-xl bg-[#FFF8E8] border border-[#F2D77A] p-3 mb-6">
        <p className="text-[12px] text-[#5a4a1a] leading-snug">{PRIVACY_COPY}</p>
      </div>

      <button
        onClick={handleConnect}
        disabled={loading}
        className="w-full bg-[#1F5A3D] text-white font-semibold py-3.5 rounded-xl disabled:opacity-60"
      >
        {loading ? "Starting Plaid…" : "Connect With Plaid"}
      </button>
    </div>
  );
}

function TrustRow({ icon: Icon, text }: { icon: typeof Shield; text: string }) {
  return (
    <div className="flex items-center gap-3 bg-white border border-[#EEE7DA] rounded-xl px-4 py-3">
      <div className="w-9 h-9 rounded-lg bg-[#F5EBDC] flex items-center justify-center">
        <Icon className="w-4 h-4 text-[#1F5A3D]" />
      </div>
      <span className="text-[14px] font-medium text-[#1a1a1a]">{text}</span>
    </div>
  );
}
