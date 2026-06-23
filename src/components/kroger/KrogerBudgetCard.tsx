import { useEffect, useMemo, useState } from "react";
import { Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import type { GroceryItem } from "@/types/mealPlan";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { GROCERY_PRICING_DISCLAIMER } from "@/lib/disclaimers";

interface MatchLine {
  ingredient_name: string;
  status: "matched" | "no_match" | "needs_review";
  unit_price?: number;
}

interface MatchResponse {
  matches: MatchLine[];
  totals: { matched: number; failed: number; estimatedTotal: number };
}

/**
 * Neutral budget estimate card. Internally calls the Kroger matcher (the
 * hidden pricing engine) but never shows Kroger branding, store info, or
 * per-retailer product detail. Falls back gracefully when no estimate is
 * available — the user just sees a single "Estimated total" line.
 */
export function KrogerBudgetCard({
  items,
  weeklyBudget,
}: {
  items: GroceryItem[];
  weeklyBudget?: number | null;
}) {
  const { profile } = useAuth();
  const livePricingEnabled = useFeatureFlag("kroger-live-pricing", true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [locationId, setLocationId] = useState<string | undefined>(
    (profile as any)?.kroger_location_id as string | undefined,
  );
  const zip = (profile as any)?.zip_code as string | undefined;

  // Resolve a pricing location from the user's ZIP when none is saved.
  // Kroger is a hidden pricing backend — the user never picks a store.
  useEffect(() => {
    if (locationId || !zip) return;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("kroger-locations", {
          body: { zip, radiusInMiles: 25, limit: 5 },
        });
        const first = (data?.stores ?? [])[0];
        if (!cancelled && first?.locationId) setLocationId(first.locationId);
      } catch {
        /* fall through — no estimate available */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [zip, locationId]);

  const payloadItems = useMemo(
    () => items.map((i) => ({ name: i.name, quantity: i.quantity ?? 1 })),
    [items],
  );
  const itemsKey = useMemo(() => payloadItems.map((i) => i.name).join("|"), [payloadItems]);

  const run = async () => {
    if (!locationId || !payloadItems.length) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("kroger-match-grocery-list", {
        body: { items: payloadItems, locationId },
      });
      if (error) throw error;
      setResult(data as MatchResponse);
    } catch (e: any) {
      setError(e?.message ?? "Could not load estimate");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (locationId && payloadItems.length && !result && !loading) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locationId, itemsKey]);

  if (!livePricingEnabled) return null;

  const total = result?.totals.estimatedTotal ?? 0;
  const hasBudget = typeof weeklyBudget === "number" && weeklyBudget > 0;
  const remaining = hasBudget ? (weeklyBudget as number) - total : 0;
  const over = hasBudget && remaining < 0;

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-3 bg-[hsl(43_100%_96%)]">
        <p className="text-[11px] uppercase tracking-wide text-[#6b6b6b] font-semibold">
          Estimated total
        </p>
        <p className="text-[24px] font-extrabold text-[#1a1a1a] tabular-nums leading-none mt-1">
          {result ? `$${total.toFixed(2)}` : loading ? "…" : "$—"}
        </p>
        <p className="text-[11px] text-[#6b6b6b] mt-1.5 leading-snug">
          Estimate only — final price confirmed at checkout.
        </p>
      </div>

      <div className="px-4 py-3 space-y-2">
        {loading && (
          <div className="flex items-center gap-2 text-[12px] text-[#6b6b6b]">
            <Loader2 className="h-4 w-4 animate-spin" /> Calculating estimate…
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-[#FEE2E2] p-2">
            <AlertTriangle className="h-4 w-4 text-[#B91C1C] mt-0.5" />
            <p className="text-[12px] text-[#B91C1C] font-medium flex-1">{error}</p>
            <Button size="sm" variant="ghost" onClick={run}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        )}

        {hasBudget && (
          <div className="space-y-1 pt-1">
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[#6b6b6b]">Weekly budget</span>
              <span className="font-semibold text-[#1a1a1a]">
                ${(weeklyBudget as number).toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between text-[12px]">
              <span className="text-[#6b6b6b]">{over ? "Over budget" : "Remaining"}</span>
              <span className={`font-semibold ${over ? "text-[#B91C1C]" : "text-[#1F5A3D]"}`}>
                {over ? `-$${Math.abs(remaining).toFixed(2)}` : `$${remaining.toFixed(2)}`}
              </span>
            </div>
          </div>
        )}

        <p className="text-[10px] text-[#9e9e9e] leading-relaxed pt-1">
          {GROCERY_PRICING_DISCLAIMER}
        </p>
      </div>
    </div>
  );
}
