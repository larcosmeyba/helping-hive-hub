import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { submitQuestionnaire, type Questionnaire } from "@/lib/familyAssistance";
import { toast } from "@/components/ui/sonner";

const QUESTIONS: Array<{ key: keyof Questionnaire; q: string; transform?: (yes: boolean) => Partial<Questionnaire> }> = [
  { key: "lost_job_recently", q: "Did you recently lose your job?" },
  { key: "needs_food_assistance", q: "Do you need food assistance?" },
  { key: "needs_utilities", q: "Do you need help paying bills?" },
  {
    key: "children_under_5",
    q: "Do you have children?",
    transform: (yes) => ({ children_under_5: yes ? 1 : 0 }),
  },
  { key: "needs_diapers_formula", q: "Do you need diapers or formula?" },
  { key: "needs_snap", q: "Do you need help applying for SNAP?" },
];

export default function FamilyAssistanceIntakePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [answers, setAnswers] = useState<Record<string, boolean | undefined>>({});
  const [zip, setZip] = useState<string>(profile?.zip_code ?? "");
  const [submitting, setSubmitting] = useState(false);

  const setAns = (key: string, val: boolean) => setAnswers((a) => ({ ...a, [key]: val }));

  const handleSubmit = async () => {
    if (!zip || zip.length < 5) {
      toast.error("Please enter your ZIP code.");
      return;
    }
    setSubmitting(true);
    const payload: Questionnaire = { zip_code: zip };
    for (const q of QUESTIONS) {
      const v = answers[q.key as string];
      if (v === undefined) continue;
      if (q.transform) Object.assign(payload, q.transform(v));
      else (payload as any)[q.key] = v;
    }
    try {
      await submitQuestionnaire(payload);
      navigate("/dashboard/resources/matches");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-1 pb-32">
      <h1 className="text-center text-[20px] font-extrabold text-[#1a1a1a] mt-2 mb-5">
        Tell Us What You Need Help With
      </h1>

      <div className="space-y-4">
        {QUESTIONS.map((q) => {
          const val = answers[q.key as string];
          return (
            <div key={q.key as string}>
              <p className="text-[14px] font-semibold text-[#1a1a1a] mb-2">{q.q}</p>
              <div className="grid grid-cols-2 gap-2">
                <YesNo selected={val === true} label="Yes" onClick={() => setAns(q.key as string, true)} />
                <YesNo selected={val === false} label="No" onClick={() => setAns(q.key as string, false)} />
              </div>
            </div>
          );
        })}

        <div>
          <p className="text-[14px] font-semibold text-[#1a1a1a] mb-2">ZIP Code</p>
          <input
            value={zip}
            onChange={(e) => setZip(e.target.value.replace(/\D/g, "").slice(0, 5))}
            placeholder="87505"
            inputMode="numeric"
            className="w-full rounded-xl border border-[#E5E5E5] px-3 py-3 text-[14px] bg-white"
          />
        </div>
      </div>

      <button
        disabled={submitting}
        onClick={handleSubmit}
        className="mt-6 w-full bg-[#E63B6B] text-white font-bold text-[15px] py-4 rounded-xl flex items-center justify-center gap-2 disabled:opacity-60"
      >
        {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        Find Resources
      </button>
    </div>
  );
}

function YesNo({ selected, label, onClick }: { selected: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`py-3 rounded-xl text-[14px] font-semibold border transition-colors ${
        selected ? "bg-[#E63B6B] text-white border-[#E63B6B]" : "bg-[#FEECEC] text-[#1a1a1a] border-[#FEECEC]"
      }`}
    >
      {label}
    </button>
  );
}
