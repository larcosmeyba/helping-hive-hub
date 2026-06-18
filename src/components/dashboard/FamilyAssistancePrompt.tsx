import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, X, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const ASSISTANCE_KEYS = [
  "assistance_food",
  "assistance_snap",
  "assistance_wic",
  "assistance_diapers",
  "assistance_housing",
  "assistance_utilities",
  "assistance_healthcare",
  "assistance_employment",
  "assistance_transportation",
  "assistance_childcare",
] as const;

const DISMISS_KEY = "hth_family_assistance_prompt_dismissed";

/**
 * Shown on the dashboard when the user indicated during onboarding that they
 * need assistance (SNAP, food, housing, transport, childcare, etc.).
 * Routes into the Family Assistance section, which already filters by ZIP.
 */
export function FamilyAssistancePrompt() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(localStorage.getItem(DISMISS_KEY) === "1");
  }, []);

  if (!profile || dismissed) return null;

  const hasAny = ASSISTANCE_KEYS.some((k) => Boolean((profile as any)[k]));
  if (!hasAny) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  return (
    <div className="mt-4 rounded-2xl bg-[#FFF6E1] border border-[#F2D78A] p-4 relative">
      <button
        onClick={dismiss}
        aria-label="Dismiss"
        className="absolute top-3 right-3 text-[#8a7a4a] p-1"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <div className="w-10 h-10 rounded-full bg-[#F2A900] flex items-center justify-center shrink-0">
          <Heart className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-extrabold text-[14px] text-[#1a1a1a]">
            We found resources that may help your family.
          </div>
          <p className="text-[12px] text-[#5a4a1a] mt-1 leading-relaxed">
            Based on your onboarding, we've curated local programs near you.
          </p>
          <button
            onClick={() => navigate("/dashboard/family-assistance")}
            className="mt-3 inline-flex items-center gap-1.5 bg-[#1F5A3D] text-white font-bold text-[13px] px-4 py-2 rounded-xl active:scale-[0.99]"
          >
            Open Hive Family Assistance <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
