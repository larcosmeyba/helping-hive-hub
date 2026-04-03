import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { App as CapacitorApp } from "@capacitor/app";
import { supabase } from "@/integrations/supabase/client";

// When the native app returns to foreground, refresh the auth session
// so the user stays logged in seamlessly
CapacitorApp.addListener("appStateChange", async ({ isActive }) => {
  if (isActive) {
    const { data, error } = await supabase.auth.getSession();
    if (data.session) {
      // Proactively refresh if the token is getting stale
      await supabase.auth.refreshSession();
    }
  }
});

createRoot(document.getElementById("root")!).render(<App />);
