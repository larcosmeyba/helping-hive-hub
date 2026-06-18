import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, RefreshCw, Download, Upload, Check, X, FileText, Image as ImageIcon,
} from "lucide-react";
import jsPDF from "jspdf";

type ScreenshotKey =
  | "connect_kroger"
  | "select_store"
  | "generate_meal_plan"
  | "grocery_review"
  | "matched_products"
  | "budget_comparison"
  | "needs_review"
  | "readiness_dashboard";

const SCREENSHOT_SLOTS: { key: ScreenshotKey; label: string; hint: string }[] = [
  { key: "connect_kroger", label: "Connect Kroger", hint: "Settings → Connect Kroger button + OAuth handoff" },
  { key: "select_store", label: "Select Home Store", hint: "ZIP search + store list + Save Home Store" },
  { key: "generate_meal_plan", label: "Generate Meal Plan", hint: "Meal plan setup screen or generated plan" },
  { key: "grocery_review", label: "Grocery Review", hint: "Aggregated grocery list view" },
  { key: "matched_products", label: "Matched Kroger Products", hint: "Matched product names, brand, size, price" },
  { key: "budget_comparison", label: "Budget Comparison", hint: "Estimated Kroger total vs weekly budget" },
  { key: "needs_review", label: "Needs Review", hint: "Unmatched items section with Try Simpler Match" },
  { key: "readiness_dashboard", label: "Kroger Readiness Dashboard", hint: "Admin → Kroger Readiness metrics" },
];

const COMPLIANCE_ITEMS = [
  { label: "OAuth 2.0 implemented for user-authorized Kroger access", ok: true },
  { label: "Pricing displayed is Kroger-only (Products API)", ok: true },
  { label: "No competitor pricing displayed anywhere in the product", ok: true },
  { label: "No retailer scraping — only official Kroger API endpoints used", ok: true },
  { label: "User-authorized access only — tokens scoped per user", ok: true },
  { label: "Home store selection required before any matching runs", ok: true },
  { label: "Match results cached for 24h to minimize Kroger API load", ok: true },
  { label: "Unmatched items surfaced honestly as Needs Review", ok: true },
];

interface Readiness {
  environment: string;
  apiStatus: "ok" | "error";
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
}

