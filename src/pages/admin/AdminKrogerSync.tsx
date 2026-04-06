import { useState } from "react";
import { Search, MapPin, RefreshCw, Loader2, Package, DollarSign, Store, CheckCircle2, XCircle, Image, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";

interface KrogerLocation {
  locationId: string;
  name: string;
  chain: string;
  address: { addressLine1: string; city: string; state: string; zipCode: string };
}

interface KrogerProduct {
  productId: string;
  description: string;
  brand: string;
  upc: string;
  size: string;
  imageUrl?: string;
  price?: { regular?: number; promo?: number };
}

const COMMON_ITEMS = [
  "milk", "eggs", "bread", "chicken breast", "rice", "beans", "butter",
  "cheese", "ground beef", "pasta", "bananas", "apples", "potatoes",
  "onions", "tomatoes", "lettuce", "yogurt", "cereal", "peanut butter", "flour",
];

export default function AdminKrogerSync() {
  const { toast } = useToast();
  const [zipCode, setZipCode] = useState("45202");
  const [locations, setLocations] = useState<KrogerLocation[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<KrogerProduct[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [bulkSyncing, setBulkSyncing] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, item: "" });
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number; total: number } | null>(null);

  // Fetch sync logs
  const { data: syncLogs, refetch: refetchLogs } = useQuery({
    queryKey: ["kroger-sync-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("provider_sync_logs")
        .select("*")
        .eq("provider_name", "kroger_api")
        .order("started_at", { ascending: false })
        .limit(20);
      return data || [];
    },
  });

  const findLocations = async () => {
    if (!zipCode) return;
    setLoadingLocations(true);
    try {
      const { data, error } = await supabase.functions.invoke("kroger-sync", {
        body: { action: "find-locations", zipCode },
      });
      if (error) throw error;
      setLocations(data.locations || []);
      if (data.locations?.length) {
        setSelectedLocation(data.locations[0].locationId);
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingLocations(false);
    }
  };

  const searchProducts = async () => {
    if (!searchTerm || !selectedLocation) return;
    setLoadingSearch(true);
    try {
      const { data, error } = await supabase.functions.invoke("kroger-sync", {
        body: { action: "search-products", searchTerm, locationId: selectedLocation },
      });
      if (error) throw error;
      setSearchResults(data.products || []);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoadingSearch(false);
    }
  };

  const syncProducts = async (term: string) => {
    if (!selectedLocation) return null;
    const { data, error } = await supabase.functions.invoke("kroger-sync", {
      body: { action: "sync-products", searchTerm: term, locationId: selectedLocation, zipCode },
    });
    if (error) throw error;
    return data;
  };

  const handleSync = async () => {
    if (!searchTerm || !selectedLocation) return;
    setSyncing(true);
    try {
      const result = await syncProducts(searchTerm);
      setSyncResult(result);
      refetchLogs();
      toast({ title: "Sync complete", description: `${result.synced} products synced` });
    } catch (err: any) {
      toast({ title: "Sync failed", description: err.message, variant: "destructive" });
    } finally {
      setSyncing(false);
    }
  };

  const handleBulkSync = async () => {
    if (!selectedLocation) {
      toast({ title: "Select a store first", variant: "destructive" });
      return;
    }
    setBulkSyncing(true);
    setBulkProgress({ current: 0, total: COMMON_ITEMS.length, item: "" });
    let totalSynced = 0;
    let totalFailed = 0;

    for (let i = 0; i < COMMON_ITEMS.length; i++) {
      const item = COMMON_ITEMS[i];
      setBulkProgress({ current: i + 1, total: COMMON_ITEMS.length, item });
      try {
        const result = await syncProducts(item);
        totalSynced += result?.synced || 0;
        totalFailed += result?.failed || 0;
      } catch {
        totalFailed++;
      }
    }

    setBulkSyncing(false);
    refetchLogs();
    toast({
      title: "Bulk sync complete!",
      description: `${totalSynced} products synced, ${totalFailed} failed across ${COMMON_ITEMS.length} categories`,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-primary" /> Kroger Product Sync
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Search, preview, and sync real Kroger product data with live pricing
        </p>
      </div>

      {/* Step 1: Find Store */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <MapPin className="w-4 h-4 text-primary" /> Step 1: Find Kroger Store
        </h2>
        <div className="flex gap-2">
          <Input
            placeholder="ZIP Code"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            className="max-w-[200px]"
          />
          <Button onClick={findLocations} disabled={loadingLocations}>
            {loadingLocations ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
            Find Stores
          </Button>
        </div>
        {locations.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {locations.map((loc) => (
              <button
                key={loc.locationId}
                onClick={() => setSelectedLocation(loc.locationId)}
                className={`text-left p-3 rounded-lg border transition-all ${
                  selectedLocation === loc.locationId
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/30"
                }`}
              >
                <p className="font-medium text-sm text-foreground">{loc.name}</p>
                <p className="text-xs text-muted-foreground">
                  {loc.address.addressLine1}, {loc.address.city}, {loc.address.state} {loc.address.zipCode}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">ID: {loc.locationId} • {loc.chain}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Step 2: Search & Preview */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Search className="w-4 h-4 text-primary" /> Step 2: Search Products
        </h2>
        <div className="flex gap-2">
          <Input
            placeholder="Search products (e.g. milk, eggs, chicken)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchProducts()}
            className="flex-1"
          />
          <Button onClick={searchProducts} disabled={loadingSearch || !selectedLocation}>
            {loadingSearch ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
            Search
          </Button>
          <Button onClick={handleSync} disabled={syncing || !searchTerm || !selectedLocation} variant="secondary">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
            Sync to DB
          </Button>
        </div>

        {syncResult && (
          <div className="flex items-center gap-2 bg-accent/10 text-accent-foreground rounded-lg p-3 text-sm">
            <CheckCircle2 className="w-4 h-4 text-accent" />
            Last sync: {syncResult.synced} synced, {syncResult.failed} failed, {syncResult.total} total
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {searchResults.map((product) => (
              <div key={product.productId} className="flex items-center gap-3 p-3 rounded-lg border border-border bg-background">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.description} className="w-12 h-12 rounded-lg object-cover bg-muted" />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                    <Image className="w-5 h-5 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-foreground truncate">{product.description}</p>
                  <p className="text-xs text-muted-foreground">{product.brand} • {product.size} • UPC: {product.upc}</p>
                </div>
                <div className="text-right shrink-0">
                  {product.price?.promo && product.price.promo < (product.price.regular || 0) ? (
                    <>
                      <p className="text-xs text-muted-foreground line-through">${product.price.regular?.toFixed(2)}</p>
                      <p className="text-sm font-bold text-accent">${product.price.promo.toFixed(2)}</p>
                      <span className="text-[10px] bg-accent/20 text-accent px-1.5 py-0.5 rounded font-semibold">SALE</span>
                    </>
                  ) : product.price?.regular ? (
                    <p className="text-sm font-bold text-foreground">${product.price.regular.toFixed(2)}</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">No price</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Step 3: Bulk Sync */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" /> Step 3: Bulk Sync Common Items
        </h2>
        <p className="text-sm text-muted-foreground">
          Sync {COMMON_ITEMS.length} common grocery categories: {COMMON_ITEMS.join(", ")}
        </p>
        <Button onClick={handleBulkSync} disabled={bulkSyncing || !selectedLocation} size="lg">
          {bulkSyncing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Syncing {bulkProgress.current}/{bulkProgress.total}: {bulkProgress.item}...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" /> Bulk Sync All ({COMMON_ITEMS.length} categories)
            </>
          )}
        </Button>
        {bulkSyncing && (
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-primary h-2 rounded-full transition-all"
              style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* Sync Logs */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-4">
        <h2 className="font-semibold text-foreground flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-primary" /> Sync History
        </h2>
        {syncLogs && syncLogs.length > 0 ? (
          <div className="space-y-2 max-h-[300px] overflow-y-auto">
            {syncLogs.map((log) => (
              <div key={log.sync_log_id} className="flex items-center gap-3 text-sm p-2.5 rounded-lg border border-border bg-background">
                {log.request_status === "completed" ? (
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                ) : log.request_status === "partial" ? (
                  <CheckCircle2 className="w-4 h-4 text-yellow-500 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-foreground font-medium">{log.sync_type}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(log.started_at).toLocaleString()} • {log.records_created || 0} created • {log.records_failed || 0} failed
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                  log.request_status === "completed" ? "bg-green-500/10 text-green-600" :
                  log.request_status === "partial" ? "bg-yellow-500/10 text-yellow-600" :
                  "bg-red-500/10 text-red-600"
                }`}>
                  {log.request_status}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No sync logs yet</p>
        )}
      </div>
    </div>
  );
}
