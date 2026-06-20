import { useEffect, useState } from "react";
import { phIsFeatureEnabled, isPostHogReady, posthog } from "@/lib/posthog";

/**
 * Read a PostHog feature flag with a safe default while flags are loading
 * or when PostHog is not initialized (preview builds without keys).
 */
export function useFeatureFlag(flag: string, defaultValue = false): boolean {
  const [value, setValue] = useState<boolean>(() => {
    if (!isPostHogReady()) return defaultValue;
    const v = phIsFeatureEnabled(flag);
    return typeof v === "boolean" ? v : defaultValue;
  });

  useEffect(() => {
    if (!isPostHogReady()) return;
    const update = () => {
      const v = phIsFeatureEnabled(flag);
      setValue(typeof v === "boolean" ? v : defaultValue);
    };
    update();
    try {
      const unsub = posthog.onFeatureFlags(update);
      return () => {
        try { unsub?.(); } catch { /* */ }
      };
    } catch {
      /* */
    }
  }, [flag, defaultValue]);

  return value;
}
