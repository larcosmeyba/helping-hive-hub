import { useEffect, useState, useCallback } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const PRIMER_KEY = "hth_push_primer_seen";

/**
 * Registers the device for push notifications on iOS/Android via Capacitor.
 * Stores the device token in `push_tokens` table tied to the current user.
 *
 * Native setup required outside the sandbox:
 *  - iOS: Add Push Notifications capability in Xcode + APNs cert in Apple Developer portal.
 *  - Android: Add google-services.json from Firebase Console for FCM.
 *
 * Will silently no-op on web.
 */
export function usePushNotifications() {
  const { user } = useAuth();
  const [needsPrimer, setNeedsPrimer] = useState(false);
  const [primerResolver, setPrimerResolver] = useState<((v: boolean) => void) | null>(null);

  const handlePrimerContinue = useCallback(() => {
    try { localStorage.setItem(PRIMER_KEY, "1"); } catch { /* ignore */ }
    setNeedsPrimer(false);
    primerResolver?.(true);
    setPrimerResolver(null);
  }, [primerResolver]);

  const handlePrimerDismiss = useCallback(() => {
    try { localStorage.setItem(PRIMER_KEY, "1"); } catch { /* ignore */ }
    setNeedsPrimer(false);
    primerResolver?.(false);
    setPrimerResolver(null);
  }, [primerResolver]);

  useEffect(() => {
    if (!user) return;
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        const perm = await PushNotifications.checkPermissions();
        let granted = perm.receive === "granted";

        if (!granted && perm.receive !== "denied") {
          // Show pre-permission primer first (only if user hasn't seen it)
          let primerSeen = false;
          try { primerSeen = !!localStorage.getItem(PRIMER_KEY); } catch { /* ignore */ }

          if (!primerSeen) {
            const proceed = await new Promise<boolean>((resolve) => {
              setPrimerResolver(() => resolve);
              setNeedsPrimer(true);
            });
            if (!proceed) return;
          }

          const req = await PushNotifications.requestPermissions();
          granted = req.receive === "granted";
        }
        if (!granted) return;

        await PushNotifications.register();

        const regListener = await PushNotifications.addListener(
          "registration",
          async (token) => {
            const platform = Capacitor.getPlatform() as "ios" | "android";
            await supabase.from("push_tokens").upsert(
              {
                user_id: user.id,
                token: token.value,
                platform,
                last_active_at: new Date().toISOString(),
              },
              { onConflict: "user_id,token" }
            );
          }
        );

        const errListener = await PushNotifications.addListener(
          "registrationError",
          (err) => {
            console.warn("[push] registration error:", err);
          }
        );

        cleanup = () => {
          regListener.remove();
          errListener.remove();
        };
      } catch (e) {
        console.warn("[push] init failed:", e);
      }
    })();

    return () => {
      cleanup?.();
    };
  }, [user]);
}
