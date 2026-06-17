import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ShoppingBag, Link2, Link2Off, Loader2 } from "lucide-react";

interface ConnectionRow {
  environment: string;
  expires_at: string;
  connected_at: string;
}

export function KrogerConnectionCard() {
  const { user } = useAuth();
  const [conn, setConn] = useState<ConnectionRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("kroger_user_tokens")
      .select("environment, expires_at, connected_at")
      .eq("user_id", user.id)
      .maybeSingle();
    setConn(data as ConnectionRow | null);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const url = new URL(window.location.href);
    const status = url.searchParams.get("kroger");
    if (status === "connected") {
      toast({ title: "Kroger connected", description: "Your account is linked." });
    } else if (status && status !== "connected") {
      toast({ title: "Kroger connection failed", description: status, variant: "destructive" });
    }
    if (status) {
      url.searchParams.delete("kroger");
      window.history.replaceState({}, "", url.toString());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const connect = async () => {
    setWorking(true);
    try {
      const { data, error } = await supabase.functions.invoke("kroger-oauth-start", {
        body: { redirectAfter: "/dashboard/settings" },
      });
      if (error || !data?.authorizeUrl) throw error ?? new Error("No URL");
      window.location.href = data.authorizeUrl;
    } catch (e) {
      toast({ title: "Could not start Kroger sign-in", description: String(e), variant: "destructive" });
      setWorking(false);
    }
  };

  const disconnect = async () => {
    setWorking(true);
    try {
      await supabase.functions.invoke("kroger-oauth-disconnect", { body: {} });
      setConn(null);
      toast({ title: "Kroger disconnected" });
    } finally {
      setWorking(false);
    }
  };

  return (
    <Card className="p-5 space-y-3">
      <div className="flex items-center gap-3">
        <ShoppingBag className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <div className="font-semibold">Kroger Account</div>
          <div className="text-sm text-muted-foreground">
            Connect Kroger to pull live product info and prices into your meal plan.
          </div>
        </div>
        {conn && <Badge variant="secondary">Connected</Badge>}
      </div>
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      ) : conn ? (
        <Button variant="outline" onClick={disconnect} disabled={working}>
          <Link2Off className="mr-2 h-4 w-4" /> Disconnect
        </Button>
      ) : (
        <Button onClick={connect} disabled={working}>
          <Link2 className="mr-2 h-4 w-4" /> Connect Kroger
        </Button>
      )}
    </Card>
  );
}
