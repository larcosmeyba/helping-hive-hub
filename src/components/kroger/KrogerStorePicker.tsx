import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, MapPin, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface KrogerStore {
  locationId: string;
  name: string;
  address?: { addressLine1?: string; city?: string; state?: string; zipCode?: string };
}

interface Props {
  selectedLocationId?: string | null;
  onSelect: (store: KrogerStore) => void;
}

export function KrogerStorePicker({ selectedLocationId, onSelect }: Props) {
  const [zip, setZip] = useState("");
  const [loading, setLoading] = useState(false);
  const [stores, setStores] = useState<KrogerStore[]>([]);

  const search = async () => {
    if (!zip.trim()) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("kroger-locations", {
        body: { zip: zip.trim(), radiusInMiles: 25, limit: 15 },
      });
      if (error) throw error;
      setStores(data?.stores ?? []);
      if (!data?.stores?.length) {
        toast({ title: "No Kroger stores found near that ZIP." });
      }
    } catch (e) {
      toast({ title: "Search failed", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="ZIP code"
          value={zip}
          onChange={(e) => setZip(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          maxLength={10}
        />
        <Button onClick={search} disabled={loading || !zip.trim()}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </div>
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {stores.map((s) => {
          const selected = s.locationId === selectedLocationId;
          return (
            <Card
              key={s.locationId}
              className={`p-3 cursor-pointer flex items-start gap-3 ${selected ? "ring-2 ring-primary" : ""}`}
              onClick={() => onSelect(s)}
            >
              <MapPin className="h-4 w-4 mt-1 text-primary" />
              <div className="flex-1">
                <div className="font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">
                  {s.address?.addressLine1}, {s.address?.city}, {s.address?.state} {s.address?.zipCode}
                </div>
              </div>
              {selected && <Check className="h-4 w-4 text-primary" />}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
