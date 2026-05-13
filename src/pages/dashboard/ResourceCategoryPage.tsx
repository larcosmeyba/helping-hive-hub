import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ResourceBackButton } from "@/components/dashboard/resources/ResourceBackButton";
import { ResourceCard, type ResourceCardData } from "@/components/dashboard/resources/ResourceCard";
import { Loader2, AlertCircle } from "lucide-react";

interface Category {
  slug: string;
  title: string;
  description: string;
}

export default function ResourceCategoryPage() {
  const { categorySlug } = useParams<{ categorySlug: string }>();
  const { profile } = useAuth();
  const [cat, setCat] = useState<Category | null>(null);
  const [resources, setResources] = useState<ResourceCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categorySlug) return;
    setLoading(true);
    (async () => {
      const [{ data: c }, { data: rs }] = await Promise.all([
        supabase.from("resource_categories").select("slug,title,description").eq("slug", categorySlug).maybeSingle(),
        supabase
          .from("resources")
          .select("id,name,address,city,state,phone,tags,hours,is_national,zip_code")
          .eq("category_slug", categorySlug)
          .eq("verified", true)
          .order("is_national", { ascending: true })
          .limit(50),
      ]);
      setCat(c);
      // Prioritize ZIP matches first, then state, then national
      const userZip = profile?.zip_code ?? "";
      const userState = profile?.state ?? "";
      const sorted = (rs ?? []).slice().sort((a, b) => {
        const score = (r: ResourceCardData & { zip_code?: string | null; state?: string | null }) => {
          if (userZip && r.zip_code === userZip) return 0;
          if (userState && r.state === userState) return 1;
          if (r.is_national) return 3;
          return 2;
        };
        return score(a) - score(b);
      });
      setResources(sorted);
      setLoading(false);
    })();
  }, [categorySlug, profile?.zip_code, profile?.state]);

  return (
    <div className="w-full max-w-3xl mx-auto space-y-4">
      <ResourceBackButton fallback="/dashboard/resources" label="Resources" />
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">{cat?.title ?? "Resources"}</h1>
        {cat?.description && <p className="text-sm text-muted-foreground mt-1">{cat.description}</p>}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : resources.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <AlertCircle className="w-8 h-8 text-primary mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-foreground">We couldn't find verified resources near you yet.</h3>
          <p className="text-xs text-muted-foreground mt-1 mb-4">Try one of these national supports while we expand.</p>
          <div className="grid gap-2 text-left">
            <a href="https://www.211.org" target="_blank" rel="noopener noreferrer" className="bg-primary/10 hover:bg-primary/15 rounded-xl px-4 py-3 text-sm font-semibold text-primary">
              Call 211 — Local Help Line
            </a>
            <a href="https://www.fns.usda.gov/snap/state-directory" target="_blank" rel="noopener noreferrer" className="bg-muted hover:bg-muted/70 rounded-xl px-4 py-3 text-sm font-semibold text-foreground">
              Find your SNAP office
            </a>
            <Link to="/dashboard/resources" className="text-xs text-muted-foreground text-center mt-2">
              Back to all categories
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {resources.map((r) => (
            <ResourceCard key={r.id} r={r} />
          ))}
        </div>
      )}
    </div>
  );
}
