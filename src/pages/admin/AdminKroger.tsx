import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, CheckCircle2, AlertCircle, PlayCircle, XCircle } from "lucide-react";

interface SmokeCheck {
  name: string;
  status: "pass" | "fail" | "skip";
  detail?: string;
  durationMs?: number;
}
interface SmokeResult {
  environment: string;
  baseUrl: string;
  overall: "pass" | "fail";
  ranAt: string;
  lastSuccessfulApiCall: string | null;
  checks: SmokeCheck[];
}

interface Status {
  environment: "certification" | "production";
  baseUrl?: string;
  credentials?: {
    certification: { configured: boolean };
    production: { configured: boolean };
  };
  apiStatus: "ok" | "error";
  apiError: string | null;
  appToken: { expires_at: string; scope: string } | null;
  connectedUsers: number;
  matched7d: number;
  failed7d: number;
  cacheHits7d: number;
  matchRate: number;
  lastSuccessfulMatch: string | null;
  lastLocationSync: string | null;
  lastPriceSync: string | null;
}

export default function AdminKroger() {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [smoke, setSmoke] = useState<SmokeResult | null>(null);
  const [smokeLoading, setSmokeLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke("kroger-admin-status", { body: {} });
    setStatus(data as Status);
    setLoading(false);
  };
  const runSmoke = async () => {
    setSmokeLoading(true);
    const { data, error } = await supabase.functions.invoke("kroger-smoke-test", { body: {} });
    if (error) {
      setSmoke({
        environment: status?.environment ?? "?",
        baseUrl: status?.baseUrl ?? "",
        overall: "fail",
        ranAt: new Date().toISOString(),
        lastSuccessfulApiCall: null,
        checks: [{ name: "Smoke test", status: "fail", detail: error.message }],
      });
    } else {
      setSmoke(data as SmokeResult);
    }
    setSmokeLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kroger Integration</h1>
          <p className="text-sm text-muted-foreground">
            Live status of the Kroger Certification / Production API.
          </p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          <span className="ml-2">Refresh</span>
        </Button>
      </div>

      {!status ? (
        <Loader2 className="h-6 w-6 animate-spin" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Environment</div>
              <Badge variant={status.environment === "production" ? "default" : "secondary"}>
                {status.environment.toUpperCase()}
              </Badge>
            </div>
            {status.baseUrl && (
              <div className="text-xs text-muted-foreground mt-2 font-mono break-all">{status.baseUrl}</div>
            )}
            {status.credentials && (
              <div className="mt-3 space-y-1 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Certification creds</span>
                  {status.credentials.certification.configured
                    ? <Badge variant="secondary" className="text-[10px]">Configured</Badge>
                    : <Badge variant="destructive" className="text-[10px]">Missing</Badge>}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Production creds</span>
                  {status.credentials.production.configured
                    ? <Badge variant="secondary" className="text-[10px]">Configured</Badge>
                    : <Badge variant="destructive" className="text-[10px]">Missing</Badge>}
                </div>
              </div>
            )}
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">API Status</div>
            <div className="flex items-center gap-2 mt-1">
              {status.apiStatus === "ok" ? (
                <CheckCircle2 className="h-5 w-5 text-green-600" />
              ) : (
                <AlertCircle className="h-5 w-5 text-destructive" />
              )}
              <span className="font-medium">{status.apiStatus}</span>
            </div>
            {status.apiError && <div className="text-xs text-destructive mt-1">{status.apiError}</div>}
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">App Token</div>
            <div className="font-medium">
              {status.appToken?.expires_at
                ? `Expires ${new Date(status.appToken.expires_at).toLocaleString()}`
                : "Not cached"}
            </div>
            <div className="text-xs text-muted-foreground">{status.appToken?.scope}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Connected users</div>
            <div className="text-2xl font-bold">{status.connectedUsers}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Matches (7d)</div>
            <div className="text-2xl font-bold text-green-600">{status.matched7d}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Failed matches (7d)</div>
            <div className="text-2xl font-bold text-destructive">{status.failed7d}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Match rate (7d)</div>
            <div className="text-2xl font-bold text-[#B8860B]">{status.matchRate}%</div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {status.matched7d} matched / {status.matched7d + status.failed7d} attempts
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Cached matches used (7d)</div>
            <div className="text-2xl font-bold">{status.cacheHits7d}</div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Last successful match</div>
            <div className="font-medium">
              {status.lastSuccessfulMatch
                ? new Date(status.lastSuccessfulMatch).toLocaleString()
                : "—"}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Last location sync</div>
            <div className="font-medium">
              {status.lastLocationSync ? new Date(status.lastLocationSync).toLocaleString() : "—"}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-sm text-muted-foreground">Last price sync</div>
            <div className="font-medium">
              {status.lastPriceSync ? new Date(status.lastPriceSync).toLocaleString() : "—"}
            </div>
          </Card>
        </div>
      )}

      <Card className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-lg font-semibold">Production Smoke Test</h2>
            <p className="text-sm text-muted-foreground">
              Validates OAuth, token generation, store lookup, product search, and the
              grocery-matching pipeline against the active Kroger environment.
            </p>
            <div className="flex flex-wrap gap-x-6 gap-y-1 mt-2 text-xs">
              <span><span className="text-muted-foreground">Environment:</span>{" "}
                <Badge variant={status?.environment === "production" ? "default" : "secondary"} className="text-[10px]">
                  {(smoke?.environment ?? status?.environment ?? "—").toString().toUpperCase()}
                </Badge>
              </span>
              <span className="font-mono">
                <span className="text-muted-foreground">Base URL:</span>{" "}
                {smoke?.baseUrl ?? status?.baseUrl ?? "—"}
              </span>
              <span>
                <span className="text-muted-foreground">Last successful API call:</span>{" "}
                {(smoke?.lastSuccessfulApiCall ?? status?.lastSuccessfulMatch)
                  ? new Date((smoke?.lastSuccessfulApiCall ?? status?.lastSuccessfulMatch)!).toLocaleString()
                  : "—"}
              </span>
            </div>
          </div>
          <Button onClick={runSmoke} disabled={smokeLoading}>
            {smokeLoading
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <PlayCircle className="h-4 w-4" />}
            <span className="ml-2">Run Smoke Test</span>
          </Button>
        </div>

        {smoke && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Overall:</span>
              {smoke.overall === "pass"
                ? <Badge className="bg-green-600 hover:bg-green-600">PASS</Badge>
                : <Badge variant="destructive">FAIL</Badge>}
              <span className="text-xs text-muted-foreground">
                Ran {new Date(smoke.ranAt).toLocaleString()}
              </span>
            </div>
            <div className="divide-y border rounded-md">
              {smoke.checks.map((c) => (
                <div key={c.name} className="flex items-start gap-3 p-3">
                  {c.status === "pass"
                    ? <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                    : c.status === "fail"
                      ? <XCircle className="h-5 w-5 text-destructive mt-0.5 shrink-0" />
                      : <AlertCircle className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-medium text-sm">{c.name}</div>
                      {typeof c.durationMs === "number" && (
                        <div className="text-[10px] text-muted-foreground">{c.durationMs}ms</div>
                      )}
                    </div>
                    {c.detail && (
                      <div className={`text-xs mt-0.5 break-words ${c.status === "fail" ? "text-destructive" : "text-muted-foreground"}`}>
                        {c.detail}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
