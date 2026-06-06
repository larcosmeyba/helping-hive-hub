import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Phone, Globe, MapPin, Bookmark, BookmarkCheck, Clock, AlertTriangle } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { saveFamilyResource, unsaveFamilyResource, type CommunityResource } from "@/lib/familyResources";

export default function FamilyResourceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [resource, setResource] = useState<CommunityResource | null>(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const [{ data: r }, { data: { user } }] = await Promise.all([
        supabase.from("community_resources").select("*").eq("id", id).maybeSingle(),
        supabase.auth.getUser(),
      ]);
      setResource(r as CommunityResource | null);
      if (user) {
        const { data: s } = await supabase
          .from("saved_family_resources")
          .select("id")
          .eq("user_id", user.id)
          .eq("resource_id", id)
          .maybeSingle();
        setSaved(Boolean(s));
      }
      setLoading(false);
    })();
  }, [id]);

  if (loading) {
    return <p className="text-center text-[#6b6b6b] py-10">Loading…</p>;
  }
  if (!resource) {
    return (
      <div className="max-w-md mx-auto px-4 pt-4">
        <button onClick={() => navigate(-1)} className="text-[13px] text-[#E63B6B] font-semibold">← Back</button>
        <p className="mt-6 text-center text-[#6b6b6b]">Resource not found.</p>
      </div>
    );
  }

  const toggleSave = async () => {
    const next = !saved;
    setSaved(next);
    try {
      if (next) await saveFamilyResource(resource.id);
      else await unsaveFamilyResource(resource.id);
      toast.success(next ? "Saved" : "Removed");
    } catch (e: any) {
      setSaved(!next);
      toast.error(e?.message ?? "Could not update");
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 pb-32 pt-3">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white border border-[#EAEAEA] flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-[#1a1a1a]" />
        </button>
        <button
          onClick={toggleSave}
          className={`px-3 py-1.5 rounded-full text-[12.5px] font-semibold border flex items-center gap-1.5 ${
            saved ? "bg-[#FCE7EC] border-[#E63B6B] text-[#E63B6B]" : "bg-white border-[#EAEAEA] text-[#1a1a1a]"
          }`}
        >
          {saved ? <BookmarkCheck className="w-3.5 h-3.5" /> : <Bookmark className="w-3.5 h-3.5" />}
          {saved ? "Saved" : "Save"}
        </button>
      </div>

      <h1 className="text-[22px] font-extrabold text-[#1a1a1a]">{resource.name}</h1>
      <p className="text-[12px] text-[#6b6b6b] capitalize mt-0.5">
        {resource.category.replace(/_/g, " ")}
        {resource.subcategory ? ` · ${resource.subcategory}` : ""}
      </p>

      {resource.emergency_available && (
        <div className="mt-3 rounded-xl bg-[#FFE5E5] p-2.5 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#B5371A]" />
          <span className="text-[12px] font-bold text-[#B5371A]">Urgent / emergency available</span>
        </div>
      )}

      {resource.description && (
        <p className="text-[13.5px] text-[#1a1a1a] mt-3 leading-relaxed">{resource.description}</p>
      )}

      <div className="mt-4 space-y-3">
        {resource.address && (
          <Row icon={<MapPin className="w-4 h-4" />} label="Address" value={resource.address} />
        )}
        {resource.hours && (
          <Row icon={<Clock className="w-4 h-4" />} label="Hours" value={resource.hours} />
        )}
        {resource.phone && (
          <Row icon={<Phone className="w-4 h-4" />} label="Phone" value={resource.phone} />
        )}
        {resource.website && (
          <Row icon={<Globe className="w-4 h-4" />} label="Website" value={resource.website} />
        )}
        {resource.eligibility_notes && (
          <Row label="Requirements" value={resource.eligibility_notes} />
        )}
        {resource.what_to_bring && (
          <Row label="What to bring" value={resource.what_to_bring} />
        )}
        {resource.last_verified_at && (
          <Row label="Last updated" value={new Date(resource.last_verified_at).toLocaleDateString()} />
        )}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {resource.phone && (
          <a href={`tel:${resource.phone}`} className="bg-[#1F5A3D] text-white text-[12.5px] font-bold py-3 rounded-xl flex items-center justify-center gap-1">
            <Phone className="w-4 h-4" /> Call
          </a>
        )}
        {resource.website && (
          <a href={resource.website} target="_blank" rel="noopener noreferrer" className="border border-[#EAEAEA] text-[#1a1a1a] text-[12.5px] font-bold py-3 rounded-xl flex items-center justify-center gap-1">
            <Globe className="w-4 h-4" /> Website
          </a>
        )}
        {resource.address && (
          <a href={`https://maps.google.com/?q=${encodeURIComponent(resource.address)}`} target="_blank" rel="noopener noreferrer" className="border border-[#EAEAEA] text-[#1a1a1a] text-[12.5px] font-bold py-3 rounded-xl flex items-center justify-center gap-1">
            <MapPin className="w-4 h-4" /> Directions
          </a>
        )}
      </div>

      <p className="text-[11px] text-[#6b6b6b] mt-5 leading-snug">
        Resource availability, eligibility, hours, and services can change. Please contact the organization directly before visiting.
      </p>
    </div>
  );
}

function Row({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex gap-2.5">
      {icon && <div className="text-[#6b6b6b] mt-0.5">{icon}</div>}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-[#6b6b6b] font-semibold">{label}</p>
        <p className="text-[13.5px] text-[#1a1a1a] break-words">{value}</p>
      </div>
    </div>
  );
}
