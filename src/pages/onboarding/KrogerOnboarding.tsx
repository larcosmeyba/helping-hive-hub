import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ShoppingBag, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { KrogerStorePicker } from "@/components/kroger/KrogerStorePicker";
import { SEOHead } from "@/components/SEOHead";
import logo from "@/assets/logo-transparent.png";

type Stage = "intro" | "store" | "done";

export default function KrogerOnboarding() {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [stage, setStage] = useState<Stage>("intro");
  const [working, setWorking] = useState(false);
  const [saving, setSaving] = useState(false);

  // Detect post-OAuth return
  useEffect(() => {
    const status = params.get("kroger");
    if (!status) return;
    if (status === "connected") {
      toast({ title: "Kroger connected", description: "Now pick your home store." });
      setStage("store");
    } else {
      toast({
        title: "Kroger connection failed",
        description: "You can try again or continue without it.",
        variant: "destructive",
      });
    }
    const next = new URLSearchParams(params);
    next.delete("kroger");
    setParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If user already has a Kroger token, jump to store stage
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("kroger_user_tokens")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data && stage === "intro") setStage("store");
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const connect = async () => {
    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke("kroger-oauth-start", {
        body: { redirectAfter: "/onboarding/kroger" },
      });
      if (error || !data?.authorizeUrl) throw error ?? new Error("No URL");
      window.location.href = data.authorizeUrl;
    } catch (e) {
      toast({
        title: "Could not start Kroger sign-in",
        description: String(e),
        variant: "destructive",
      });
      setWorking(false);
    }
  };

  const skip = () => navigate("/questionnaire", { replace: true });

  const saveStore = async (store: {
    locationId: string;
    name: string;
    address?: { zipCode?: string };
  }) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        kroger_location_id: store.locationId,
        kroger_store_name: store.name,
        kroger_store_zip: store.address?.zipCode ?? null,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save store", description: error.message, variant: "destructive" });
      return;
    }
    await refreshProfile();
    setStage("done");
    toast({ title: "Home Kroger saved", description: store.name });
    setTimeout(() => navigate("/questionnaire", { replace: true }), 600);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-10">
      <SEOHead
        title="Connect Your Kroger Account — Help The Hive"
        description="Connect Kroger to get accurate grocery pricing, product availability, and meal plan estimates based on your preferred store."
      />
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <img src={logo} alt="Help The Hive" className="h-10 w-10 mx-auto mb-3" />
          <h1 className="font-display text-2xl font-bold text-foreground">
            {stage === "store" ? "Pick Your Home Kroger" : "Connect Your Kroger Account"}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {stage === "store"
              ? "Search by ZIP to set your preferred store for pricing & availability."
              : "Connect Kroger to get more accurate grocery pricing, product availability, and meal plan cost estimates based on your preferred store."}
          </p>
        </div>

        <Card className="p-6 space-y-4">
          {stage === "intro" && (
            <>
              <div className="flex items-start gap-3 rounded-lg bg-muted/40 p-3">
                <ShoppingBag className="h-5 w-5 text-primary mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  We'll use Kroger only to pull live product info and prices for your meal plan.
                  You can disconnect anytime in Settings.
                </div>
              </div>
              <Button
                onClick={connect}
                disabled={working}
                className="w-full bg-gradient-honey text-primary-foreground hover:opacity-90"
              >
                {working ? <Loader2 className="h-4 w-4 animate-spin" /> : "Connect Kroger"}
              </Button>
              <Button onClick={skip} variant="outline" className="w-full" disabled={working}>
                Continue Without Kroger
              </Button>
              <p className="text-[11px] text-muted-foreground text-center">
                Skipping is fine — meal planning, grocery lists, and pantry tools still work with
                our internal estimated pricing.
              </p>
            </>
          )}

          {stage === "store" && (
            <>
              <KrogerStorePicker onSelect={saveStore} />
              {saving && (
                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-3 w-3 animate-spin" /> Saving…
                </div>
              )}
              <Button onClick={skip} variant="ghost" className="w-full text-muted-foreground">
                Skip for now
              </Button>
            </>
          )}

          {stage === "done" && (
            <div className="flex items-center gap-3 text-sm">
              <Check className="h-5 w-5 text-primary" /> All set — taking you to the next step…
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
