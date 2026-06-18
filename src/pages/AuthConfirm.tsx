import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Capacitor } from "@capacitor/core";

/**
 * Email verification / password recovery landing page.
 *
 * Supabase appends `#access_token=...&refresh_token=...&type=signup|recovery` to
 * the URL after the user clicks the email link. This page:
 *   1. Completes the verification on the web (sets the Supabase session).
 *   2. If the user originally signed up inside the native Help the Hive app,
 *      offers a deep-link button (and auto-attempts) to bounce back into the
 *      app with the same tokens via the `com.helpthehive://` custom URL scheme.
 */
const NATIVE_SCHEME = "com.helpthehive://auth/confirm";

export default function AuthConfirm() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<"verifying" | "verified" | "error">("verifying");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [isRecovery, setIsRecovery] = useState(false);
  const hash = typeof window !== "undefined" ? window.location.hash : "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // If we're already inside the native app shell, hand off to the
        // native app URL listener (main.tsx) which calls setSession.
        if (Capacitor.isNativePlatform()) {
          // Native already handles tokens directly; just go home.
          navigate("/dashboard", { replace: true });
          return;
        }

        // Parse hash params
        const params = new URLSearchParams(hash.replace(/^#/, ""));
        const access_token = params.get("access_token");
        const refresh_token = params.get("refresh_token");
        const type = params.get("type");
        if (type === "recovery") setIsRecovery(true);

        if (!access_token || !refresh_token) {
          // Supabase may have already auto-consumed the tokens via
          // detectSessionInUrl. Verify we have a session.
          const { data } = await supabase.auth.getSession();
          if (!data.session) {
            throw new Error("Missing verification tokens. The link may have expired.");
          }
        } else {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token });
          if (error) throw error;
        }

        if (cancelled) return;
        setStatus("verified");
      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Verification failed.";
        setErrorMsg(msg);
        setStatus("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hash, navigate]);

  const openInApp = () => {
    // Pass the original hash through so the native app can call setSession.
    window.location.href = `${NATIVE_SCHEME}${hash}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6">
      <div className="max-w-md w-full text-center space-y-5">
        <img src="/favicon.png" alt="Help the Hive" className="h-14 w-14 mx-auto" />
        {status === "verifying" && (
          <>
            <h1 className="text-2xl font-semibold">Verifying your email…</h1>
            <p className="text-muted-foreground">One moment while we confirm your account.</p>
          </>
        )}
        {status === "verified" && (
          <>
            <h1 className="text-2xl font-semibold">
              {isRecovery ? "Reset your password" : "Email verified"}
            </h1>
            <p className="text-muted-foreground">
              {isRecovery
                ? "Open Help the Hive to choose a new password."
                : "Your account is ready. Open the Help the Hive app to continue, or use the web app."}
            </p>
            <div className="flex flex-col gap-3 pt-2">
              <Button onClick={openInApp} className="w-full" style={{ backgroundColor: "#F2B233", color: "#000" }}>
                Open Help the Hive app
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate(isRecovery ? "/reset-password" : "/dashboard", { replace: true })}
                className="w-full"
              >
                Continue in browser
              </Button>
            </div>
          </>
        )}
        {status === "error" && (
          <>
            <h1 className="text-2xl font-semibold">We couldn't verify that link</h1>
            <p className="text-muted-foreground">{errorMsg}</p>
            <Button onClick={() => navigate("/login", { replace: true })} className="w-full">
              Back to sign in
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
