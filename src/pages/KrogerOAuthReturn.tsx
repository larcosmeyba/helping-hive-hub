import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Button } from "@/components/ui/button";
import { useNavigate, useSearchParams } from "react-router-dom";

/**
 * Web landing page reached after Kroger OAuth when the flow was started from
 * the native Help the Hive app. The Kroger token has already been stored
 * server-side by `kroger-oauth-callback`. This page's only job is to bounce
 * the user back into the installed app via the custom URL scheme, with a
 * fallback web button for users who tap the wrong button or have the app
 * uninstalled.
 */
const NATIVE_SCHEME = "com.helpthehive://oauth/kroger/return";

export default function KrogerOAuthReturn() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const status = params.get("kroger") ?? "connected";
  const [bounced, setBounced] = useState(false);

  const openInApp = () => {
    window.location.href = `${NATIVE_SCHEME}?kroger=${encodeURIComponent(status)}`;
    setBounced(true);
  };

  useEffect(() => {
    // If we somehow land here inside the native shell, skip the bounce and
    // go directly to the onboarding screen.
    if (Capacitor.isNativePlatform()) {
      navigate(`/onboarding/kroger?kroger=${encodeURIComponent(status)}`, { replace: true });
      return;
    }
    // Auto-attempt the deep link once on mount.
    openInApp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const failed = status !== "connected";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full text-center space-y-5">
        <img src="/favicon.png" alt="Help the Hive" className="h-14 w-14 mx-auto" />
        <h1 className="text-2xl font-semibold">
          {failed ? "Kroger sign-in didn't finish" : "Kroger connected"}
        </h1>
        <p className="text-muted-foreground">
          {failed
            ? "Tap the button below to return to the Help the Hive app and try again."
            : "Tap the button below to return to the Help the Hive app and pick your home store."}
        </p>
        <div className="flex flex-col gap-3 pt-2">
          <Button
            onClick={openInApp}
            className="w-full"
            style={{ backgroundColor: "#F2B233", color: "#000" }}
          >
            Open Help the Hive app
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              navigate(`/onboarding/kroger?kroger=${encodeURIComponent(status)}`, { replace: true })
            }
            className="w-full"
          >
            Continue in browser
          </Button>
        </div>
        {bounced && (
          <p className="text-xs text-muted-foreground pt-2">
            If the app didn't open automatically, tap "Open Help the Hive app" above.
          </p>
        )}
      </div>
    </div>
  );
}
