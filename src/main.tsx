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

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <App />
  </HelmetProvider>,
);
