import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";

// Mark native app on body for global CSS safe area handling
if (Capacitor.isNativePlatform()) {
  document.body.classList.add("native-app");
}

// When the native app returns to foreground, refresh the auth session
CapacitorApp.addListener("appStateChange", async ({ isActive }) => {
  if (isActive) {
    const { data } = await supabase.auth.getSession();
    if (data.session) {
      await supabase.auth.refreshSession();
    }
  }
});

createRoot(document.getElementById("root")!).render(<App />);
