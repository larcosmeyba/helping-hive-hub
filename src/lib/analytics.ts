import { supabase } from "@/integrations/supabase/client";

export async function trackEvent(
  action: string,
  metadata?: Record<string, unknown>
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("activity_logs").insert([{
      user_id: user?.id ?? null,
      action,
      entity_type: "onboarding",
      details: metadata ?? {},
    }]);
  } catch {
    // Silent fail — analytics should never block UX
  }
}
