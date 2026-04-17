import { useEffect, useState } from "react";
import { ShieldCheck, Download, Brain, BarChart3, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
  AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

/**
 * Privacy & Data Controls — GDPR/CCPA/Play Store-grade self-service:
 *  - Opt out of AI data usage
 *  - Opt out of analytics
 *  - Download all my data (JSON)
 *  - Immediate hard-delete of account
 */
export function PrivacyDataControls() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [dataOptIn, setDataOptIn] = useState(true);
  const [analyticsOptIn, setAnalyticsOptIn] = useState(true);
  const [busy, setBusy] = useState<"export" | "delete" | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles")
      .select("data_usage_opt_in, analytics_opt_in")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!data) return;
        setDataOptIn(data.data_usage_opt_in ?? true);
        setAnalyticsOptIn(data.analytics_opt_in ?? true);
      });
  }, [user]);

  const updateToggle = async (field: "data_usage_opt_in" | "analytics_opt_in", value: boolean) => {
    if (!user) return;
    const prev = field === "data_usage_opt_in" ? dataOptIn : analyticsOptIn;
    field === "data_usage_opt_in" ? setDataOptIn(value) : setAnalyticsOptIn(value);
    const { error } = await supabase.from("profiles").update({ [field]: value }).eq("user_id", user.id);
    if (error) {
      field === "data_usage_opt_in" ? setDataOptIn(prev) : setAnalyticsOptIn(prev);
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    } else {
      toast({ title: value ? "Enabled" : "Opted out", description: "Your preference has been saved." });
    }
  };

  const handleExport = async () => {
    if (!user) return;
    setBusy("export");
    try {
      const { data: sess } = await supabase.auth.getSession();
      const token = sess.session?.access_token;
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-user-data`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `helpthehive-data-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast({ title: "Download started", description: "Your data export is downloading." });
    } catch (e) {
      toast({ title: "Export failed", description: e instanceof Error ? e.message : "Try again later", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    if (!user) return;
    setBusy("delete");
    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) throw error;
      toast({ title: "Account deleted", description: "All your data has been permanently removed." });
      await signOut();
      navigate("/");
    } catch (e) {
      toast({ title: "Deletion failed", description: e instanceof Error ? e.message : "Please contact support", variant: "destructive" });
      setBusy(null);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-5">
      <div>
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" /> Privacy & Data Controls
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          You own your data. Manage how it's used or remove it instantly — no waiting.
        </p>
      </div>

      {/* Opt-out: AI training */}
      <div className="flex items-start justify-between gap-4 p-3 bg-muted/30 rounded-xl">
        <div className="flex items-start gap-3 flex-1">
          <Brain className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Use my data to improve recommendations</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Allow Help The Hive to use your meal preferences and feedback to improve future plans. Never shared with third parties.
            </p>
          </div>
        </div>
        <Switch checked={dataOptIn} onCheckedChange={(v) => updateToggle("data_usage_opt_in", v)} />
      </div>

      {/* Opt-out: Analytics */}
      <div className="flex items-start justify-between gap-4 p-3 bg-muted/30 rounded-xl">
        <div className="flex items-start gap-3 flex-1">
          <BarChart3 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-foreground">Anonymous usage analytics</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Help us improve the app by sharing anonymous interaction data (taps, screen views).
            </p>
          </div>
        </div>
        <Switch checked={analyticsOptIn} onCheckedChange={(v) => updateToggle("analytics_opt_in", v)} />
      </div>

      {/* Export */}
      <Button variant="outline" className="w-full" onClick={handleExport} disabled={busy !== null}>
        {busy === "export" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
        Download My Data (JSON)
      </Button>

      {/* Immediate delete */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" className="w-full" disabled={busy !== null}>
            <Trash2 className="w-4 h-4 mr-2" /> Delete My Account Immediately
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Permanently delete your account?</AlertDialogTitle>
            <AlertDialogDescription>
              This is immediate and irreversible. We will permanently remove your profile, meal plans,
              grocery lists, pantry items, feedback, and any uploaded verification documents.
              An anonymized audit record (date only) is retained for legal compliance.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
            >
              {busy === "delete" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Yes, delete everything now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <p className="text-[11px] text-muted-foreground leading-relaxed">
        Data is encrypted at rest and in transit. We never sell your information. See our{" "}
        <a href="/privacy" className="underline text-primary">Privacy Policy</a> for full details.
      </p>
    </div>
  );
}
