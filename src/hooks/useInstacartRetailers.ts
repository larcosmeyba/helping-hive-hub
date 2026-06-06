import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface InstacartRetailer {
  retailer_key: string;
  name: string;
  retailer_logo_url?: string | null;
  distance?: number | null;
}

interface State {
  retailers: InstacartRetailer[];
  loading: boolean;
  error: string | null;
}

const cache = new Map<string, InstacartRetailer[]>();

/**
 * Fetches the Instacart-supported retailers for a given US ZIP code.
 * Never returns a hardcoded fallback — UI must handle empty/loading/error.
 */
export function useInstacartRetailers(zip: string | null | undefined): State {
  const [state, setState] = useState<State>({ retailers: [], loading: false, error: null });

  useEffect(() => {
    const clean = (zip ?? "").trim();
    if (!/^\d{5}$/.test(clean)) {
      setState({ retailers: [], loading: false, error: null });
      return;
    }
    if (cache.has(clean)) {
      setState({ retailers: cache.get(clean)!, loading: false, error: null });
      return;
    }
    let cancelled = false;
    setState({ retailers: [], loading: true, error: null });
    (async () => {
      try {
        const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID as string;
        const { data: { session } } = await supabase.auth.getSession();
        const url = `https://${projectId}.supabase.co/functions/v1/instacart-retailers?postal_code=${clean}&country_code=US`;
        const res = await fetch(url, {
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
        });
        const body = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setState({ retailers: [], loading: false, error: body?.error ?? "Unable to load stores right now. Please try again." });
          return;
        }
        const list: InstacartRetailer[] = Array.isArray(body?.retailers) ? body.retailers : [];
        // Function returns 200 with an error message when no retailers are
        // available or when the upstream call failed (fallback=true).
        const msg = typeof body?.error === "string" ? body.error : null;
        if (list.length === 0 && msg) {
          setState({ retailers: [], loading: false, error: msg });
          return;
        }
        cache.set(clean, list);
        setState({ retailers: list, loading: false, error: null });
      } catch (e) {
        if (cancelled) return;
        setState({ retailers: [], loading: false, error: (e as Error).message });
      }
    })();
    return () => { cancelled = true; };
  }, [zip]);

  return state;
}
