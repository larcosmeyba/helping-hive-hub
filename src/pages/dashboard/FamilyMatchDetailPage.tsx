import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Apple, ArrowLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { saveResource } from "@/lib/familyAssistance";
import { toast } from "@/components/ui/sonner";

type LocalResource = {
  id: string;
  resource_name: string;
  category: string;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  phone: string | null;
  website_url: string | null;
  application_url: string | null;
  hours: string | null;
  eligibility_notes: string | null;
  documents_needed: string[] | null;
};

export default function FamilyMatchDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [r, setR] = useState<LocalResource | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await supabase.from("local_resources").select("*").eq("id", id).maybeSingle();
      if (error) toast.error(error.message);
      setR(data as LocalResource | null);
      setLoading(false);
    })();
  }, [id]);

  const handleSave = async () => {
    if (!r) return;
    setSaving(true);
    try {
      await saveResource(r.id);
      toast.success("Saved to your Family Assistance Plan");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not save");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-[#E63B6B]" /></div>;
  }
  if (!r) {
    return (
      <div className="max-w-md mx-auto px-1 pb-8">
        <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-[14px] text-[#1a1a1a]">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <p className="text-center text-[#6b6b6b] py-10">Resource not found.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-1 pb-32">
      <button onClick={() => navigate(-1)} className="mb-3 flex items-center gap-1 text-[14px] text-[#1a1a1a]">
        <ArrowLeft className="w-4 h-4" />
      </button>

      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-[#FFE5E5] flex items-center justify-center">
          <Apple className="w-5 h-5 text-[#D64545]" />
        </div>
        <h1 className="text-[18px] font-extrabold text-[#1a1a1a]">{r.resource_name}</h1>
      </div>

      {r.description && (
        <Section title="Description"><p className="text-[13px] text-[#3a3a3a]">{r.description}</p></Section>
      )}

      {r.eligibility_notes && (
        <Section title="Estimated Qualification">
          <p className="text-[13px] text-[#3a3a3a]">{r.eligibility_notes}</p>
          <p className="text-[12px] text-[#6b6b6b] mt-2 italic">You may qualify — please confirm eligibility directly with the program.</p>
        </Section>
      )}

      {r.documents_needed && r.documents_needed.length > 0 && (
        <Section title="Application Requirements">
          <ul className="text-[13px] text-[#3a3a3a] space-y-1">
            {r.documents_needed.map((d, i) => <li key={i}>• {d}</li>)}
          </ul>
        </Section>
      )}

      {(r.address || r.hours) && (
        <Section title="Location & Hours">
          {r.address && <p className="text-[13px] text-[#3a3a3a]">{[r.address, r.city, r.state, r.zip_code].filter(Boolean).join(", ")}</p>}
          {r.hours && <p className="text-[13px] text-[#3a3a3a] mt-1">{r.hours}</p>}
        </Section>
      )}

      <div className="mt-5 space-y-2.5">
        {r.application_url && (
          <a href={r.application_url} target="_blank" rel="noopener noreferrer" className="block w-full bg-[#E63B6B] text-white font-bold text-[15px] py-4 rounded-xl text-center">
            Apply Now
          </a>
        )}
        {r.website_url && (
          <a href={r.website_url} target="_blank" rel="noopener noreferrer" className="block w-full border-2 border-[#E63B6B] text-[#E63B6B] font-bold text-[15px] py-3.5 rounded-xl text-center">
            View Website
          </a>
        )}
        {r.phone && (
          <a href={`tel:${r.phone.replace(/\D/g, "")}`} className="block w-full border-2 border-[#E63B6B] text-[#E63B6B] font-bold text-[15px] py-3.5 rounded-xl text-center">
            Call Organization
          </a>
        )}
        <button
          disabled={saving}
          onClick={handleSave}
          className="w-full border-2 border-[#E63B6B] text-[#E63B6B] font-bold text-[15px] py-3.5 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          Save Resource
        </button>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <h2 className="font-bold text-[14px] text-[#1a1a1a] mb-1">{title}</h2>
      {children}
    </div>
  );
}
