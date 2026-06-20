// Internal debug screen for the grocery → Instacart pipeline.
// Shows every line as it flows: raw recipe ingredient → cleaned name →
// purchasable product → final Instacart payload. Admin-only.

import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CheckCircle2, Info } from "lucide-react";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PricingDisclaimer } from "@/components/PricingDisclaimer";
import type { GroceryItem } from "@/types/mealPlan";
import { diagnoseSanitization, sanitizeForGrocery } from "@/lib/grocerySanitizer";
import { computeGroceryRange } from "@/lib/groceryConfidence";

type Row = ReturnType<typeof diagnoseSanitization> & {
  estimatedPrice: number;
  confidence: "ok" | "watch" | "low";
  notes: string[];
};

function rowFor(item: GroceryItem): Row {
  const diag = diagnoseSanitization({
    name: item.name,
    rawQuantity: String(item.quantity ?? ""),
  });
  const estimatedPrice = Number(item.estimatedPrice ?? 0);

  const notes: string[] = [];
  if (diag.unitStripped) {
    notes.push(`Recipe-only unit stripped — Instacart now receives "${diag.product}" instead of a recipe portion.`);
  }
  if (diag.product === diag.cleaned && diag.cleaned === diag.raw.toLowerCase().trim()) {
    notes.push("No mapping rule matched — falling back to the raw name. Consider adding a PRODUCT_MAP entry.");
  }
  if (estimatedPrice > 0 && estimatedPrice < 1) {
    notes.push(`Estimate of $${estimatedPrice.toFixed(2)} is below any realistic retail price — pricing math still uses recipe portions.`);
  }
  if (/[():;]/.test(item.name) || /^\s*(salt and pepper|to taste|for serving)/i.test(item.name)) {
    notes.push("Ingredient name looks malformed — parser leaked instructions into the name.");
  }

  let confidence: Row["confidence"] = "ok";
  if (diag.unitStripped) confidence = "watch";
  if (diag.product === diag.cleaned && !diag.unitStripped) confidence = "watch";
  if (notes.some((n) => n.startsWith("Estimate of") || n.startsWith("Ingredient name"))) {
    confidence = "low";
  }

  return { ...diag, estimatedPrice, confidence, notes };
}

