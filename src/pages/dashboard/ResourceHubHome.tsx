import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CategoryCard } from "@/components/dashboard/resources/CategoryCard";
import { ResourceBackButton } from "@/components/dashboard/resources/ResourceBackButton";
import { useAuth } from "@/contexts/AuthContext";
import { Search, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

interface Category {
  slug: string;
  title: string;
  description: string;
  icon: string;
  sort_order: number;
}

export default function ResourceHubHome() {
  const { profile } = useAuth();
  const [cats, setCats] = useState<Category[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    supabase
      .from("resource_categories")
      .select("slug,title,description,icon,sort_order")
      .order("sort_order", { ascending: true })
      .then(({ data }) => setCats(data ?? []));
  }, []);

  const filtered = q.trim()
    ? cats.filter((c) => c.title.toLowerCase().includes(q.toLowerCase()))
    : cats;

  return (
    <div className="w-full max-w-3xl mx-auto space-y-5">
      <div className="space-y-2">
        <ResourceBackButton fallback="/dashboard" label="Today" />
        <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground">Resources Hub</h1>
        <p className="text-sm text-muted-foreground">
          Verified support near you — food, housing, healthcare, and more.
        </p>
      </div>

      {profile?.zip_code && (
        <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-3">
          <div className="flex items-center gap-2 text-sm">
            <MapPin className="w-4 h-4 text-primary" />
            <span className="font-semibold text-foreground">{profile.zip_code}</span>
            {profile.city && <span className="text-muted-foreground">— {profile.city}, {profile.state}</span>}
          </div>
          <Link to="/dashboard/settings" className="text-xs font-semibold text-primary hover:underline">Change</Link>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search resources near you…"
          className="w-full h-11 pl-9 pr-3 rounded-xl bg-card border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <Link
        to="/dashboard/resources/bulk-buying"
        className="block bg-primary/10 border border-primary/20 rounded-2xl p-4 hover:bg-primary/15 transition-colors"
      >
        <p className="text-xs font-bold uppercase tracking-wide text-primary mb-1">Featured Guide</p>
        <h3 className="text-base font-semibold text-foreground">Bulk Buying Guide</h3>
        <p className="text-xs text-muted-foreground mt-0.5">What families should buy in bulk to save the most.</p>
      </Link>

      <div className="space-y-2">
        {filtered.map((c) => (
          <CategoryCard key={c.slug} {...c} />
        ))}
      </div>
    </div>
  );
}
