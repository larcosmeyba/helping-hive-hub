import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Wallet, Plus, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Tracking {
  id: string;
  monthly_allotment: number;
  current_balance: number;
  deposit_day: number | null;
  month_start: string;
}

const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

export function SnapTracker() {
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [tracking, setTracking] = useState<Tracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [allotment, setAllotment] = useState("");
  const [depositDay, setDepositDay] = useState("");
  const [purchaseAmount, setPurchaseAmount] = useState("");
  const [purchaseStore, setPurchaseStore] = useState("");

  const load = async () => {
    if (!user) return;
    const ms = monthStart();
    const { data } = await supabase
      .from("snap_benefit_tracking")
      .select("*")
      .eq("user_id", user.id)
      .eq("month_start", ms)
      .maybeSingle();
    if (data) {
      setTracking(data as Tracking);
      setAllotment(String(data.monthly_allotment));
      setDepositDay(data.deposit_day ? String(data.deposit_day) : "");
    } else {
      // Seed from profile if available
      const seed = (profile as any)?.monthly_snap_amount ?? 0;
      const day = (profile as any)?.snap_deposit_day ?? null;
      setAllotment(seed ? String(seed) : "");
      setDepositDay(day ? String(day) : "");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const saveAllotment = async () => {
    if (!user) return;
    const amount = Number(allotment);
    const day = depositDay ? Number(depositDay) : null;
    if (!amount || amount <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    const ms = monthStart();
    const { error } = await supabase
      .from("snap_benefit_tracking")
      .upsert(
        {
          user_id: user.id,
          month_start: ms,
          monthly_allotment: amount,
          current_balance: tracking?.current_balance ?? amount,
          deposit_day: day,
        },
        { onConflict: "user_id,month_start" }
      );
    if (error) {
      toast({ title: "Could not save", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "SNAP balance updated" });
    setEditOpen(false);
    load();
  };

  const logPurchase = async () => {
    if (!user || !tracking) return;
    const amt = Number(purchaseAmount);
    if (!amt || amt <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    const { error: logError } = await supabase.from("snap_purchase_log").insert({
      user_id: user.id,
      amount_spent: amt,
      paid_with_snap: amt,
      paid_with_other: 0,
      store_name: purchaseStore || null,
    });
    if (logError) {
      toast({ title: "Could not log purchase", description: logError.message, variant: "destructive" });
      return;
    }
    const newBalance = Math.max(0, Number(tracking.current_balance) - amt);
    await supabase
      .from("snap_benefit_tracking")
      .update({ current_balance: newBalance })
      .eq("id", tracking.id);
    toast({ title: "Purchase logged", description: `$${amt.toFixed(2)} deducted from SNAP balance` });
    setPurchaseAmount("");
    setPurchaseStore("");
    setLogOpen(false);
    load();
  };

  if (loading) return null;

  const allot = tracking?.monthly_allotment ?? 0;
  const balance = tracking?.current_balance ?? 0;
  const used = Math.max(0, allot - balance);
  const pct = allot > 0 ? Math.min(100, Math.round((used / allot) * 100)) : 0;

  return (
    <div
      className="bg-card rounded-2xl border border-border p-4 md:p-5"
      style={{ boxShadow: "0px 6px 16px rgba(0,0,0,0.04)" }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-base md:text-lg font-semibold text-foreground flex items-center gap-2">
          <Wallet className="w-5 h-5 text-primary" /> SNAP Balance
        </h3>
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-xs">
              {tracking ? "Edit" : "Set up"}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>SNAP monthly allotment</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-2">
              <div>
                <Label>Monthly allotment ($)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  value={allotment}
                  onChange={(e) => setAllotment(e.target.value)}
                  placeholder="e.g. 280"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Deposit day of month (1–31)</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={31}
                  value={depositDay}
                  onChange={(e) => setDepositDay(e.target.value)}
                  placeholder="e.g. 5"
                  className="mt-1"
                />
              </div>
              <Button onClick={saveAllotment} className="w-full bg-gradient-honey text-primary-foreground">
                Save
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!tracking ? (
        <p className="text-sm text-muted-foreground">
          Track your monthly SNAP balance to see how each grocery trip affects what's left.
        </p>
      ) : (
        <>
          <div className="flex items-end justify-between mb-2">
            <div>
              <p className="text-2xl md:text-3xl font-bold text-foreground">${balance.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">of ${allot.toFixed(0)} this month</p>
            </div>
            {tracking.deposit_day && (
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <CalendarDays className="w-3 h-3" /> Refills day {tracking.deposit_day}
              </p>
            )}
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden mb-3">
            <div
              className="h-full bg-gradient-honey transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <Dialog open={logOpen} onOpenChange={setLogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Plus className="w-4 h-4" /> Log a purchase
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Log SNAP purchase</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div>
                  <Label>Amount spent ($)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    value={purchaseAmount}
                    onChange={(e) => setPurchaseAmount(e.target.value)}
                    placeholder="e.g. 42.50"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Store (optional)</Label>
                  <Input
                    value={purchaseStore}
                    onChange={(e) => setPurchaseStore(e.target.value)}
                    placeholder="e.g. Walmart"
                    className="mt-1"
                  />
                </div>
                <Button onClick={logPurchase} className="w-full bg-gradient-honey text-primary-foreground">
                  Deduct from balance
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
