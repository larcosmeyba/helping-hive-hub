import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { matchFamilyResources, saveResource } from "@/lib/familyAssistance";
import { ArrowRight, BookmarkPlus, Phone, ExternalLink, Heart } from "lucide-react";
import { toast } from "@/components/ui/sonner";

const CATEGORY_LABEL: Record<string, string> = {
  food_bank: "Food bank", snap: "SNAP", wic: "WIC", diapers_formula: "Diapers & formula",
  housing: "Housing", utilities: "Utilities", healthcare: "Healthcare",
  transportation: "Transportation", childcare: "Childcare", employment: "Employment",
};

export default function FamilyAssistanceMatchesPage() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<any[]>([]);
  const [disclaimer, setDisclaimer] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    matchFamilyResources()
      .then((r) => { setMatches(r.matches ?? []); setDisclaimer(r.disclaimer ?? ""); })
      .catch((e) => toast.error(e?.message ?? "Could not load resources"))
      .finally(() => setLoading(false));
  }, []);

  const onSave = async (id: string) => {
    try { await saveResource(id); toast.success("Saved"); } catch (e: any) { toast.error(e?.message ?? "Could not save"); }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-8">
      <div className="flex items-center gap-2 mb-1">
        <Heart className="w-5 h-5 fill-[#E63B6B] text-[#E63B6B]" />
        <h1 className="text-xl font-extrabold text-foreground">Resources for your family</h1>
      </div>
      {disclaimer && <p className="text-xs text-muted-foreground mb-4">{disclaimer}</p>}

      {loading ? (
        <div className="py-12 text-center text-muted-foreground">Finding resources…</div>
      ) : matches.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-6 text-center">
          <p className="text-foreground font-semibold mb-1">No matches yet</p>
          <p className="text-sm text-muted-foreground mb-3">Tell us a bit more so we can find help in your area.</p>
          <button onClick={() => navigate("/dashboard/resources/intake")} className="px-4 py-2 rounded-xl bg-[#E63B6B] text-white font-semibold">Answer a few questions</button>
        </div>
      ) : (
        <div className="space-y-3">
          {matches.map((r) => (
            <article key={r.id} className="bg-card border border-border rounded-2xl p-4">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wide text-[#E63B6B]">{CATEGORY_LABEL[r.category] ?? r.category}</span>
                  <h3 className="font-bold text-foreground leading-tight">{r.resource_name}</h3>
                </div>
                <button onClick={() => onSave(r.id)} className="p-2 rounded-lg hover:bg-muted" aria-label="Save">
                  <BookmarkPlus className="w-4 h-4 text-foreground" />
                </button>
              </div>
              {r.ai_explanation && <p className="text-sm text-foreground/80 mb-2">{r.ai_explanation}</p>}
              {r.description && <p className="text-xs text-muted-foreground mb-3">{r.description}</p>}
              <div className="flex flex-wrap gap-2">
                {r.phone && <a href={`tel:${r.phone}`} className="text-xs font-semibold text-foreground inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border"><Phone className="w-3 h-3" />{r.phone}</a>}
                {r.website_url && <a href={r.website_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-foreground inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-border"><ExternalLink className="w-3 h-3" />Website</a>}
                {r.application_url && <a href={r.application_url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-white inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#E63B6B]"><ArrowRight className="w-3 h-3" />Apply</a>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
