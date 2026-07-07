import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Globe, MapPin, Bookmark, BookmarkCheck, AlertTriangle, Sparkles, Clock, Pill, ExternalLink } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import {
  findFamilyResources,
  saveFamilyResource,
  unsaveFamilyResource,
  type CommunityResource,
  type FindFamilyResourcesResponse,
} from "@/lib/familyResources";

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "all", label: "All" },
  { key: "food_assistance", label: "Food" },
  { key: "housing_rent", label: "Housing" },
  { key: "utilities", label: "Utilities" },
  { key: "diapers_formula", label: "Baby Supplies" },
  { key: "healthcare_prescriptions", label: "Healthcare" },
  { key: "transportation", label: "Transportation" },
  { key: "employment_training", label: "Employment" },
  { key: "urgent", label: "Urgent" },
  { key: "saved", label: "Saved" },
];

export default function FamilyAssistanceResultsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const intake = (location.state ?? null) as any;
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FindFamilyResourcesResponse | null>(null);
  const [filter, setFilter] = useState<string>("all");
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!intake?.zip_code) {
      navigate("/dashboard/family-assistance", { replace: true });
      return;
    }
    findFamilyResources(intake)
      .then(setData)
      .catch((e) => toast.error(e?.message ?? "Could not load resources"))
      .finally(() => setLoading(false));
  }, [intake, navigate]);

  const filtered = useMemo(() => {
    if (!data?.resources) return [];
    if (filter === "all") return data.resources;
    if (filter === "urgent") return data.resources.filter((r) => r.emergency_available);
    if (filter === "saved") return data.resources.filter((r) => savedIds.has(r.id));
    return data.resources.filter((r) => r.category === filter);
  }, [data, filter, savedIds]);

  const toggleSave = async (r: CommunityResource) => {
    const isSaved = savedIds.has(r.id);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (isSaved) next.delete(r.id);
      else next.add(r.id);
      return next;
    });
    try {
      if (isSaved) await unsaveFamilyResource(r.id);
      else await saveFamilyResource(r.id);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update saved resource");
    }
  };

  const includesMentalHealth = (intake?.selected_categories ?? []).includes("mental_health");
  const includesPrescriptions = (intake?.selected_categories ?? []).includes("healthcare_prescriptions");
  const showCrisis = intake?.urgency_level === "urgent" || includesMentalHealth;
  const showCostPlus = includesPrescriptions && (filter === "all" || filter === "healthcare_prescriptions");

  return (
    <div className="max-w-md mx-auto px-4 pb-32 pt-3">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigate("/dashboard/family-assistance")}
          className="w-9 h-9 rounded-full bg-white border border-[#EAEAEA] flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-[#1a1a1a]" />
        </button>
        <button
          onClick={() => navigate("/dashboard/family-assistance/saved")}
          className="text-[12.5px] font-semibold text-[#E63B6B]"
        >
          Saved
        </button>
      </div>

      <h1 className="text-[22px] font-extrabold text-[#1a1a1a]">Resources Near You</h1>
      <p className="text-[12.5px] text-[#6b6b6b] mt-1">
        Based on your ZIP code and selected needs.
      </p>

      {showCrisis && (
        <div className="mt-3 rounded-xl bg-[#FFF4E5] border border-[#F5C57E] p-3 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-[#B5781A] mt-0.5 shrink-0" />
          <div>
            <p className="text-[12.5px] font-bold text-[#5a3a00]">If you're in immediate danger, call 911.</p>
            <p className="text-[12px] text-[#5a3a00] mt-0.5">
              For mental health crisis support, call or text <a className="underline font-semibold" href="tel:988">988</a>.
            </p>
          </div>
        </div>
      )}

      {data?.ai_summary && (
        <div className="mt-3 rounded-xl bg-[#FCE7EC] p-3 flex items-start gap-2">
          <Sparkles className="w-4 h-4 text-[#E63B6B] mt-0.5 shrink-0" />
          <p className="text-[12.5px] text-[#1a1a1a] leading-snug">{data.ai_summary}</p>
        </div>
      )}

      {data?.fallback_message && !data?.ai_summary && (
        <div className="mt-3 rounded-xl bg-[#F5F0E8] p-3 text-[12px] text-[#6b6b6b]">
          {data.fallback_message}
        </div>
      )}

      <div className="mt-3 -mx-4 px-4 overflow-x-auto">
        <div className="flex gap-2 pb-1 w-max">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold border whitespace-nowrap ${
                filter === f.key ? "bg-[#1a1a1a] text-white border-[#1a1a1a]" : "bg-white text-[#1a1a1a] border-[#EAEAEA]"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {showCostPlus && (
        <a
          href="https://costplusdrugs.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 block rounded-2xl bg-white border-2 border-[#1F5A3D] p-3 active:scale-[0.99] transition-transform"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[#E4F4E4] flex items-center justify-center shrink-0">
              <Pill className="w-5 h-5 text-[#1F5A3D]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="font-extrabold text-[14px] text-[#1a1a1a]">Cost Plus Drugs</p>
                <ExternalLink className="w-3.5 h-3.5 text-[#1F5A3D]" />
              </div>
              <p className="text-[12px] text-[#4a4a4a] mt-0.5 leading-snug">
                Affordable generic prescriptions shipped to your door. Transparent pricing — usually far less than pharmacy retail. Insurance not required.
              </p>
              <span className="inline-block mt-1.5 text-[11px] font-bold text-[#1F5A3D]">
                Visit costplusdrugs.com →
              </span>
            </div>
          </div>
        </a>
      )}

      <div className="mt-3 space-y-2">

        {loading ? (
          <p className="text-center text-[#6b6b6b] py-10">Finding resources…</p>
        ) : filtered.length === 0 ? (
          <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 text-center">
            <p className="font-semibold text-[#1a1a1a]">No resources match these filters yet.</p>
            <p className="text-[12px] text-[#6b6b6b] mt-1">
              Try a different filter or contact local 211 services.
            </p>
          </div>
        ) : (
          filtered.map((r) => (
            <ResourceCard
              key={r.id}
              resource={r}
              saved={savedIds.has(r.id)}
              onToggleSave={() => toggleSave(r)}
              onOpen={() => navigate(`/dashboard/family-assistance/resource/${r.id}`)}
            />
          ))
        )}
      </div>

      <p className="text-[11px] text-[#6b6b6b] mt-4 leading-snug">
        {data?.disclaimer ??
          "Resource availability, eligibility, hours, and services can change. Please contact the organization directly before visiting."}
      </p>
    </div>
  );
}

function ResourceCard({
  resource,
  saved,
  onToggleSave,
  onOpen,
}: {
  resource: CommunityResource;
  saved: boolean;
  onToggleSave: () => void;
  onOpen: () => void;
}) {
  return (
    <div className="bg-white border border-[#EAEAEA] rounded-2xl p-3">
      <button onClick={onOpen} className="w-full text-left">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[14px] text-[#1a1a1a]">{resource.name}</p>
            <p className="text-[11.5px] text-[#6b6b6b] capitalize">
              {resource.category.replace(/_/g, " ")}
              {resource.zip_code ? ` · ${resource.zip_code}` : ""}
            </p>
            {resource.description && (
              <p className="text-[12px] text-[#4a4a4a] mt-1 line-clamp-2">{resource.description}</p>
            )}
            {resource.hours && (
              <p className="text-[11.5px] text-[#6b6b6b] mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> {resource.hours}
              </p>
            )}
            {resource.emergency_available && (
              <span className="inline-block mt-1.5 text-[10.5px] font-bold px-2 py-0.5 rounded-full bg-[#FFE5E5] text-[#B5371A]">
                URGENT
              </span>
            )}
          </div>
        </div>
      </button>

      <div className="flex items-center gap-2 mt-3">
        {resource.phone && (
          <a
            href={`tel:${resource.phone}`}
            className="flex-1 bg-[#1F5A3D] text-white text-[12px] font-semibold py-2 rounded-lg flex items-center justify-center gap-1"
          >
            <Phone className="w-3.5 h-3.5" /> Call
          </a>
        )}
        {resource.website && (
          <a
            href={resource.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 border border-[#EAEAEA] text-[#1a1a1a] text-[12px] font-semibold py-2 rounded-lg flex items-center justify-center gap-1"
          >
            <Globe className="w-3.5 h-3.5" /> Website
          </a>
        )}
        {resource.address && (
          <a
            href={`https://maps.google.com/?q=${encodeURIComponent(resource.address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 border border-[#EAEAEA] text-[#1a1a1a] text-[12px] font-semibold py-2 rounded-lg flex items-center justify-center gap-1"
          >
            <MapPin className="w-3.5 h-3.5" /> Map
          </a>
        )}
        <button
          onClick={onToggleSave}
          className={`w-9 h-9 rounded-lg flex items-center justify-center border ${
            saved ? "bg-[#FCE7EC] border-[#E63B6B] text-[#E63B6B]" : "bg-white border-[#EAEAEA] text-[#6b6b6b]"
          }`}
          aria-label={saved ? "Unsave" : "Save"}
        >
          {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
}
