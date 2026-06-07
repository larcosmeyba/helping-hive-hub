// Internal debug screen for the grocery pricing pipeline.
// Renders every grocery line with the parsed Instacart payload + variance signals
// so we can diagnose the ~$131 → ~$756 Instacart cart gap without rewriting
// the pricing engine. Admin-only.
//
// Per the audit, the three known inflation sources are:
//   1. Recipe-unit strings (tbsp, cup, tsp, clove) sent verbatim to Instacart.
//   2. Internal price = cost_per_serving × hh ÷ ingredient_count (portion math).
//   3. No brand/UPC/health filters on the Instacart payload.
//
// This page surfaces those signals per line.

import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, Info } from "lucide-react";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { InstacartDisclaimer } from "@/components/InstacartDisclaimer";
import type { GroceryItem } from "@/types/mealPlan";

// Recipe-measurement units that Instacart's products_link endpoint does NOT
// reliably map to retail packages. When these reach Instacart, the matcher
// commonly returns 1 full retail unit per `quantity`, inflating the cart.
const RISKY_UNITS = new Set([
  "tbsp", "tablespoon", "tablespoons",
  "tsp", "teaspoon", "teaspoons",
  "cup", "cups",
  "clove", "cloves",
  "pinch", "pinches",
  "dash", "dashes",
  "slice", "slices",
  "inch", "inches",
  "large", "medium", "small",
  "stick", "sticks",
]);

// Retail-friendly units that Instacart resolves to a real package size.
const SAFE_UNITS = new Set([
  "lb", "lbs", "pound", "pounds",
  "oz", "ounce", "ounces",
  "gallon", "gallons",
  "quart", "quarts",
  "pint", "pints",
  "dozen",
  "package", "packages", "pkg",
  "can", "cans",
  "bottle", "bottles",
  "bag", "bags",
  "jar", "jars",
  "box", "boxes",
  "loaf", "loaves",
  "each",
]);

type LineDiagnostic = {
  name: string;
  rawQuantity: string;
  instacartName: string;
  instacartQty: number;
  instacartUnit: string;
  estimatedPrice: number;
  unitRisk: "safe" | "risky" | "unknown";
  notes: string[];
};

function diagnose(item: GroceryItem): LineDiagnostic {
  const rawQty = String(item.quantity ?? "").trim();
  const numMatch = rawQty.match(/[\d.]+/);
  const instacartQty = numMatch ? Number(numMatch[0]) || 1 : 1;
  const unitPart = rawQty.replace(/[\d./\s]+/g, "").trim().toLowerCase();
  const instacartUnit = unitPart || "each";
  const estimatedPrice = Number(item.estimatedPrice ?? 0);

  const notes: string[] = [];
  let unitRisk: "safe" | "risky" | "unknown" = "unknown";
  if (SAFE_UNITS.has(instacartUnit)) unitRisk = "safe";
  else if (RISKY_UNITS.has(instacartUnit)) unitRisk = "risky";

  if (unitRisk === "risky") {
    notes.push(
      `Instacart receives quantity=${instacartQty}, unit="${instacartUnit}" — likely interpreted as ${instacartQty} full retail unit${instacartQty === 1 ? "" : "s"}.`,
    );
  }
  if (estimatedPrice > 0 && estimatedPrice < 1) {
    notes.push(
      `Estimate of $${estimatedPrice.toFixed(2)} is below any realistic retail unit price — this is a recipe-portion fraction, not a product price.`,
    );
  }
  if (/[():;]/.test(item.name) || /^\s*(salt|pepper|garnish|to taste)/i.test(item.name)) {
    notes.push("Ingredient name looks malformed — parser leaked units or instructions into the name.");
  }
  if (!item.brand) {
    notes.push("No brand filter sent — Instacart's matcher may pick a premium SKU.");
  }
  return {
    name: item.name,
    rawQuantity: rawQty || "(none)",
    instacartName: item.name,
    instacartQty,
    instacartUnit,
    estimatedPrice,
    unitRisk,
    notes,
  };
}

