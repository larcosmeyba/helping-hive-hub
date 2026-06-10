import { useNavigate } from "react-router-dom";
import { ArrowLeft, Shield, Lock, Eye, Unlink, Sparkles } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlaidLink } from "react-plaid-link";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { PRIVACY_COPY } from "@/lib/foodBudget";

export default function BudgetConnectPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isNative = Capacitor.isNativePlatform();

  const [loading, setLoading] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [exchanging, setExchanging] = useState(false);
  const [waitingHosted, setWaitingHosted] = useState(false);
  const pollRef = useRef<number | null>(null);

  // Check if already connected — skip straight to dashboard.
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("plaid_connections")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (data) navigate("/dashboard/budget-snapshot", { replace: true });
    })();
  }, [user, navigate]);

  // ---------- WEB FLOW (react-plaid-link) ----------
  const onSuccess = useCallback(
    async (public_token: string) => {
      setExchanging(true);
      try {
        const { error } = await supabase.functions.invoke("exchange-plaid-public-token", {
          body: { public_token },
        });
        if (error) throw error;
        navigate("/dashboard/budget-snapshot/syncing");
      } catch (e) {
        toast({
          title: "Connection failed",
          description: String((e as Error).message),
          variant: "destructive",
        });
        setExchanging(false);
      }
    },
    [navigate],
  );

  const { open, ready } = usePlaidLink({
    token: isNative ? null : linkToken,
    onSuccess,
    onExit: (err) => {
      setLinkToken(null);
      if (err) {
        toast({
          title: "Plaid Link closed",
          description: err.display_message || err.error_message || "You can try again anytime.",
        });
      }
    },
  });

  useEffect(() => {
    if (!isNative && linkToken && ready) open();
  }, [isNative, linkToken, ready, open]);

  // ---------- NATIVE FLOW (Hosted Link in system browser) ----------
  // While the in-app browser is open, poll Supabase for an active connection
  // (the webhook will insert it once Plaid finishes).
  useEffect(() => {
    if (!waitingHosted || !user) return;
    const startedAt = Date.now();
    const tick = async () => {
      const { data } = await supabase
        .from("plaid_connections")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (data) {
        try { await Browser.close(); } catch { /* noop */ }
        setWaitingHosted(false);
        navigate("/dashboard/budget-snapshot/syncing");
        return;
      }
      if (Date.now() - startedAt > 10 * 60 * 1000) {
        setWaitingHosted(false);
        return;
      }
      pollRef.current = window.setTimeout(tick, 2500);
    };
    tick();
    return () => {
      if (pollRef.current) window.clearTimeout(pollRef.current);
    };
  }, [waitingHosted, user, navigate]);

  // If the user dismisses the in-app browser manually, stop polling.
  useEffect(() => {
    if (!isNative) return;
    const sub = Browser.addListener("browserFinished", () => {
      // Give the webhook a brief grace period before giving up.
      window.setTimeout(() => setWaitingHosted(false), 6000);
    });
    return () => {
      sub.then((s) => s.remove()).catch(() => undefined);
    };
  }, [isNative]);

  async function handleConnect() {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-plaid-link-token", {
        body: { user_id: user.id, hosted: isNative },
      });
      if (error || !data?.link_token) {
        toast({
          title: "Plaid unavailable",
          description: "Could not start a secure session. Please try again in a moment.",
          variant: "destructive",
        });
        return;
      }

      if (isNative) {
        if (!data.hosted_link_url) {
          toast({
            title: "Plaid unavailable",
            description: "Hosted link unavailable. Please try again shortly.",
            variant: "destructive",
          });
          return;
        }
        setWaitingHosted(true);
        await Browser.open({ url: data.hosted_link_url, presentationStyle: "popover" });
      } else {
        setLinkToken(data.link_token);
      }
    } catch (e) {
      toast({
        title: "Could not start Plaid",
        description: String((e as Error).message),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  const buttonLabel = exchanging
    ? "Finishing connection…"
    : loading
      ? "Starting Plaid…"
      : isNative && waitingHosted
        ? "Waiting for Plaid…"
        : !isNative && linkToken && !ready
          ? "Opening Plaid…"
          : "Connect With Plaid";

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
          Securely connect your bank account with Plaid to track food spending. Connect once — we'll remember it.
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
        disabled={loading || exchanging || waitingHosted || (!isNative && !!linkToken && !ready)}
        className="w-full bg-[#1F5A3D] text-white font-semibold py-3.5 rounded-xl disabled:opacity-60"
      >
        {buttonLabel}
      </button>

      <p className="text-[11px] text-[#9a9a9a] text-center mt-3">
        Sandbox mode: use <strong>user_good</strong> / <strong>pass_good</strong> at any bank.
      </p>
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
