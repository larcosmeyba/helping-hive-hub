import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ResourceBackButton } from "@/components/dashboard/resources/ResourceBackButton";
import { Loader2, AlertCircle, Phone, Globe, Navigation, MapPin, ExternalLink } from "lucide-react";

interface Category { slug: string; title: string; description: string; }

interface LiveResource {
  id: string;
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  website?: string | null;
  tags?: string[];
  is_national?: boolean;
  is_link?: boolean;
  about?: string | null;
  distance_mi?: number | null;
}

export default function ResourceCategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const { profile } = useAuth();
  const [cat, setCat] = useState<Category | null>(null);
  const [results, setResults] = useState<LiveResource[]>([]);
  const [liveCount, setLiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [zipMissing, setZipMissing] = useState(false);

  const zip = (profile as { zip_code?: string } | null)?.zip_code;

  useEffect(() => {
    if (!categorySlug) return;
    setLoading(true);
    setZipMissing(false);
    (async () => {
      const { data: c } = await supabase
        .from("resource_categories")
        .select("slug,title,description")
        .eq("slug", categorySlug)
        .maybeSingle();
      setCat(c);

      if (!zip) {
        setZipMissing(true);
        setResults([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke("find-resources", {
        body: { zip, category: categorySlug },
      });
      if (error) {
        console.error("find-resources error", error);
        setResults([]);
      } else {
        setResults((data?.resources ?? []) as LiveResource[]);
        setLiveCount(data?.live_count ?? 0);
      }
      setLoading(false);
    })();
  }, [categorySlug, zip]);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <ResourceBackButton fallback="/dashboard/resources" label="Resources" />
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{cat?.title ?? "Resources"}</h1>
        {cat?.description && <p className="text-sm text-muted-foreground mt-1">{cat.description}</p>}
        {zip && !loading && (
          <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1.5">
            <MapPin className="w-3 h-3" />
            Showing results for ZIP {zip}
            {liveCount > 0 && <span className="text-primary font-semibold">• {liveCount} nearby</span>}
          </p>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : zipMissing ? (
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground">Add your ZIP code to see nearby resources</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-3">We use your ZIP to find verified support in your area.</p>
          <a href="/dashboard/settings" className="inline-block bg-primary text-primary-foreground px-4 py-2 rounded-xl text-sm font-semibold">Update ZIP</a>
        </div>
      ) : results.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground">No results yet — try these national supports</h3>
          <a href="https://www.211.org" target="_blank" rel="noopener noreferrer" className="block mt-3 bg-primary/10 hover:bg-primary/15 rounded-xl px-4 py-3 text-sm font-semibold text-primary">Call 211 — Local Help Line</a>
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((r) => <LiveCard key={r.id} r={r} />)}
        </div>
      )}
    </div>
  );
}

function LiveCard({ r }: { r: LiveResource }) {
  const fullAddress = [r.address, r.city, r.state].filter(Boolean).join(", ");
  const directionsUrl = fullAddress
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`
    : null;
  const telHref = r.phone ? `tel:${r.phone.replace(/[^\d+]/g, "")}` : null;

  return (
    <div className="bg-card rounded-2xl border border-border p-4" style={{ boxShadow: "0px 4px 12px rgba(0,0,0,0.03)" }}>
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <h3 className="text-sm font-semibold text-foreground leading-snug">{r.name}</h3>
        <div className="flex items-center gap-1 shrink-0">
          {typeof r.distance_mi === "number" && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">{r.distance_mi} mi</span>
          )}
          {r.is_national && (
            <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary/10 text-primary">National</span>
          )}
        </div>
      </div>

      {fullAddress && (
        <p className="text-xs text-muted-foreground flex items-start gap-1.5 mb-1">
          <MapPin className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{fullAddress}</span>
        </p>
      )}
      {r.about && <p className="text-xs text-muted-foreground mb-2">{r.about}</p>}

      {(r.tags ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {(r.tags ?? []).slice(0, 3).map((t) => (
            <span key={t} className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-muted text-foreground/70">{t}</span>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        {telHref && (
          <a href={telHref} className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl bg-primary/10 text-primary text-[11px] font-semibold">
            <Phone className="w-3.5 h-3.5" /> Call
          </a>
        )}
        {r.website && (
          <a href={r.website} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl bg-muted text-foreground text-[11px] font-semibold">
            {r.is_link ? <ExternalLink className="w-3.5 h-3.5" /> : <Globe className="w-3.5 h-3.5" />} {r.is_link ? "Open" : "Website"}
          </a>
        )}
        {directionsUrl && (
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl bg-muted text-foreground text-[11px] font-semibold">
            <Navigation className="w-3.5 h-3.5" /> Directions
          </a>
        )}
      </div>
    </div>
  );
}
