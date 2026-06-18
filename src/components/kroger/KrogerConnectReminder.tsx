import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const DISMISS_KEY = "kroger_reminder_dismissed_v1";

export function KrogerConnectReminder() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1") return;
    (async () => {
      const { data } = await supabase
        .from("kroger_user_tokens")
        .select("user_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) setShow(true);
    })();
  }, [user?.id]);

  if (!show) return null;
  return (
    <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-start gap-3">
      <ShoppingBag className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="flex-1 text-[13px] text-foreground">
        <div className="font-semibold mb-0.5">Connect Kroger for accurate pricing</div>
        <div className="text-muted-foreground">
          Connect Kroger for more accurate store-specific pricing.{" "}
          <Link to="/dashboard/settings" className="text-primary font-medium underline">
            Connect now
          </Link>
        </div>
      </div>
      <button
        aria-label="Dismiss"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, "1");
          setShow(false);
        }}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