export default function AdminKrogerSubmission() {
  const [data, setData] = useState<Readiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [shots, setShots] = useState<Partial<Record<ScreenshotKey, string>>>({});
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke("kroger-production-readiness", { body: {} });
    if (data) setData(data as Readiness);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const onUpload = (key: ScreenshotKey, file: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setShots((s) => ({ ...s, [key]: reader.result as string }));
    reader.readAsDataURL(file);
  };

  const exportPdf = async () => {
    setExporting(true);
    try {
      const pdf = new jsPDF({ unit: "pt", format: "letter" });
      const W = pdf.internal.pageSize.getWidth();
      const H = pdf.internal.pageSize.getHeight();
      const M = 48;
      let y = M;

      const ensureSpace = (h: number) => {
        if (y + h > H - M) { pdf.addPage(); y = M; }
      };
      const h1 = (t: string) => {
        ensureSpace(34);
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(20);
        pdf.setTextColor(20, 20, 20);
        pdf.text(t, M, y); y += 26;
        pdf.setDrawColor(242, 178, 51); pdf.setLineWidth(2);
        pdf.line(M, y, M + 60, y); y += 14;
      };
      const h2 = (t: string) => {
        ensureSpace(26);
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(13);
        pdf.setTextColor(40, 40, 40);
        pdf.text(t, M, y); y += 18;
      };
      const para = (t: string) => {
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(10.5);
        pdf.setTextColor(60, 60, 60);
        const lines = pdf.splitTextToSize(t, W - M * 2);
        for (const ln of lines) {
          ensureSpace(14);
          pdf.text(ln, M, y); y += 14;
        }
        y += 4;
      };
      const bullet = (t: string, ok = true) => {
        pdf.setFont("helvetica", "normal"); pdf.setFontSize(10.5);
        const lines = pdf.splitTextToSize(t, W - M * 2 - 18);
        ensureSpace(14 * lines.length);
        pdf.setTextColor(ok ? 31 : 200, ok ? 90 : 40, ok ? 61 : 40);
        pdf.text(ok ? "✓" : "•", M, y);
        pdf.setTextColor(60, 60, 60);
        for (let i = 0; i < lines.length; i++) {
          pdf.text(lines[i], M + 16, y + i * 14);
        }
        y += 14 * lines.length + 2;
      };
      const kv = (k: string, v: string) => {
        ensureSpace(16);
        pdf.setFont("helvetica", "bold"); pdf.setFontSize(10.5); pdf.setTextColor(40, 40, 40);
        pdf.text(k, M, y);
        pdf.setFont("helvetica", "normal"); pdf.setTextColor(60, 60, 60);
        pdf.text(v, M + 240, y); y += 16;
      };

      // Cover
      pdf.setFillColor(242, 178, 51); pdf.rect(0, 0, W, 90, "F");
      pdf.setTextColor(26, 26, 26);
      pdf.setFont("helvetica", "bold"); pdf.setFontSize(22);
      pdf.text("Kroger Production Submission Package", M, 50);
      pdf.setFont("helvetica", "normal"); pdf.setFontSize(11);
      pdf.text("Help The Hive · helpthehive.com", M, 72);
      y = 120;
      pdf.setTextColor(60, 60, 60); pdf.setFontSize(10);
      pdf.text(`Generated ${new Date().toLocaleString()}`, M, y); y += 8;
      pdf.text(`Environment: ${data?.environment?.toUpperCase() ?? "CERTIFICATION"}`, M, y + 14); y += 28;

      // 1. Integration Overview
      h1("1. Integration Overview");
      h2("What is Help The Hive?");
      para("Help The Hive is a 100% free meal planning and grocery budgeting platform for families. We help households " +
        "plan 6 days of batch-cookable meals scoped to their household size, dietary restrictions, and weekly grocery budget, " +
        "then turn that plan into an organized grocery list.");
      h2("How Kroger data is used");
      para("With explicit user consent via Kroger OAuth, we use the Kroger Locations API to let a user pick their home Kroger store, " +
        "and the Kroger Products API to estimate the cost of their generated grocery list at that specific store. " +
        "Estimated totals are compared against the user's self-set weekly budget so they can see whether they are under or over budget " +
        "before checking out at Kroger.");
      h2("Pricing & Comparison Confirmation");
      para("All pricing shown to users comes exclusively from the Kroger Products API at the user's selected home store. " +
        "Help The Hive does not display, store, or compute any competitor pricing. " +
        "There is no cross-retailer price comparison anywhere in the product. " +
        "We do not scrape any retailer; all retailer data is obtained through official Kroger API endpoints.");

      // 2. Compliance Checklist
      h1("2. Compliance Checklist");
      for (const c of COMPLIANCE_ITEMS) bullet(c.label, c.ok);

      // 3. Metrics
      h1("3. Metrics Summary");
      if (data) {
        kv("Connected Kroger users", String(data.connectedUsers));
        kv("Grocery lists generated", String(data.groceryListsGenerated));
        kv("Total Kroger product matches", String(data.totalMatches));
        kv("Match rate", `${data.matchRate}%  (${data.matchedCount} matched / ${data.matchedCount + data.unmatchedCount} attempts)`);
        kv("Cache hit rate", `${data.cacheHitRate}%  (${data.cacheHits} cached)`);
        kv("Unmatched items", String(data.unmatchedCount));
        kv("Avg estimated grocery total", `$${data.avgGroceryListTotal.toFixed(2)}`);
        kv("Avg weekly budget", `$${data.avgBudget.toFixed(2)}`);
        kv("Avg budget savings", `$${data.avgBudgetSavings.toFixed(2)}`);
        kv("Kroger API uptime", data.apiStatus === "ok" ? "Healthy" : "Error");
        kv("Last successful Kroger sync", data.lastSuccessfulSync ? new Date(data.lastSuccessfulSync).toLocaleString() : "—");
      } else {
        para("Metrics unavailable.");
      }

      // 4. Reviewer Demo Assets (Screenshots)
      h1("4. Reviewer Demo Assets");
      para("Screenshots below walk a Kroger reviewer through the end-to-end flow.");
      for (const slot of SCREENSHOT_SLOTS) {
        const src = shots[slot.key];
        h2(slot.label);
        if (!src) {
          pdf.setFont("helvetica", "italic"); pdf.setFontSize(10);
          pdf.setTextColor(140, 140, 140);
          ensureSpace(14);
          pdf.text("[Screenshot not uploaded]", M, y); y += 18;
          continue;
        }
        try {
          const img = new Image();
          img.src = src;
          await new Promise<void>((res, rej) => { img.onload = () => res(); img.onerror = () => rej(); });
          const maxW = W - M * 2;
          const maxH = H - M - y - 20;
          let w = img.width, h = img.height;
          const ratio = Math.min(maxW / w, 420 / h, 1);
          let dw = w * ratio, dh = h * ratio;
          if (dh > maxH) { pdf.addPage(); y = M; dw = w * Math.min(maxW / w, (H - M * 2) / h); dh = h * Math.min(maxW / w, (H - M * 2) / h); }
          const fmt = src.startsWith("data:image/jpeg") ? "JPEG" : "PNG";
          pdf.addImage(src, fmt, M, y, dw, dh, undefined, "FAST");
          y += dh + 16;
        } catch {
          para("[Failed to embed screenshot]");
        }
      }

      // 5. Demo Flow
      h1("5. Reviewer Demo Flow");
      const steps = [
        "User connects their Kroger account via OAuth (Settings → Connect Kroger).",
        "User searches by ZIP and saves their home Kroger store (Locations API).",
        "User sets a weekly grocery budget and generates a 6-day meal plan.",
        "Help The Hive aggregates plan ingredients into a categorized grocery list.",
        "Each ingredient is matched against Kroger Products at the home store (24h cache + fuzzy fallback).",
        "Estimated Kroger total is summed from matched unit prices — Kroger data only.",
        "User sees remaining or over-budget amount; unmatched items are flagged as Needs Review.",
      ];
      steps.forEach((s, i) => bullet(`${i + 1}. ${s}`));

      pdf.save(`kroger-production-submission-${new Date().toISOString().slice(0, 10)}.pdf`);
    } finally {
      setExporting(false);
    }
  };

  const uploadedCount = Object.values(shots).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Kroger Production Submission</h1>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Assembles the full evidence package — overview, compliance, live metrics, and reviewer
            screenshots — into a single PDF for our Kroger Production API application.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            <span className="ml-2">Refresh metrics</span>
          </Button>
          <Button onClick={exportPdf} disabled={exporting || loading}>
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="ml-2">Export submission PDF</span>
          </Button>
        </div>
      </div>

      {/* Overview */}
      <Card className="p-5 space-y-2">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <h2 className="font-bold">Integration Overview</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          <strong>Help The Hive</strong> is a 100% free meal planning and grocery budgeting platform for families.
          With user consent via Kroger OAuth, we use the <strong>Locations API</strong> for home-store selection and
          the <strong>Products API</strong> to estimate a generated grocery list's cost at that store.
        </p>
        <ul className="text-sm space-y-1 mt-2">
          <li className="flex gap-2"><Check className="h-4 w-4 text-[#1F5A3D] shrink-0 mt-0.5" /> Pricing shown is Kroger-only, from the user's chosen home store.</li>
          <li className="flex gap-2"><X className="h-4 w-4 text-destructive shrink-0 mt-0.5" /> No competitor pricing or cross-retailer comparison anywhere in the product.</li>
          <li className="flex gap-2"><X className="h-4 w-4 text-destructive shrink-0 mt-0.5" /> No retailer scraping — official Kroger API endpoints only.</li>
        </ul>
      </Card>

      {/* Compliance */}
      <Card className="p-5 space-y-2">
        <h2 className="font-bold">Compliance Checklist</h2>
        <ul className="space-y-1.5 text-sm">
          {COMPLIANCE_ITEMS.map((c) => (
            <li key={c.label} className="flex gap-2">
              <Check className="h-4 w-4 text-[#1F5A3D] shrink-0 mt-0.5" /> {c.label}
            </li>
          ))}
        </ul>
      </Card>

      {/* Metrics */}
      <Card className="p-5 space-y-3">
        <h2 className="font-bold">Metrics Summary</h2>
        {!data ? <Loader2 className="h-4 w-4 animate-spin" /> : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
            {[
              ["Connected users", data.connectedUsers],
              ["Grocery lists generated", data.groceryListsGenerated],
              ["Match rate", `${data.matchRate}%`],
              ["Cache hit rate", `${data.cacheHitRate}%`],
              ["Avg estimated grocery total", `$${data.avgGroceryListTotal.toFixed(2)}`],
              ["Avg budget savings", `$${data.avgBudgetSavings.toFixed(2)}`],
              ["Unmatched items", data.unmatchedCount],
              ["API uptime", data.apiStatus === "ok" ? "Healthy" : "Error"],
              ["Last sync", data.lastSuccessfulSync ? new Date(data.lastSuccessfulSync).toLocaleDateString() : "—"],
            ].map(([k, v]) => (
              <div key={String(k)} className="rounded-lg border p-3">
                <div className="text-xs text-muted-foreground">{k}</div>
                <div className="text-lg font-bold mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Screenshots */}
      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold">Reviewer Demo Screenshots</h2>
            <p className="text-xs text-muted-foreground">
              Upload one screenshot per step. They embed directly into the exported PDF.
            </p>
          </div>
          <Badge variant="secondary">{uploadedCount}/{SCREENSHOT_SLOTS.length} uploaded</Badge>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {SCREENSHOT_SLOTS.map((s) => {
            const src = shots[s.key];
            return (
              <div key={s.key} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-sm">{s.label}</div>
                    <div className="text-xs text-muted-foreground">{s.hint}</div>
                  </div>
                  <div className="flex gap-1">
                    <input
                      ref={(el) => { fileRefs.current[s.key] = el; }}
                      type="file" accept="image/png,image/jpeg" className="hidden"
                      onChange={(e) => onUpload(s.key, e.target.files?.[0] ?? null)}
                    />
                    <Button size="sm" variant="outline"
                      onClick={() => fileRefs.current[s.key]?.click()}
                    >
                      <Upload className="h-3 w-3 mr-1" /> {src ? "Replace" : "Upload"}
                    </Button>
                    {src && (
                      <Button size="sm" variant="ghost"
                        onClick={() => setShots((p) => { const n = { ...p }; delete n[s.key]; return n; })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                <div className="aspect-video rounded-md bg-muted/50 overflow-hidden flex items-center justify-center">
                  {src ? (
                    <img src={src} alt={s.label} className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <ImageIcon className="h-3 w-3" /> No screenshot yet
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