export default function GroceryDebugPage() {
  const { mealPlan } = useMealPlan();
  const { role, loading } = useAdminRole();

  const items = mealPlan?.groceryList ?? [];
  const rows = useMemo<Row[]>(() => items.map(rowFor), [items]);

  const sanitizedPayload = useMemo(
    () =>
      sanitizeForGrocery(
        items.map((i) => ({ name: i.name, rawQuantity: String(i.quantity ?? "") })),
      ),
    [items],
  );

  const summary = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.estimatedPrice, 0);
    const unitsStripped = rows.filter((r) => r.unitStripped).length;
    const subDollar = rows.filter((r) => r.estimatedPrice > 0 && r.estimatedPrice < 1).length;
    const lowConfidence = rows.filter((r) => r.confidence === "low").length;
    const range = computeGroceryRange(items, total, mealPlan?.pricingConfidence);
    return {
      total,
      unitsStripped,
      subDollar,
      lowConfidence,
      payloadCount: sanitizedPayload.length,
      rangeLabel: range.showRange ? `$${range.low}–$${range.high}` : `$${range.estimate.toFixed(2)}`,
    };
  }, [rows, items, sanitizedPayload, mealPlan?.pricingConfidence]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  if (!role) return <Navigate to="/dashboard/grocery-list" replace />;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <Link
        to="/dashboard/grocery-list/details"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back to grocery list
      </Link>

      <header>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Grocery → Instacart Debug
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-3xl">
          Each row shows the full pipeline: the raw recipe ingredient, the
          quantity the recipe needs, the cleaned ingredient, the purchasable
          grocery product, and the exact JSON sent to Instacart. The recipe
          display copy is never changed — only the Instacart payload is normalized.
        </p>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Raw lines" value={String(rows.length)} />
        <SummaryCard label="Instacart payload" value={String(summary.payloadCount)} />
        <SummaryCard
          label="Recipe units stripped"
          value={String(summary.unitsStripped)}
          tone={summary.unitsStripped > 0 ? "ok" : "neutral"}
        />
        <SummaryCard label="Estimate" value={summary.rangeLabel} />
        <SummaryCard
          label="Low-confidence lines"
          value={String(summary.lowConfidence)}
          tone={summary.lowConfidence > 0 ? "warn" : "ok"}
        />
      </div>

      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 flex gap-3 items-start">
        <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
        <div className="text-sm text-emerald-900 space-y-1">
          <p className="font-semibold">Payload sanitizer active</p>
          <p className="text-[13px] leading-relaxed">
            Recipe-only units (<code>tbsp</code>, <code>tsp</code>, <code>cup</code>,
            <code> clove</code>, <code>pinch</code>, <code>dash</code>, <code>slice</code>,
            <code> sprig</code>, <code>handful</code>) are stripped before the request
            reaches Instacart. Each ingredient is mapped to a purchasable grocery product
            (e.g. <em>1 tbsp olive oil</em> → <em>olive oil bottle</em>). Pricing math is
            unchanged — the low-confidence range still hides precise totals when needed.
          </p>
        </div>
      </div>

      {/* Per-line table */}
      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Raw recipe ingredient</th>
                <th className="text-left px-3 py-2 font-semibold">Recipe qty</th>
                <th className="text-left px-3 py-2 font-semibold">Normalized grocery item</th>
                <th className="text-left px-3 py-2 font-semibold">Instacart payload</th>
                <th className="text-right px-3 py-2 font-semibold">Est. $</th>
                <th className="text-left px-3 py-2 font-semibold">Confidence</th>
                <th className="text-left px-3 py-2 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                    No grocery list in memory. Generate or open a meal plan first.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={`${r.raw}-${i}`} className="align-top">
                    <td className="px-3 py-2 font-medium text-foreground">{r.raw}</td>
                    <td className="px-3 py-2 text-muted-foreground font-mono text-xs">
                      {r.rawQuantity || "—"}
                    </td>
                    <td className="px-3 py-2 text-foreground">
                      <div className="text-xs text-muted-foreground">cleaned:</div>
                      <div className="font-mono text-xs">{r.cleaned || "—"}</div>
                      <div className="text-xs text-muted-foreground mt-1">product:</div>
                      <div className="font-semibold">{r.product}</div>
                    </td>
                    <td className="px-3 py-2">
                      <code className="text-xs whitespace-nowrap">
                        {"{ "}name:&nbsp;"{r.payload.name}",&nbsp;quantity:&nbsp;{r.payload.quantity},&nbsp;unit:&nbsp;"{r.payload.unit}"{" }"}
                      </code>
                      {r.unitStripped && (
                        <div className="mt-1">
                          <Badge variant="secondary" className="text-[10px]">
                            recipe unit stripped
                          </Badge>
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      ${r.estimatedPrice.toFixed(2)}
                    </td>
                    <td className="px-3 py-2">
                      <ConfidenceBadge level={r.confidence} />
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground max-w-sm">
                      {r.notes.length === 0 ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <Info className="w-3 h-3" /> no flags
                        </span>
                      ) : (
                        <ul className="list-disc pl-4 space-y-0.5">
                          {r.notes.map((n, idx) => (
                            <li key={idx}>{n}</li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Final dedup payload preview */}
      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="font-semibold text-foreground mb-2">
          Final Instacart payload ({sanitizedPayload.length} unique products)
        </h2>
        <p className="text-xs text-muted-foreground mb-3">
          Deduplicated across all recipes by canonical product name.
        </p>
        <pre className="text-xs bg-muted/40 rounded-xl p-3 overflow-x-auto">
{JSON.stringify(
  sanitizedPayload.map((p) => ({ name: p.name, quantity: p.quantity, unit: p.unit })),
  null,
  2,
)}
        </pre>
      </section>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3 items-start">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900 space-y-1">
          <p className="font-semibold">Still pending (pricing engine)</p>
          <ul className="list-disc pl-5 space-y-0.5 text-[13px]">
            <li>Internal price = <code>cost_per_serving × household ÷ ingredient_count</code> — portion math, not retail.</li>
            <li>No brand filters, UPCs, or health filters in the payload.</li>
            <li><code>environment: "development"</code> hardcoded in the Instacart request.</li>
          </ul>
        </div>
      </div>

      <PricingDisclaimer variant="inline" className="text-xs" />
    </div>
  );
}

function SummaryCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "ok" | "warn" | "neutral";
}) {
  const toneClass =
    tone === "ok"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : tone === "warn"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-border bg-card text-foreground";
  return (
    <div className={`rounded-xl border p-3 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-wide font-semibold opacity-70">{label}</p>
      <p className="text-lg font-bold mt-0.5">{value}</p>
    </div>
  );
}

function ConfidenceBadge({ level }: { level: "ok" | "watch" | "low" }) {
  if (level === "ok") {
    return (
      <Badge variant="secondary" className="text-[10px] bg-emerald-100 text-emerald-900">
        ok
      </Badge>
    );
  }
  if (level === "watch") {
    return (
      <Badge variant="secondary" className="text-[10px] bg-amber-100 text-amber-900">
        watch
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="text-[10px]">
      low
    </Badge>
  );
}
