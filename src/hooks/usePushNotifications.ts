import { useEffect } from "react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

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

  useEffect(() => {
    if (!user) return;
    if (!Capacitor.isNativePlatform()) return;

    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { PushNotifications } = await import("@capacitor/push-notifications");

        const perm = await PushNotifications.checkPermissions();
        let granted = perm.receive === "granted";
        if (!granted) {
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
