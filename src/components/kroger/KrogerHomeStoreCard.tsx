import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Store } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { KrogerStorePicker } from "./KrogerStorePicker";

export function KrogerHomeStoreCard() {
  const { user, profile, refreshProfile } = useAuth();
  const [saving, setSaving] = useState(false);
  const [locationId, setLocationId] = useState<string | null>(null);

  useEffect(() => {
    setLocationId((profile as any)?.kroger_location_id ?? null);
  }, [profile]);

  const save = async (store: {
    locationId: string;
    name: string;
    address?: { zipCode?: string };
  }) => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        kroger_location_id: store.locationId,
        kroger_store_name: store.name,
        kroger_store_zip: store.address?.zipCode ?? null,
      })
      .eq("user_id", user.id);
    setSaving(false);
    if (error) {
      toast({ title: "Could not save store", description: error.message, variant: "destructive" });
      return;
    }
    setLocationId(store.locationId);
    await refreshProfile();
    toast({ title: "Home Kroger saved", description: store.name });
  };

  return (
    <Card className="p-5 space-y-3 border border-slate-200/60 shadow-[0_1px_2px_rgba(15,23,42,0.04),_0_1px_3px_rgba(15,23,42,0.06)]">
      <div className="flex items-center gap-3">
        <Store className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <div className="font-semibold">Home Kroger Store</div>
          <div className="text-sm text-muted-foreground">
            Used for live product prices in your meal plan.
          </div>
        </div>
        {locationId && <Badge variant="secondary">Selected</Badge>}
      </div>
      {(profile as any)?.kroger_store_name && (
        <div className="text-sm">
          Current: <span className="font-medium">{(profile as any).kroger_store_name}</span>
        </div>
      )}
      <KrogerStorePicker selectedLocationId={locationId} onSelect={save} />
      {saving && <div className="text-xs text-muted-foreground">Saving…</div>}
    </Card>
  );
}
