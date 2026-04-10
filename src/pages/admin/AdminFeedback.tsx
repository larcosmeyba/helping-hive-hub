import { useEffect, useState } from "react";
import { Flag, Check, Clock, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface FeedbackRow {
  id: string;
  feedback_type: string;
  entity_type: string;
  entity_name: string;
  description: string;
  status: string;
  created_at: string;
}

interface PriceHistoryRow {
  canonical_name: string;
  default_price: number | null;
  category: string | null;
}

export default function AdminFeedbackPage() {
  const { toast } = useToast();
  const [feedback, setFeedback] = useState<FeedbackRow[]>([]);
  const [priceData, setPriceData] = useState<PriceHistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"feedback" | "prices">("feedback");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [fbRes, priceRes] = await Promise.all([
      supabase.from("user_feedback" as any).select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("canonical_products").select("canonical_name, default_price, category").order("category").limit(200),
    ]);
    if (fbRes.data) setFeedback(fbRes.data as any);
    if (priceRes.data) setPriceData(priceRes.data as PriceHistoryRow[]);
    setLoading(false);
  };

  const resolveFeedback = async (id: string) => {
    const { error } = await supabase.from("user_feedback" as any).update({ status: "resolved" }).eq("id", id);
    if (error) {
      toast({ title: "Error", variant: "destructive" });
      return;
    }
    setFeedback((prev) => prev.map((f) => (f.id === id ? { ...f, status: "resolved" } : f)));
    toast({ title: "Marked as resolved" });
  };

  const statusColor: Record<string, string> = {
    pending: "bg-yellow-500/15 text-yellow-700 border-yellow-300",
    reviewed: "bg-blue-500/15 text-blue-700 border-blue-300",
    resolved: "bg-green-500/15 text-green-700 border-green-300",
  };

  const typeLabel: Record<string, string> = {
    wrong_image: "Wrong Image",
    wrong_price: "Wrong Price",
    wrong_product: "Wrong Product",
  };

  const pricesByCategory = priceData.reduce<Record<string, PriceHistoryRow[]>>((acc, p) => {
    const cat = p.category || "Other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Feedback & Pricing</h1>
        <p className="text-muted-foreground text-sm">User reports and ingredient price tracking</p>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "feedback" ? "default" : "outline"} size="sm" onClick={() => setTab("feedback")}>
          <Flag className="w-4 h-4 mr-1" /> User Feedback ({feedback.length})
        </Button>
        <Button variant={tab === "prices" ? "default" : "outline"} size="sm" onClick={() => setTab("prices")}>
          <TrendingUp className="w-4 h-4 mr-1" /> Price Database ({priceData.length})
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-10">Loading...</p>
      ) : tab === "feedback" ? (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
          {feedback.length === 0 ? (
            <p className="text-muted-foreground text-center py-10">No feedback yet</p>
          ) : (
            <div className="divide-y divide-border">
              {feedback.map((fb) => (
                <div key={fb.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <Badge variant="outline" className={statusColor[fb.status] || ""}>
                        {fb.status}
                      </Badge>
                      <Badge variant="secondary" className="text-[10px]">
                        {typeLabel[fb.feedback_type] || fb.feedback_type}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {fb.entity_type}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{fb.entity_name}</p>
                    <p className="text-xs text-muted-foreground">{new Date(fb.created_at).toLocaleDateString()}</p>
                  </div>
                  {fb.status === "pending" && (
                    <Button variant="outline" size="sm" onClick={() => resolveFeedback(fb.id)}>
                      <Check className="w-3 h-3 mr-1" /> Resolve
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(pricesByCategory).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
            <div key={cat} className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="bg-muted/50 px-5 py-2.5 border-b border-border">
                <h3 className="font-semibold text-sm text-foreground">{cat}</h3>
              </div>
              <div className="divide-y divide-border">
                {items.map((item) => (
                  <div key={item.canonical_name} className="flex items-center gap-4 px-5 py-2.5">
                    <p className="flex-1 text-sm text-foreground">{item.canonical_name}</p>
                    <span className="text-sm font-bold text-primary">
                      {item.default_price ? `$${item.default_price.toFixed(2)}` : "—"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
