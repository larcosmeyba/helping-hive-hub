import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { phCapture } from "@/lib/posthog";

export async function trackEvent(
  action: string,
  metadata?: Record<string, Json | undefined>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      phCapture(action, metadata as Record<string, unknown> | undefined);
      return;
    }

    // Honor analytics opt-out: skip tracking if user disabled it
    const { data: profile } = await supabase
      .from("profiles")
      .select("analytics_opt_in")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profile && profile.analytics_opt_in === false) return;

    const { error } = await supabase.from("activity_logs").insert([{
      user_id: user.id,
      action,
      entity_type: "onboarding",
      details: (metadata as Json) ?? {},
    }]);
    if (error && import.meta.env.DEV) console.warn("[analytics] activity_logs insert failed:", error);

    // Fan out to PostHog — same opt-out gate already applied above.
    phCapture(action, metadata as Record<string, unknown> | undefined);
  } catch {
    // Silent fail — analytics should never block UX
  }
}
