import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

export async function trackEvent(
  action: string,
  metadata?: Record<string, Json | undefined>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Honor analytics opt-out: skip tracking if user disabled it
    if (user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("analytics_opt_in")
        .eq("user_id", user.id)
        .maybeSingle();
      if (profile && profile.analytics_opt_in === false) return;
    }

    await supabase.from("activity_logs").insert([{
      user_id: user?.id ?? null,
      action,
      entity_type: "onboarding",
      details: (metadata as Json) ?? {},
    }]);
  } catch {
    // Silent fail — analytics should never block UX
  }
}
