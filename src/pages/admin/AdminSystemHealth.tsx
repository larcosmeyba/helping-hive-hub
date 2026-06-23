import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, AlertTriangle, CheckCircle2, Mail, RefreshCw, ShoppingBag, PlayCircle, XCircle, Loader2, ShoppingCart } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Range = "24h" | "7d" | "30d";
const RANGE_HOURS: Record<Range, number> = { "24h": 24, "7d": 24 * 7, "30d": 24 * 30 };

interface LogRow {
  id: string;
  user_id: string | null;
  action: string;
  details: Record<string, unknown> | null;
  created_at: string;
}

interface EmailRow {
  message_id: string | null;
  template_name: string;
  recipient_email: string;
  status: string;
  error_message: string | null;
  created_at: string;
}

export default function AdminSystemHealth() {
  const [range, setRange] = useState<Range>("7d");
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [loading, setLoading] = useState(true);

  const since = useMemo(() => {
    const d = new Date();
    d.setHours(d.getHours() - RANGE_HOURS[range]);
    return d.toISOString();
  }, [range]);

  const load = async () => {
    setLoading(true);
    const [{ data: logRows }, { data: emailRows }] = await Promise.all([
      supabase
        .from("activity_logs")
        .select("id,user_id,action,details,created_at")
        .in("action", [
          "client_error",
          "instacart_send_clicked",
          "instacart_send_success",
          "instacart_send_error",
        ])
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500),
      supabase
        .from("email_send_log")
        .select("message_id,template_name,recipient_email,status,error_message,created_at")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);
    setLogs((logRows ?? []) as LogRow[]);
    setEmails((emailRows ?? []) as EmailRow[]);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, [range]);

  const dedupedEmails = useMemo(() => {
    const map = new Map<string, EmailRow>();
    for (const e of emails) {
      const key = e.message_id ?? `${e.template_name}-${e.recipient_email}-${e.created_at}`;
      if (!map.has(key)) map.set(key, e);
    }
    return Array.from(map.values());
  }, [emails]);

  const instacartClicks = logs.filter((l) => l.action === "instacart_send_clicked").length;
  const instacartSuccess = logs.filter((l) => l.action === "instacart_send_success").length;
  const instacartErrors = logs.filter((l) => l.action === "instacart_send_error");
  const successRate = instacartClicks
    ? Math.round((instacartSuccess / instacartClicks) * 100)
    : 100;

  const clientErrors = logs.filter((l) => l.action === "client_error");

  const emailSent = dedupedEmails.filter((e) => e.status === "sent").length;
  const emailFailed = dedupedEmails.filter((e) => ["dlq", "failed", "bounced"].includes(e.status)).length;
  const emailSuppressed = dedupedEmails.filter((e) => ["suppressed", "complained"].includes(e.status)).length;

  return (
    <div className="space-y-6 p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl md:text-3xl font-bold">System Health</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Live view of grocery checkout, runtime errors, and email delivery.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(["24h", "7d", "30d"] as Range[]).map((r) => (
            <Button
              key={r}
              size="sm"
              variant={range === r ? "default" : "outline"}
              onClick={() => setRange(r)}
            >
              {r}
            </Button>
          ))}
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<ShoppingBag className="w-4 h-4" />}
          label="Grocery checkout success rate"
          value={`${successRate}%`}
          sub={`${instacartSuccess}/${instacartClicks} sends`}
          tone={successRate >= 95 ? "good" : successRate >= 80 ? "warn" : "bad"}
        />
        <StatCard
          icon={<AlertTriangle className="w-4 h-4" />}
          label="Grocery checkout failures"
          value={instacartErrors.length}
          tone={instacartErrors.length === 0 ? "good" : "bad"}
        />
        <StatCard
          icon={<Activity className="w-4 h-4" />}
          label="Client errors"
          value={clientErrors.length}
          tone={clientErrors.length === 0 ? "good" : clientErrors.length < 5 ? "warn" : "bad"}
        />
        <StatCard
          icon={<Mail className="w-4 h-4" />}
          label="Emails delivered"
          value={emailSent}
          sub={`${emailFailed} failed · ${emailSuppressed} suppressed`}
          tone={emailFailed === 0 ? "good" : "warn"}
        />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <ShoppingBag className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Recent grocery checkout failures</CardTitle>
        </CardHeader>
        <CardContent>
          {instacartErrors.length === 0 ? (
            <EmptyState message="No grocery checkout failures in this window. Flow is healthy." />
          ) : (
            <div className="space-y-2">
              {instacartErrors.slice(0, 25).map((row) => {
                const reason = (row.details as Record<string, unknown>)?.reason ?? "unknown";
                return (
                  <LogRowItem
                    key={row.id}
                    timestamp={row.created_at}
                    title={`Reason: ${String(reason)}`}
                    subtitle={row.user_id ? `user ${row.user_id.slice(0, 8)}…` : "anonymous"}
                    badge={<Badge variant="destructive">error</Badge>}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Runtime errors</CardTitle>
        </CardHeader>
        <CardContent>
          {clientErrors.length === 0 ? (
            <EmptyState message="No runtime errors captured. App is stable." />
          ) : (
            <div className="space-y-2">
              {clientErrors.slice(0, 25).map((row) => {
                const d = (row.details ?? {}) as Record<string, unknown>;
                return (
                  <LogRowItem
                    key={row.id}
                    timestamp={row.created_at}
                    title={String(d.message ?? "Unknown error")}
                    subtitle={`${String(d.source ?? "unknown")} · ${String(d.url ?? "")}`}
                    badge={<Badge variant="destructive">{String(d.source ?? "error")}</Badge>}
                  />
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Mail className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">Email delivery (latest 50)</CardTitle>
        </CardHeader>
        <CardContent>
          {dedupedEmails.length === 0 ? (
            <EmptyState message="No emails sent in this window." />
          ) : (
            <div className="space-y-2">
              {dedupedEmails.slice(0, 50).map((e, i) => (
                <LogRowItem
                  key={`${e.message_id ?? "x"}-${i}`}
                  timestamp={e.created_at}
                  title={`${e.template_name} → ${e.recipient_email}`}
                  subtitle={e.error_message ?? ""}
                  badge={<EmailStatusBadge status={e.status} />}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  sub?: string;
  tone: "good" | "warn" | "bad";
}) {
  const toneClasses =
    tone === "good"
      ? "border-green-500/30 bg-green-500/5"
      : tone === "warn"
      ? "border-amber-500/30 bg-amber-500/5"
      : "border-destructive/40 bg-destructive/5";
  return (
    <Card className={toneClasses}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium">
          {icon}
          {label}
        </div>
        <div className="mt-2 text-2xl font-bold">{value}</div>
        {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function LogRowItem({
  timestamp,
  title,
  subtitle,
  badge,
}: {
  timestamp: string;
  title: string;
  subtitle?: string;
  badge: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-3 p-3 rounded-lg border border-border bg-card">
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-foreground truncate">{title}</p>
        {subtitle && <p className="text-xs text-muted-foreground truncate mt-0.5">{subtitle}</p>}
        <p className="text-[10px] text-muted-foreground mt-1">
          {formatDistanceToNow(new Date(timestamp), { addSuffix: true })}
        </p>
      </div>
      <div className="shrink-0">{badge}</div>
    </div>
  );
}

function EmailStatusBadge({ status }: { status: string }) {
  if (status === "sent") return <Badge className="bg-green-600 hover:bg-green-700">sent</Badge>;
  if (["dlq", "failed", "bounced"].includes(status)) return <Badge variant="destructive">{status}</Badge>;
  if (["suppressed", "complained"].includes(status))
    return <Badge className="bg-amber-500 hover:bg-amber-600 text-white">{status}</Badge>;
  return <Badge variant="outline">{status}</Badge>;
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
      <CheckCircle2 className="w-4 h-4 text-green-600" />
      {message}
    </div>
  );
}
