import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { matchFamilyResources } from "@/lib/familyAssistance";
import { toast } from "@/components/ui/sonner";
import { Apple, Home, Baby, Zap, ShoppingBasket, HeartPulse, Car, Briefcase, ChevronRight, BookmarkCheck } from "lucide-react";

const CATEGORY_META: Record<string, { label: string; subtitle: string; icon: React.ComponentType<any>; bg: string; iconColor: string }> = {
  snap: { label: "SNAP Benefits", subtitle: "Food assistance for your family", icon: Apple, bg: "#FFE5E5", iconColor: "#D64545" },
  wic: { label: "WIC Program", subtitle: "Nutrition for women & children", icon: Baby, bg: "#FFF1D6", iconColor: "#B5781A" },
  food_bank: { label: "Food Pantry", subtitle: "Local food pantries near you", icon: ShoppingBasket, bg: "#E4F4E4", iconColor: "#1F7A3D" },
  housing: { label: "Housing Assistance", subtitle: "Help with rent or housing", icon: Home, bg: "#EAE4FB", iconColor: "#5B3FBF" },
  utilities: { label: "Utility Assistance", subtitle: "Help with electricity, gas, water", icon: Zap, bg: "#FFF8E0", iconColor: "#B59500" },
  diapers_formula: { label: "Diapers & Formula", subtitle: "Baby essentials assistance", icon: Baby, bg: "#FCE7EC", iconColor: "#E63B6B" },
  healthcare: { label: "Healthcare", subtitle: "Medical and clinic support", icon: HeartPulse, bg: "#E0F2FE", iconColor: "#0369A1" },
  transportation: { label: "Transportation", subtitle: "Rides and bus passes", icon: Car, bg: "#F0F0F0", iconColor: "#1a1a1a" },
  employment: { label: "Employment", subtitle: "Job search and training", icon: Briefcase, bg: "#E4F4E4", iconColor: "#1F7A3D" },
  childcare: { label: "Childcare", subtitle: "Affordable childcare programs", icon: Baby, bg: "#FCE7EC", iconColor: "#E63B6B" },
};

export default function FamilyAssistanceMatchesPage() {
  const navigate = useNavigate();
  const [matches, setMatches] = useState<any[]>([]);
  const [disclaimer, setDisclaimer] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    matchFamilyResources()
      .then((r) => {
        setMatches(r.matches ?? []);
        setDisclaimer(r.disclaimer ?? "Based on your answers, these resources may help.");
      })
      .catch((e) => toast.error(e?.message ?? "Could not load resources"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="max-w-md mx-auto px-1 pb-32">
      <h1 className="text-center text-[20px] font-extrabold text-[#1a1a1a] mt-2 mb-1">Resources Near You</h1>
      <p className="text-center text-[12.5px] text-[#6b6b6b] mb-5">
        {disclaimer || "Based on your answers, these resources may help."}
      </p>

      {loading ? (
        <p className="text-center text-[#6b6b6b] py-10">Finding resources…</p>
      ) : matches.length === 0 ? (
        <div className="bg-white border border-[#EAEAEA] rounded-2xl p-6 text-center">
          <p className="font-semibold text-[#1a1a1a] mb-3">No matches yet.</p>
          <button
            onClick={() => navigate("/dashboard/resources/intake")}
            className="px-4 py-2 rounded-xl bg-[#E63B6B] text-white font-semibold text-[14px]"
          >
            Answer a few questions
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map((m) => {
            const meta = CATEGORY_META[m.category] ?? { label: m.resource_name, subtitle: "", icon: Apple, bg: "#F0F0F0", iconColor: "#1a1a1a" };
            const Icon = meta.icon;
            return (
              <button
                key={m.id}
                onClick={() => navigate(`/dashboard/resources/match/${m.id}`)}
                className="w-full text-left bg-white border border-[#EAEAEA] rounded-2xl p-3 flex items-center gap-3 active:scale-[0.99] transition-transform"
              >
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: meta.bg }}>
                  <Icon className="w-5 h-5" style={{ color: meta.iconColor }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[14px] text-[#1a1a1a]">{m.resource_name || meta.label}</p>
                  <p className="text-[12px] text-[#6b6b6b] truncate">{m.description || meta.subtitle}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-[#999] shrink-0" />
              </button>
            );
          })}
        </div>
      )}

      <button
        onClick={() => navigate("/dashboard/resources/plan")}
        className="mt-5 w-full border border-[#E63B6B] text-[#E63B6B] font-bold text-[14px] py-3 rounded-xl flex items-center justify-center gap-2"
      >
        <BookmarkCheck className="w-4 h-4" /> View Your Family Assistance Plan
      </button>
    </div>
  );
}
