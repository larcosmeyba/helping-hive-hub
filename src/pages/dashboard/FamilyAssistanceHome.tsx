import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import { ArrowLeft, ArrowRight, Check, AlertTriangle, BookmarkCheck } from "lucide-react";
import { toast } from "@/components/ui/sonner";
import { FAMILY_CATEGORIES, type FamilyCategory } from "@/lib/familyResources";

type Step = 1 | 2;

export default function FamilyAssistanceHome() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>(1);
  const [selected, setSelected] = useState<FamilyCategory[]>([]);
  const [urgency, setUrgency] = useState<"urgent" | "normal" | null>(null);

  const [zip, setZip] = useState("");
  const [householdSize, setHouseholdSize] = useState<string>("");
  const [hasChildren, setHasChildren] = useState<boolean | null>(null);
  const [employment, setEmployment] =
    useState<"employed" | "unemployed" | "prefer_not_to_say" | null>(null);
  const [benefits, setBenefits] =
    useState<"yes" | "no" | "not_sure" | "prefer_not_to_say" | null>(null);

  const canContinue1 = selected.length > 0 && urgency !== null;
  const canSubmit = /^\d{5}$/.test(zip.trim());

  const toggleCategory = (key: FamilyCategory) => {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const goResults = () => {
    if (!canSubmit) {
      toast.error("Please enter a valid 5-digit ZIP code.");
      return;
    }
    const payload = {
      zip_code: zip.trim(),
      selected_categories: selected,
      urgency_level: urgency,
      household_size: householdSize ? Number(householdSize) : null,
      has_children: hasChildren,
      employment_status: employment,
      receives_benefits: benefits,
    };
    navigate("/dashboard/family-assistance/results", { state: payload });
  };

  return (
    <div className="max-w-md mx-auto px-4 pb-32 pt-3">
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => (step === 1 ? navigate(-1) : setStep(1))}
          className="w-9 h-9 rounded-full bg-white border border-[#EAEAEA] flex items-center justify-center"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4 text-[#1a1a1a]" />
        </button>
        <button
          onClick={() => navigate("/dashboard/family-assistance/saved")}
          className="flex items-center gap-1.5 text-[12.5px] font-semibold text-[#E63B6B]"
        >
          <BookmarkCheck className="w-4 h-4" /> Saved
        </button>
      </div>

      {step === 1 ? (
        <>
          <h1 className="text-[22px] font-extrabold text-[#1a1a1a] leading-tight">
            Tell Us What You Need Help With
          </h1>
          <p className="text-[13px] text-[#6b6b6b] mt-1.5 mb-4">
            Select anything your family needs right now. We'll use your ZIP code to find nearby resources.
          </p>

          <div className="grid grid-cols-1 gap-2">
            {FAMILY_CATEGORIES.map((cat) => {
              const Icon = (Icons as any)[cat.icon] ?? Icons.HelpCircle;
              const active = selected.includes(cat.key);
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => toggleCategory(cat.key)}
                  className={`text-left rounded-2xl p-3 flex items-start gap-3 border transition-colors ${
                    active
                      ? "border-[#E63B6B] bg-[#FCE7EC]"
                      : "border-[#EAEAEA] bg-white"
                  }`}
                  aria-pressed={active}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: active ? "#E63B6B" : "#FDF1F4" }}
                  >
                    <Icon
                      className="w-5 h-5"
                      style={{ color: active ? "#fff" : "#E63B6B" }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[14px] text-[#1a1a1a]">{cat.label}</p>
                    <p className="text-[12px] text-[#6b6b6b] mt-0.5">{cat.description}</p>
                  </div>
                  {active && <Check className="w-4 h-4 text-[#E63B6B] shrink-0 mt-2" />}
                </button>
              );
            })}
          </div>

          <div className="mt-5">
            <p className="font-bold text-[14px] text-[#1a1a1a] mb-2">
              Do you need help within the next 7 days?
            </p>
            <div className="grid grid-cols-2 gap-2">
              <ToggleButton
                active={urgency === "urgent"}
                onClick={() => setUrgency("urgent")}
                label="Yes, urgent"
              />
              <ToggleButton
                active={urgency === "normal"}
                onClick={() => setUrgency("normal")}
                label="No, not urgent"
              />
            </div>
          </div>

          <button
            disabled={!canContinue1}
            onClick={() => setStep(2)}
            className="mt-6 w-full bg-[#E63B6B] disabled:bg-[#F3B3C4] text-white font-bold text-[15px] py-3.5 rounded-xl flex items-center justify-center gap-2"
          >
            Continue <ArrowRight className="w-4 h-4" />
          </button>
        </>
      ) : (
        <>
          <h1 className="text-[22px] font-extrabold text-[#1a1a1a] leading-tight">
            A Few Quick Details
          </h1>
          <p className="text-[13px] text-[#6b6b6b] mt-1.5 mb-5">
            We only use these answers to recommend better resources. We do not verify benefits or eligibility.
          </p>

          <Field label="ZIP Code" required>
            <input
              inputMode="numeric"
              maxLength={5}
              value={zip}
              onChange={(e) => setZip(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="e.g. 87505"
              className="w-full rounded-xl border border-[#EAEAEA] px-3 py-3 text-[15px] focus:outline-none focus:border-[#E63B6B]"
            />
          </Field>

          <Field label="Household Size">
            <input
              inputMode="numeric"
              value={householdSize}
              onChange={(e) => setHouseholdSize(e.target.value.replace(/[^0-9]/g, ""))}
              placeholder="Optional"
              className="w-full rounded-xl border border-[#EAEAEA] px-3 py-3 text-[15px] focus:outline-none focus:border-[#E63B6B]"
            />
          </Field>

          <Field label="Do you have children?">
            <div className="grid grid-cols-2 gap-2">
              <ToggleButton active={hasChildren === true} onClick={() => setHasChildren(true)} label="Yes" />
              <ToggleButton active={hasChildren === false} onClick={() => setHasChildren(false)} label="No" />
            </div>
          </Field>

          <Field label="Are you currently employed?">
            <div className="grid grid-cols-3 gap-2">
              <ToggleButton active={employment === "employed"} onClick={() => setEmployment("employed")} label="Yes" />
              <ToggleButton active={employment === "unemployed"} onClick={() => setEmployment("unemployed")} label="No" />
              <ToggleButton active={employment === "prefer_not_to_say"} onClick={() => setEmployment("prefer_not_to_say")} label="Prefer not" />
            </div>
          </Field>

          <Field label="Do you receive SNAP, EBT, WIC, or Medicaid?">
            <div className="grid grid-cols-2 gap-2">
              <ToggleButton active={benefits === "yes"} onClick={() => setBenefits("yes")} label="Yes" />
              <ToggleButton active={benefits === "no"} onClick={() => setBenefits("no")} label="No" />
              <ToggleButton active={benefits === "not_sure"} onClick={() => setBenefits("not_sure")} label="Not sure" />
              <ToggleButton active={benefits === "prefer_not_to_say"} onClick={() => setBenefits("prefer_not_to_say")} label="Prefer not" />
            </div>
            <p className="text-[11.5px] text-[#6b6b6b] mt-2">
              We do not verify benefits. This helps us show resources that may be more relevant to your family.
            </p>
          </Field>

          {urgency === "urgent" && (
            <div className="mt-3 rounded-xl bg-[#FFF4E5] border border-[#F5C57E] p-3 flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-[#B5781A] mt-0.5 shrink-0" />
              <p className="text-[12px] text-[#5a3a00]">
                If you or someone in your household is in immediate danger, call 911 or your local emergency number.
              </p>
            </div>
          )}

          <button
            disabled={!canSubmit}
            onClick={goResults}
            className="mt-5 w-full bg-[#E63B6B] disabled:bg-[#F3B3C4] text-white font-bold text-[15px] py-3.5 rounded-xl"
          >
            Find Resources
          </button>
        </>
      )}
    </div>
  );
}

function ToggleButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl py-2.5 text-[13px] font-semibold border transition-colors ${
        active ? "bg-[#E63B6B] text-white border-[#E63B6B]" : "bg-white text-[#1a1a1a] border-[#EAEAEA]"
      }`}
    >
      {label}
    </button>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="mt-4">
      <label className="block text-[13px] font-bold text-[#1a1a1a] mb-1.5">
        {label} {required && <span className="text-[#E63B6B]">*</span>}
      </label>
      {children}
    </div>
  );
}
