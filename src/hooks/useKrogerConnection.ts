import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

export interface KrogerConnectionState {
  loading: boolean;
  connected: boolean;
  hasHomeStore: boolean;
  /** True only when both a Kroger account is linked AND a home store is saved. */
  ready: boolean;
  locationId?: string;
  storeName?: string;
  connect: (redirectAfter?: string) => Promise<void>;
  refresh: () => void;
}

/**
 * Centralized Kroger connection status used by user-facing pricing UI.
 * Pricing should only ever be displayed when `ready === true`.
 */
export function useKrogerConnection(): KrogerConnectionState {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  const locationId = (profile as any)?.kroger_location_id as string | undefined;
  const storeName = (profile as any)?.kroger_store_name as string | undefined;

  useEffect(() => {
    if (!user) {
      setConnected(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    supabase
      .from("kroger_user_tokens")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setConnected(!!data);
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id, tick]);

  const connect = async (redirectAfter?: string) => {
    void trackEvent("kroger_connect_started", { source: "hook" });
    try {
      const { data, error } = await supabase.functions.invoke("kroger-oauth-start", {
        body: {
          redirectAfter:
            redirectAfter ?? window.location.pathname + window.location.search,
        },
      });
      if (error || !data?.authorizeUrl) throw error ?? new Error("No authorize URL");
      window.location.href = data.authorizeUrl;
    } catch (e: any) {
      void trackEvent("kroger_connect_failed", { source: "hook", reason: e?.message ?? String(e) });
      toast({
        title: "Could not start Kroger sign-in",
        description: e?.message ?? String(e),
        variant: "destructive",
      });
    }
  };

  return {
    loading,
    connected,
    hasHomeStore: !!locationId,
    ready: connected && !!locationId,
    locationId,
    storeName,
    connect,
    refresh: () => setTick((t) => t + 1),
  };
}
