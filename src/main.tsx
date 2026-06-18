import { createRoot } from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import App from "./App.tsx";
import "./index.css";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { installGlobalErrorHandlers } from "@/lib/errorLogger";

// Mark native app on body for global CSS safe area handling
if (Capacitor.isNativePlatform()) {
  document.body.classList.add("native-app");
}

// Capture window errors and unhandled promise rejections into activity_logs
installGlobalErrorHandlers();

// When the native app returns to foreground, refresh the auth session
CapacitorApp.addListener("appStateChange", async ({ isActive }) => {
  if (isActive) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await supabase.auth.refreshSession();
    }
  }
});

// Handle deep links from email verification / password reset:
//   com.helpthehive://auth/confirm#access_token=...&refresh_token=...&type=...
// The web /auth/confirm page bounces here so the native app gets the session.
CapacitorApp.addListener("appUrlOpen", async ({ url }) => {
  try {
    if (!url.startsWith("com.helpthehive://")) return;
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
    console.warn("[DeepLink] failed to handle auth url:", err);
  }
});

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);
