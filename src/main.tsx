import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { installGlobalErrorHandlers } from "@/lib/errorLogger";
import { initPostHog } from "@/lib/posthog";
import { initSentry } from "@/lib/sentry";

// Mark native app on body for global CSS safe area handling
if (Capacitor.isNativePlatform()) {
  document.body.classList.add("native-app");
}

// Capture window errors and unhandled promise rejections into activity_logs
installGlobalErrorHandlers();

// Product analytics + error monitoring. Both no-op if env vars are missing.
initPostHog();
initSentry();

// When the native app returns to foreground, refresh the auth session
CapacitorApp.addListener("appStateChange", async ({ isActive }) => {
  if (isActive) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await supabase.auth.refreshSession();
    }
  }
});

// Handle deep links into the native app:
//   com.helpthehive://auth/confirm#access_token=...&refresh_token=...&type=...
//      → email verification / password reset bouncing back from the web.
//   com.helpthehive://oauth/kroger/return?kroger=connected
//      → Kroger OAuth bouncing back from the system browser.
CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
  try {
    if (!url.startsWith("com.helpthehive://")) return;
    const parsed = new URL(url);
    const path = parsed.host + parsed.pathname; // e.g. "auth/confirm" or "oauth/kroger/return"

    // Kroger OAuth bounce — token is already saved server-side by the
    // kroger-oauth-callback edge function. Close the in-app browser (if open)
    // and route to /onboarding/kroger so the existing flow detects the
    // connection and advances to the store picker.
    if (path.startsWith("oauth/kroger/return")) {
      try {
        const { Browser } = await import("@capacitor/browser");
        await Browser.close();
      } catch { /* browser may already be closed */ }
      const status = parsed.searchParams.get("kroger") ?? "connected";
      window.location.replace(`/onboarding/kroger?kroger=${encodeURIComponent(status)}`);
      return;
    }

    // Auth (email verification / password reset) — tokens come in the hash.
    const hashIdx = url.indexOf("#");
    if (hashIdx === -1) return;
    const params = new URLSearchParams(url.slice(hashIdx + 1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    const type = params.get("type");
    if (access_token && refresh_token) {
      await supabase.auth.setSession({ access_token, refresh_token });
      const dest = type === "recovery" ? "/reset-password" : "/dashboard";
      window.location.replace(dest);
    }
  } catch (err) {
    console.warn("[DeepLink] failed to handle url:", err);
  }
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);
