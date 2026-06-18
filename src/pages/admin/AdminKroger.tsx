import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";

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

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.functions.invoke("kroger-admin-status", { body: {} });
    setStatus(data as Status);
    setLoading(false);
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
    </div>
  );
}
