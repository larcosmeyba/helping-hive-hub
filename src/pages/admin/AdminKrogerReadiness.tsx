import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, RefreshCw, CheckCircle2, AlertCircle, Download,
  Users, ShoppingBag, Package, Percent, DollarSign, PiggyBank,
  Database, AlertTriangle, Activity, Clock,
} from "lucide-react";

interface SampleRow {
  ingredient_name: string;
  status: "matched" | "no_match";
  matched_name?: string | null;
  brand?: string | null;
  size?: string | null;
  unit_price?: number | null;
}

interface Readiness {
  environment: "certification" | "production";
  apiStatus: "ok" | "error";
  apiError: string | null;
  connectedUsers: number;
  groceryListsGenerated: number;
  totalMatches: number;
  matchedCount: number;
  unmatchedCount: number;
  matchRate: number;
  cacheHits: number;
  cacheHitRate: number;
  avgGroceryListTotal: number;
  avgBudget: number;
  avgBudgetSavings: number;
  lastSuccessfulSync: string | null;
  sampleReport: {
    generatedAt: string | null;
    locationId: string | null;
    matched: SampleRow[];
    needsReview: SampleRow[];
    estimatedTotal: number;
    weeklyBudget: number | null;
    remaining: number | null;
  };
}

function csvEscape(v: unknown): string {
  const s = v === null || v === undefined ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows.map((r) => r.map(csvEscape).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const StatCard = ({
  label, value, icon: Icon, hint, tone = "default",
}: {
  label: string; value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) => {
  const toneClass =
    tone === "good" ? "text-[#1F5A3D]" :
    tone === "warn" ? "text-[#B8860B]" :
    tone === "bad" ? "text-destructive" : "text-[#1a1a1a]";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <div className={`text-2xl font-bold mt-1 ${toneClass}`}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-0.5">{hint}</div>}
    </Card>
  );
};

const DEMO_STEPS: Array<{ title: string; body: string }> = [
  { title: "1. Enter weekly grocery budget",
    body: "From Settings or onboarding the user sets a weekly grocery budget (e.g. $120)." },
  { title: "2. Connect Kroger & pick home store",
    body: "User completes Kroger OAuth and selects their home Kroger store by ZIP. We store only the chosen locationId on their profile." },
  { title: "3. Generate a meal plan",
    body: "AI plans 6 days of batch-cookable meals scoped to the user's household, allergies, and budget." },
  { title: "4. Grocery list is created",
    body: "Server-side aggregation of plan ingredients produces a categorized grocery list." },
  { title: "5. Kroger products are matched",
    body: "Each grocery item is searched against Kroger's Products API for the home store, with a 24h cache and fuzzy fallback." },
  { title: "6. Estimated Kroger total is calculated",
    body: "We sum unit prices returned by Kroger for matched items only. No competitor pricing is shown anywhere." },
  { title: "7. Under or over budget",
    body: "We compare the estimate to the user's weekly budget and display remaining or over-budget amount. Unmatched items are surfaced as Needs Review." },
];

export default function AdminKrogerReadiness() {
  const [data, setData] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = async () => {
    setLoading(true); setErr(null);
    const { data, error } = await supabase.functions.invoke("kroger-production-readiness", { body: {} });
    if (error) setErr(error.message);
    else setData(data as Readiness);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const exportReport = () => {
    if (!data) return;
    const s = data.sampleReport;
    const rows: string[][] = [];
    rows.push(["Kroger Production Readiness — Sample Grocery Report"]);
    rows.push(["Environment", data.environment]);
    rows.push(["Generated At", s.generatedAt ?? ""]);
    rows.push(["Store Location ID", s.locationId ?? ""]);
    rows.push([]);
    rows.push(["Section", "Matched Kroger Products"]);
    rows.push(["Ingredient", "Matched Product", "Brand", "Size", "Unit Price ($)"]);
    for (const m of s.matched) {
      rows.push([m.ingredient_name, m.matched_name ?? "", m.brand ?? "",
        m.size ?? "", m.unit_price != null ? Number(m.unit_price).toFixed(2) : ""]);
    }
    rows.push([]);
    rows.push(["Estimated Kroger Total ($)", s.estimatedTotal.toFixed(2)]);
    rows.push(["Weekly Budget ($)", s.weeklyBudget != null ? s.weeklyBudget.toFixed(2) : "n/a"]);
    rows.push(["Remaining vs Budget ($)", s.remaining != null ? s.remaining.toFixed(2) : "n/a"]);
    rows.push([]);
    rows.push(["Section", "Needs Review (Unmatched)"]);
    rows.push(["Ingredient"]);
    for (const n of s.needsReview) rows.push([n.ingredient_name]);
    rows.push([]);
    rows.push(["Aggregate Metrics"]);
    rows.push(["Connected Users", String(data.connectedUsers)]);
    rows.push(["Grocery Lists Generated", String(data.groceryListsGenerated)]);
    rows.push(["Total Kroger Matches", String(data.totalMatches)]);
    rows.push(["Match Rate %", String(data.matchRate)]);
    rows.push(["Cache Hit Rate %", String(data.cacheHitRate)]);
    rows.push(["Unmatched Items", String(data.unmatchedCount)]);
    rows.push(["Avg Grocery List Total ($)", data.avgGroceryListTotal.toFixed(2)]);
    rows.push(["Avg Weekly Budget ($)", data.avgBudget.toFixed(2)]);
    rows.push(["Avg Budget Savings ($)", data.avgBudgetSavings.toFixed(2)]);
    downloadCsv(`kroger-readiness-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kroger Production Readiness</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Live evidence package supporting our Kroger Production API application.
            Demonstrates legitimate use of Kroger Products and Locations data only —
            no competitor pricing, no scraping.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh</span>
          </Button>
          <Button onClick={exportReport} disabled={!data}>
            <Download className="h-4 w-4 mr-2" /> Export sample report
          </Button>
        </div>
      </div>

      {err && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {err}
        </div>
      )}

      {!data ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        <>
          <div className="flex items-center gap-3">
            <Badge variant={data.environment === "production" ? "default" : "secondary"}>
              {data.environment.toUpperCase()}
            </Badge>
            <div className="flex items-center gap-1.5 text-sm">
              {data.apiStatus === "ok" ? (
                <><CheckCircle2 className="h-4 w-4 text-green-600" /> API uptime: OK</>
              ) : (
                <><AlertCircle className="h-4 w-4 text-destructive" /> API down: {data.apiError}</>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <StatCard label="Connected Kroger users" value={data.connectedUsers} icon={Users} />
            <StatCard label="Grocery lists generated" value={data.groceryListsGenerated} icon={ShoppingBag} />
            <StatCard label="Total Kroger product matches" value={data.totalMatches} icon={Package} />
            <StatCard label="Match rate"
              value={`${data.matchRate}%`}
              hint={`${data.matchedCount} matched / ${data.matchedCount + data.unmatchedCount} attempts`}
              icon={Percent}
              tone={data.matchRate >= 70 ? "good" : data.matchRate >= 40 ? "warn" : "bad"}
            />
            <StatCard label="Avg grocery list total"
              value={`$${data.avgGroceryListTotal.toFixed(2)}`} icon={DollarSign}
            />
            <StatCard label="Avg budget savings"
              value={`$${data.avgBudgetSavings.toFixed(2)}`}
              hint={`Avg budget $${data.avgBudget.toFixed(2)} – avg list $${data.avgGroceryListTotal.toFixed(2)}`}
              icon={PiggyBank}
              tone={data.avgBudgetSavings >= 0 ? "good" : "bad"}
            />
            <StatCard label="Cache hit rate"
              value={`${data.cacheHitRate}%`}
              hint={`${data.cacheHits} cached responses`}
              icon={Database}
            />
            <StatCard label="Unmatched items"
              value={data.unmatchedCount} icon={AlertTriangle}
              tone={data.unmatchedCount === 0 ? "good" : "warn"}
            />
            <StatCard label="API uptime status"
              value={data.apiStatus === "ok" ? "Healthy" : "Error"}
              icon={Activity}
              tone={data.apiStatus === "ok" ? "good" : "bad"}
            />
            <StatCard label="Last successful Kroger sync"
              value={data.lastSuccessfulSync
                ? new Date(data.lastSuccessfulSync).toLocaleString() : "—"}
              icon={Clock}
            />
          </div>

          {/* Sample report */}
          <Card className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-lg">Sample grocery report</h2>
                <p className="text-xs text-muted-foreground">
                  Most recent real grocery list matched against Kroger products at store{" "}
                  <span className="font-mono">{data.sampleReport.locationId ?? "—"}</span>.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={exportReport}>
                <Download className="h-3 w-3 mr-1" /> CSV
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Estimated Kroger total</div>
                <div className="text-xl font-bold">${data.sampleReport.estimatedTotal.toFixed(2)}</div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Weekly budget</div>
                <div className="text-xl font-bold">
                  {data.sampleReport.weeklyBudget != null
                    ? `$${data.sampleReport.weeklyBudget.toFixed(2)}` : "—"}
                </div>
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <div className="text-xs text-muted-foreground">Remaining</div>
                <div className={`text-xl font-bold ${
                  data.sampleReport.remaining != null && data.sampleReport.remaining < 0
                    ? "text-destructive" : "text-[#1F5A3D]"
                }`}>
                  {data.sampleReport.remaining != null
                    ? `$${data.sampleReport.remaining.toFixed(2)}` : "—"}
                </div>
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-muted-foreground mb-1">
                Matched Kroger products ({data.sampleReport.matched.length})
              </div>
              <div className="rounded-lg border divide-y max-h-72 overflow-auto">
                {data.sampleReport.matched.length === 0 && (
                  <div className="p-3 text-sm text-muted-foreground">No matched items yet.</div>
                )}
                {data.sampleReport.matched.map((m, i) => (
                  <div key={i} className="p-2 flex items-center gap-2 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="font-medium truncate">{m.matched_name ?? m.ingredient_name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {[m.brand, m.size].filter(Boolean).join(" · ") || m.ingredient_name}
                      </div>
                    </div>
                    <div className="font-semibold shrink-0">
                      {m.unit_price != null ? `$${Number(m.unit_price).toFixed(2)}` : "—"}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {data.sampleReport.needsReview.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">
                  Needs Review examples ({data.sampleReport.needsReview.length})
                </div>
                <ul className="rounded-lg border bg-[#FFF8E1] p-2 text-sm text-[#7A5A00] max-h-40 overflow-auto">
                  {data.sampleReport.needsReview.slice(0, 20).map((n, i) => (
                    <li key={i}>• {n.ingredient_name}</li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {/* Demo flow */}
          <Card className="p-4 space-y-3">
            <div>
              <h2 className="font-bold text-lg">Kroger reviewer demo flow</h2>
              <p className="text-xs text-muted-foreground">
                Walk a Kroger reviewer through these seven steps to show legitimate,
                end-to-end use of Kroger Products and Locations APIs.
              </p>
            </div>
            <ol className="space-y-2">
              {DEMO_STEPS.map((s, i) => (
                <li key={i} className="rounded-lg border p-3">
                  <div className="font-semibold text-sm">{s.title}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">{s.body}</div>
                </li>
              ))}
            </ol>
            <div className="text-xs text-muted-foreground border-t pt-2">
              This integration uses Kroger data exclusively. We do not display or store
              competitor prices and do not perform any cross-retailer comparison.
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
