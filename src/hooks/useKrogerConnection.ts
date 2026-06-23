import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface KrogerConnectionState {
  loading: boolean;
  connected: boolean;
  hasHomeStore: boolean;
  ready: boolean;
  locationId?: string;
  storeName?: string;
  connect: (redirectAfter?: string) => Promise<void>;
  refresh: () => void;
}

/**
 * Kroger is now a HIDDEN pricing backend. Users never connect, see, or pick
 * a Kroger store. This hook resolves a pricing locationId automatically:
 *   1. profile.kroger_location_id when present (legacy)
 *   2. nearest Kroger to profile.zip_code (via kroger-locations)
 *
 * `ready` is true once we have any locationId (or while we attempt to
 * resolve one). `connect()` is a no-op so existing callers compile.
 */
export function useKrogerConnection(): KrogerConnectionState {
  const { profile } = useAuth();
  const savedLocation = (profile as any)?.kroger_location_id as string | undefined;
  const zip = (profile as any)?.zip_code as string | undefined;

  const [resolved, setResolved] = useState<string | undefined>(savedLocation);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (savedLocation) {
      setResolved(savedLocation);
      return;
    }
    if (!zip) return;
    let cancelled = false;
    setLoading(true);
    supabase.functions
      .invoke("kroger-locations", { body: { zip, radiusInMiles: 25, limit: 5 } })
      .then(({ data }) => {
        if (cancelled) return;
        const first = (data?.stores ?? [])[0];
        if (first?.locationId) setResolved(first.locationId);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [savedLocation, zip]);

  const locationId = resolved;
  return {
    loading,
    connected: true,
    hasHomeStore: !!locationId,
    ready: !!locationId,
    locationId,
    storeName: undefined,
    connect: async () => {},
    refresh: () => {},
  };
}
