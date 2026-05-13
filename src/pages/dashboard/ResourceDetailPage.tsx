import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ResourceBackButton } from "@/components/dashboard/resources/ResourceBackButton";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Phone, Globe, MapPin, Clock, Bookmark, BookmarkCheck, Navigation, Loader2 } from "lucide-react";

interface Resource {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  website: string | null;
  hours: Record<string, string> | null;
  tags: string[] | null;
  about: string | null;
  eligibility: string | null;
  what_to_bring: string | null;
  image_url: string | null;
  category_slug: string;
}

export default function ResourceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [r, setR] = useState<Resource | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("resources").select("*").eq("id", id).maybeSingle();
      setR(data as Resource | null);
      if (user && data) {
        const { data: s } = await supabase
          .from("saved_resources")
          .select("id")
          .eq("user_id", user.id)
          .eq("resource_id", id)
          .maybeSingle();
        setSaved(!!s);
      }
      setLoading(false);
    })();
  }, [id, user]);

  const toggleSave = async () => {
    if (!user || !r) return;
    if (saved) {
      await supabase.from("saved_resources").delete().eq("user_id", user.id).eq("resource_id", r.id);
      setSaved(false);
      toast({ title: "Removed from saved" });
    } else {
      await supabase.from("saved_resources").insert({ user_id: user.id, resource_id: r.id });
      setSaved(true);
      toast({ title: "Saved" });
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (!r) {
    return (
      <div className="space-y-4">
        <ResourceBackButton fallback="/dashboard/resources" />
        <p className="text-sm text-muted-foreground">Resource not found.</p>
      </div>
    );
  }

  const fullAddress = [r.address, r.city, r.state, r.zip_code].filter(Boolean).join(", ");
  const directionsUrl = fullAddress
    ? `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(fullAddress)}`
    : null;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-4 pb-12">
      <ResourceBackButton fallback={`/dashboard/resources/${r.category_slug}`} />

      {r.image_url && (
        <div className="rounded-2xl overflow-hidden aspect-video bg-muted">
          <img src={r.image_url} alt={r.name} className="w-full h-full object-cover" loading="lazy" />
        </div>
      )}

      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{r.name}</h1>
        {(r.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(r.tags ?? []).map((t) => (
              <span key={t} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">{t}</span>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        {r.phone && (
          <a href={`tel:${r.phone.replace(/\D/g, "")}`} className="bg-card border border-border rounded-2xl p-3 flex flex-col items-center gap-1 text-xs font-semibold hover:border-primary/40">
            <Phone className="w-4 h-4 text-primary" /> Call
          </a>
        )}
        {r.website && (
          <a href={r.website} target="_blank" rel="noopener noreferrer" className="bg-card border border-border rounded-2xl p-3 flex flex-col items-center gap-1 text-xs font-semibold hover:border-primary/40">
            <Globe className="w-4 h-4 text-primary" /> Website
          </a>
        )}
        {directionsUrl && (
          <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="bg-card border border-border rounded-2xl p-3 flex flex-col items-center gap-1 text-xs font-semibold hover:border-primary/40">
            <Navigation className="w-4 h-4 text-primary" /> Directions
          </a>
        )}
      </div>

      {r.hours && Object.keys(r.hours).length > 0 && (
        <Section icon={<Clock className="w-4 h-4 text-primary" />} title="Hours">
          <ul className="text-sm text-foreground/80 space-y-1">
            {Object.entries(r.hours).map(([day, hrs]) => (
              <li key={day} className="flex justify-between">
                <span className="capitalize text-muted-foreground">{day}</span>
                <span>{hrs}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {fullAddress && (
        <Section icon={<MapPin className="w-4 h-4 text-primary" />} title="Address">
          <p className="text-sm text-foreground/80">{fullAddress}</p>
        </Section>
      )}

      {r.about && <Section title="About"><p className="text-sm text-foreground/80 leading-relaxed">{r.about}</p></Section>}
      {r.eligibility && <Section title="Eligibility"><p className="text-sm text-foreground/80 leading-relaxed">{r.eligibility}</p></Section>}
      {r.what_to_bring && <Section title="What to bring"><p className="text-sm text-foreground/80 leading-relaxed">{r.what_to_bring}</p></Section>}

      <Button
        onClick={toggleSave}
        variant={saved ? "outline" : "default"}
        className="w-full h-12 text-sm font-semibold"
      >
        {saved ? <><BookmarkCheck className="w-4 h-4 mr-2" /> Saved</> : <><Bookmark className="w-4 h-4 mr-2" /> Save Resource</>}
      </Button>
    </div>
  );
}

function Section({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">{icon}{title}</h3>
      {children}
    </div>
  );
}