export default function GroceryDebugPage() {
  const { mealPlan } = useMealPlan();
  const { role, loading } = useAdminRole();

  const rows = useMemo<LineDiagnostic[]>(
    () => (mealPlan?.groceryList ?? []).map(diagnose),
    [mealPlan?.groceryList],
  );

  const summary = useMemo(() => {
    const total = rows.reduce((s, r) => s + r.estimatedPrice, 0);
    const risky = rows.filter((r) => r.unitRisk === "risky").length;
    const safe = rows.filter((r) => r.unitRisk === "safe").length;
    const unknown = rows.filter((r) => r.unitRisk === "unknown").length;
    const subDollar = rows.filter((r) => r.estimatedPrice > 0 && r.estimatedPrice < 1).length;
    return { total, risky, safe, unknown, subDollar };
  }, [rows]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!role) {
    return <Navigate to="/dashboard/grocery-list" replace />;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
      <Link
        to="/dashboard/grocery-list/details"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="w-4 h-4" /> Back to grocery list
      </Link>

      <header>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Grocery Pricing Debug
        </h1>
        <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
          Per-line view of what Help The Hive shows vs. what's being sent to Instacart. Use this
          to diagnose the gap between the internal estimate and the actual Instacart cart total.
        </p>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <SummaryCard label="Items" value={String(rows.length)} />
        <SummaryCard label="Internal estimate" value={`$${summary.total.toFixed(2)}`} />
        <SummaryCard
          label="Risky units"
          value={String(summary.risky)}
          tone={summary.risky > 0 ? "warn" : "ok"}
        />
        <SummaryCard label="Safe units" value={String(summary.safe)} tone="ok" />
        <SummaryCard
          label="Sub-$1 lines"
          value={String(summary.subDollar)}
          tone={summary.subDollar > 0 ? "warn" : "ok"}
        />
      </div>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 flex gap-3 items-start">
        <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-900 space-y-1">
          <p className="font-semibold">Known pricing engine bugs (audit confirmed)</p>
          <ul className="list-disc pl-5 space-y-0.5 text-[13px]">
            <li>
              Recipe units (<code>tbsp</code>, <code>cup</code>, <code>tsp</code>, <code>clove</code>)
              are sent verbatim to Instacart and treated as full retail units.
            </li>
            <li>
              Internal price = <code>cost_per_serving × household ÷ ingredient_count</code> — that's
              a portion fraction, not a retail product price.
            </li>
            <li>
              No brand filters, UPCs, or health filters in the payload — premium SKUs are picked by default.
            </li>
            <li>
              <code>environment: "development"</code> is hardcoded in the Instacart payload.
            </li>
          </ul>
        </div>
      </div>

      {/* Per-line table */}
      <div className="rounded-2xl border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/60 text-muted-foreground text-xs uppercase tracking-wide">
              <tr>
                <th className="text-left px-3 py-2 font-semibold">Ingredient</th>
                <th className="text-left px-3 py-2 font-semibold">Raw qty (DB)</th>
                <th className="text-left px-3 py-2 font-semibold">→ Instacart payload</th>
                <th className="text-right px-3 py-2 font-semibold">Est. price</th>
                <th className="text-left px-3 py-2 font-semibold">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                    No grocery list in memory. Generate or open a meal plan first.
                  </td>
                </tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={`${r.name}-${i}`} className="align-top">
                    <td className="px-3 py-2 font-medium text-foreground">{r.name}</td>
                    <td className="px-3 py-2 text-muted-foreground font-mono text-xs">
                      {r.rawQuantity}
                    </td>
                    <td className="px-3 py-2">
                      <code className="text-xs">
                        {"{ "}name: "{r.instacartName}", quantity: {r.instacartQty}, unit: "
                        {r.instacartUnit}"{" }"}
                      </code>
                      <div className="mt-1">
                        {r.unitRisk === "risky" && (
                          <Badge variant="destructive" className="text-[10px]">
                            risky unit
                          </Badge>
                        )}
                        {r.unitRisk === "safe" && (
                          <Badge variant="secondary" className="text-[10px]">
                            safe unit
                          </Badge>
                        )}
                        {r.unitRisk === "unknown" && (
                          <Badge variant="outline" className="text-[10px]">
                            unknown unit
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right font-mono">
                      ${r.estimatedPrice.toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">
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

      <InstacartDisclaimer variant="block" className="text-xs" />
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
