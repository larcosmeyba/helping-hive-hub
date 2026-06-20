import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Store, AlertTriangle, RefreshCw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { GroceryItem } from "@/types/mealPlan";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { trackEvent } from "@/lib/analytics";

interface KrogerMatch {
  ingredient_name: string;
  status: "matched" | "no_match";
  matched_name?: string;
  brand?: string | null;
  size?: string | null;
  image_url?: string | null;
  unit_price?: number;
  confidence?: number;
  availability?: string | null;
  from_cache?: boolean;
}

interface MatchResponse {
  matches: KrogerMatch[];
  totals: { matched: number; failed: number; cacheHits?: number; estimatedTotal: number };
}

export function KrogerBudgetCard({
  items,
  weeklyBudget,
}: {
  items: GroceryItem[];
  weeklyBudget?: number | null;
}) {
  const { user, profile } = useAuth();
  const livePricingEnabled = useFeatureFlag("kroger-live-pricing", true);
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MatchResponse | null>(null);

  const locationId = (profile as any)?.kroger_location_id as string | undefined;
  const storeName = (profile as any)?.kroger_store_name as string | undefined;

  const payloadItems = useMemo(
    () =>
      items.map((i) => ({
        name: i.name,
        quantity: Number(String(i.quantity).match(/[\d.]+/)?.[0] ?? 1) || 1,
      })),
    [items],
  );
  const itemsKey = useMemo(() => payloadItems.map((i) => i.name).join("|"), [payloadItems]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("kroger_user_tokens")
      .select("user_id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => setConnected(!!data));
  }, [user?.id]);

  const run = async () => {
    if (!locationId || !payloadItems.length) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("kroger-match-grocery-list", {
        body: { items: payloadItems, locationId },
      });
      if (error) throw error;
      const res = data as MatchResponse;
      setResult(res);
      void trackEvent("kroger_list_matched", {
        matched: res?.totals?.matched ?? 0,
        failed: res?.totals?.failed ?? 0,
        estimatedTotal: res?.totals?.estimatedTotal ?? 0,
      });
    } catch (e: any) {
      setError(e?.message ?? "Could not reach Kroger");
    } finally {
      setLoading(false);
    }
  };

  const retrySimpler = async () => {
    if (!locationId || !result) return;
    const unmatched = result.matches.filter((m) => m.status === "no_match");
    if (!unmatched.length) return;
    setLoading(true);
    setError(null);
    try {
      const retryItems = unmatched.map((m) => ({ name: m.ingredient_name, quantity: 1 }));
      const { data, error } = await supabase.functions.invoke("kroger-match-grocery-list", {
        body: { items: retryItems, locationId, simplify: true, skipCache: true },
      });
      if (error) throw error;
      const retry = data as MatchResponse;
      // Merge: replace previously-unmatched entries with retry results.
      const byName = new Map(retry.matches.map((m) => [m.ingredient_name, m]));
      const mergedMatches = result.matches.map((m) =>
        m.status === "no_match" && byName.has(m.ingredient_name)
          ? byName.get(m.ingredient_name)!
          : m,
      );
      const newMatched = mergedMatches.filter((m) => m.status === "matched").length;
      const newFailed = mergedMatches.filter((m) => m.status === "no_match").length;
      const newTotal = mergedMatches
        .filter((m) => m.status === "matched")
        .reduce((sum, m) => sum + (m.unit_price ?? 0), 0);
      setResult({
        matches: mergedMatches,
        totals: {
          matched: newMatched,
          failed: newFailed,
          cacheHits: result.totals.cacheHits ?? 0,
          estimatedTotal: Math.round(newTotal * 100) / 100,
        },
      });
    } catch (e: any) {
      setError(e?.message ?? "Could not retry");
    } finally {
      setLoading(false);
    }
  };

  // Auto-run once when ready
  useEffect(() => {
    if (connected && locationId && payloadItems.length && !result && !loading) {
      run();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, locationId, itemsKey]);

  if (connected === null) return null;

  if (!connected || !locationId) {
    return (
      <div className="mt-4 rounded-2xl border border-border bg-card p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Store className="h-4 w-4 text-primary" />
          <p className="text-[13px] font-bold text-[#1a1a1a]">Kroger pricing</p>
          <Badge variant="outline" className="ml-auto text-[10px]">Production</Badge>
        </div>
        <p className="text-[12px] text-[#6b6b6b]">
          {!connected
            ? "Connect your Kroger account to see live product prices for this list."
            : "Select your home Kroger store to see live prices."}
        </p>
        <Button asChild size="sm" variant="outline">
          <Link to="/dashboard/settings">
            {!connected ? "Connect Kroger" : "Choose home store"}
          </Link>
        </Button>
      </div>
    );
  }

  const total = result?.totals.estimatedTotal ?? 0;
  const matched = result?.matches.filter((m) => m.status === "matched") ?? [];
  const needsReview = result?.matches.filter((m) => m.status === "no_match") ?? [];
  const hasBudget = typeof weeklyBudget === "number" && weeklyBudget > 0;
  const remaining = hasBudget ? (weeklyBudget as number) - total : 0;
  const over = hasBudget && remaining < 0;

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card overflow-hidden">
      <div className="px-4 py-2.5 bg-[#FFF8E1] flex items-center gap-2">
        <Store className="h-4 w-4 text-[#B8860B]" />
        <p className="text-[13px] font-extrabold text-[#B8860B]">
          Kroger Budget Estimate
        </p>
        <Badge variant="outline" className="ml-auto text-[10px]">Production</Badge>
      </div>

      <div className="px-4 py-3 space-y-3">
        <p className="text-[11px] text-[#6b6b6b]">
          Store: <span className="font-medium text-[#1a1a1a]">{storeName ?? locationId}</span>
        </p>

        {loading && (
          <div className="flex items-center gap-2 text-[12px] text-[#6b6b6b]">
            <Loader2 className="h-4 w-4 animate-spin" /> Matching items to Kroger products…
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 rounded-lg bg-[#FEE2E2] p-2">
            <AlertTriangle className="h-4 w-4 text-[#B91C1C] mt-0.5" />
            <div className="flex-1">
              <p className="text-[12px] text-[#B91C1C] font-medium">{error}</p>
            </div>
            <Button size="sm" variant="ghost" onClick={run}>
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        )}

        {result && (
          <>
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-[#6b6b6b]">Kroger Subtotal</span>
              <span className="text-[18px] font-extrabold text-[#1a1a1a]">
                ${total.toFixed(2)}
              </span>
            </div>

            {hasBudget && (
              <div className="space-y-1 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[#6b6b6b]">Weekly budget</span>
                  <span className="font-semibold text-[#1a1a1a]">
                    ${(weeklyBudget as number).toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[12px]">
                  <span className="text-[#6b6b6b]">
                    {over ? "Over budget" : "Remaining"}
                  </span>
                  <span
                    className={`font-semibold ${over ? "text-[#B91C1C]" : "text-[#1F5A3D]"}`}
                  >
                    {over ? `-$${Math.abs(remaining).toFixed(2)}` : `$${remaining.toFixed(2)}`}
                  </span>
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 text-[11px] text-[#6b6b6b]">
              <CheckCircle2 className="h-3 w-3 text-[#1F5A3D]" />
              {matched.length} matched · {needsReview.length} need review
              {(result.totals.cacheHits ?? 0) > 0 && (
                <span className="text-[10px] text-[#6b6b6b]">
                  · {result.totals.cacheHits} from cache
                </span>
              )}
              <Button size="sm" variant="ghost" className="ml-auto h-7 px-2" onClick={run}>
                <RefreshCw className="h-3 w-3 mr-1" /> Refresh
              </Button>
            </div>

            {matched.length > 0 && (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {matched.slice(0, 8).map((m, idx) => (
                  <li key={`m-${idx}`} className="flex items-center gap-2 p-2">
                    {m.image_url ? (
                      <img
                        src={m.image_url}
                        alt={m.matched_name}
                        className="w-10 h-10 rounded object-cover bg-muted"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-[#1a1a1a] truncate">
                        {m.matched_name ?? m.ingredient_name}
                      </p>
                      <p className="text-[10px] text-[#6b6b6b] truncate">
                        {[m.brand, m.size].filter(Boolean).join(" · ") || m.ingredient_name}
                      </p>
                      {m.availability && (
                        <p
                          className={`text-[10px] mt-0.5 ${
                            m.availability === "HIGH" || m.availability === "LOW"
                              ? "text-[#1F5A3D]"
                              : "text-[#B91C1C]"
                          }`}
                        >
                          {m.availability.replace(/_/g, " ").toLowerCase()}
                        </p>
                      )}
                    </div>
                    <span className="text-[12px] font-semibold text-[#1a1a1a] shrink-0">
                      {typeof m.unit_price === "number" ? `$${m.unit_price.toFixed(2)}` : "—"}
                    </span>
                  </li>
                ))}
                {matched.length > 8 && (
                  <li className="p-2 text-center text-[11px] text-[#6b6b6b]">
                    + {matched.length - 8} more matched items
                  </li>
                )}
              </ul>
            )}

            {needsReview.length > 0 && (
              <div className="rounded-lg border border-[#F2D88A] bg-[#FFF8E1] p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <p className="text-[11px] font-semibold text-[#7A5A00] flex-1">
                    Needs Review · {needsReview.length}
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-[11px] border-[#B8860B] text-[#7A5A00] hover:bg-[#FFF1C2]"
                    onClick={retrySimpler}
                    disabled={loading}
                  >
                    <RefreshCw className="h-3 w-3 mr-1" /> Try simpler match
                  </Button>
                </div>
                <ul className="space-y-0.5">
                  {needsReview.slice(0, 6).map((m, idx) => (
                    <li key={`nr-${idx}`} className="text-[11px] text-[#7A5A00]">
                      • {m.ingredient_name}
                    </li>
                  ))}
                  {needsReview.length > 6 && (
                    <li className="text-[11px] text-[#7A5A00]">
                      + {needsReview.length - 6} more
                    </li>
                  )}
                </ul>
              </div>
            )}

            <p className="text-[10px] text-[#9e9e9e] leading-relaxed">
              Live Kroger pricing for planning. Final pricing and availability confirmed at checkout.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
