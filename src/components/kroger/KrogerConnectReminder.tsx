import { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingBag, X, Loader2 } from "lucide-react";
import { useKrogerConnection } from "@/hooks/useKrogerConnection";

const DISMISS_KEY = "kroger_reminder_dismissed_v1";

export function KrogerConnectReminder() {
  const { loading, connected, hasHomeStore, connect } = useKrogerConnection();
  const [dismissed, setDismissed] = useState(
    typeof window !== "undefined" && localStorage.getItem(DISMISS_KEY) === "1",
  );
  const [working, setWorking] = useState(false);

  if (loading || dismissed) return null;
  if (connected && hasHomeStore) return null;

  const needsStore = connected && !hasHomeStore;

  const onConnect = async () => {
    setWorking(true);
    await connect();
    setWorking(false);
  };

  return (
    <div className="mb-4 rounded-xl border border-primary/30 bg-primary/5 p-3 flex items-start gap-3">
      <ShoppingBag className="h-4 w-4 text-primary mt-0.5 shrink-0" />
      <div className="flex-1 text-[13px] text-foreground">
        <div className="font-semibold mb-0.5">
          {needsStore ? "Pick your home Kroger" : "Connect Kroger for accurate pricing"}
        </div>
        <div className="text-muted-foreground">
          {needsStore ? (
            <>
              Choose a home store to see live Kroger prices.{" "}
              <Link to="/dashboard/settings" className="text-primary font-medium underline">
                Choose store
              </Link>
            </>
          ) : (
            <>
              Connect your Kroger account to see live store pricing.{" "}
              <button
                onClick={onConnect}
                disabled={working}
                className="text-primary font-medium underline disabled:opacity-60"
              >
                {working ? (
                  <span className="inline-flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Connecting…
                  </span>
                ) : (
                  "Connect Kroger"
                )}
              </button>
            </>
          )}
        </div>
      </div>
      <button
        aria-label="Dismiss"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, "1");
          setDismissed(true);
        }}
        className="text-muted-foreground hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
