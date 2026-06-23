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
 * a Kroger store. Pricing is resolved server-side from the user's ZIP.
 *
 * This hook is retained as a no-op shim so existing callers compile and
 * always pass through their "ready" gates. `connect()` is a no-op.
 */
export function useKrogerConnection(): KrogerConnectionState {
  const { profile } = useAuth();
  const locationId = (profile as any)?.kroger_location_id as string | undefined;
  return {
    loading: false,
    connected: true,
    hasHomeStore: true,
    ready: true,
    locationId,
    storeName: undefined,
    connect: async () => {},
    refresh: () => {},
  };
}
