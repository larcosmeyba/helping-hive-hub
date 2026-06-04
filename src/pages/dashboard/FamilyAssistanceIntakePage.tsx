import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Heart } from "lucide-react";
import { submitQuestionnaire, type Questionnaire } from "@/lib/familyAssistance";
import { toast } from "@/components/ui/sonner";
import { useAuth } from "@/contexts/AuthContext";

const NEEDS: Array<{ key: keyof Questionnaire; label: string }> = [
  { key: "needs_food_assistance", label: "Food / pantry" },
  { key: "needs_snap", label: "SNAP benefits" },
  { key: "needs_wic", label: "WIC" },
  { key: "needs_diapers_formula", label: "Diapers / formula" },
  { key: "needs_housing", label: "Housing" },
  { key: "needs_utilities", label: "Utilities" },
  { key: "needs_healthcare", label: "Healthcare" },
  { key: "needs_transportation", label: "Transportation" },
  { key: "needs_childcare", label: "Childcare" },
  { key: "needs_employment", label: "Employment" },
];

export default function FamilyAssistanceIntakePage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const [form, setForm] = useState<Questionnaire>({
    zip_code: profile?.zip_code ?? "",
    household_size: profile?.household_size ?? 1,
    employment_status: "",
    monthly_income_range: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const toggle = (k: keyof Questionnaire) => setForm((f) => ({ ...f, [k]: !f[k] as any }));
  const set = (k: keyof Questionnaire, v: any) => setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async () => {
    setSubmitting(true);
    try {
      await submitQuestionnaire(form);
      navigate("/dashboard/resources/matches");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not submit");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 pb-8">
      <div className="flex items-center gap-2 mb-2">
        <Heart className="w-5 h-5 fill-[#E63B6B] text-[#E63B6B]" />
        <h1 className="text-xl font-extrabold text-foreground">Find help for your family</h1>
      </div>
      <p className="text-sm text-muted-foreground mb-5">
        A few quick questions help us match you with programs you may qualify for. You can skip anything.
      </p>

      <section className="bg-card rounded-2xl p-4 border border-border mb-4 space-y-3">
        <h2 className="font-bold text-foreground">About your household</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label="ZIP code"><input className="input" value={form.zip_code ?? ""} onChange={(e) => set("zip_code", e.target.value)} maxLength={10} /></Field>
          <Field label="Household size"><input type="number" min={1} className="input" value={form.household_size ?? 1} onChange={(e) => set("household_size", Number(e.target.value))} /></Field>
          <Field label="Children under 5"><input type="number" min={0} className="input" value={form.children_under_5 ?? 0} onChange={(e) => set("children_under_5", Number(e.target.value))} /></Field>
          <Field label="Children 5–12"><input type="number" min={0} className="input" value={form.children_5_to_12 ?? 0} onChange={(e) => set("children_5_to_12", Number(e.target.value))} /></Field>
          <Field label="Teenagers"><input type="number" min={0} className="input" value={form.teenagers ?? 0} onChange={(e) => set("teenagers", Number(e.target.value))} /></Field>
          <Field label="Seniors 65+"><input type="number" min={0} className="input" value={form.seniors_65_plus ?? 0} onChange={(e) => set("seniors_65_plus", Number(e.target.value))} /></Field>
        </div>
      </section>

      <section className="bg-card rounded-2xl p-4 border border-border mb-4 space-y-3">
        <h2 className="font-bold text-foreground">Employment & income</h2>
        <Field label="Employment status">
          <select className="input" value={form.employment_status ?? ""} onChange={(e) => set("employment_status", e.target.value)}>
            <option value="">Prefer not to say</option>
            <option value="employed_full">Employed full time</option>
            <option value="employed_part">Employed part time</option>
            <option value="self_employed">Self-employed</option>
            <option value="unemployed">Unemployed</option>
            <option value="retired">Retired</option>
            <option value="student">Student</option>
          </select>
        </Field>
        <Field label="Monthly household income">
          <select className="input" value={form.monthly_income_range ?? ""} onChange={(e) => set("monthly_income_range", e.target.value)}>
            <option value="">Prefer not to say</option>
            <option value="0-1000">Under $1,000</option>
            <option value="1000-2000">$1,000–$2,000</option>
            <option value="2000-3000">$2,000–$3,000</option>
            <option value="3000-5000">$3,000–$5,000</option>
            <option value="5000+">$5,000+</option>
          </select>
        </Field>
        <Checkbox checked={!!form.lost_job_recently} onChange={() => toggle("lost_job_recently")}>Lost a job recently</Checkbox>
        <Checkbox checked={!!form.reduced_hours_recently} onChange={() => toggle("reduced_hours_recently")}>Had hours reduced recently</Checkbox>
      </section>

      <section className="bg-card rounded-2xl p-4 border border-border mb-4 space-y-2">
        <h2 className="font-bold text-foreground">What kind of help do you need?</h2>
        <div className="grid grid-cols-2 gap-2">
          {NEEDS.map((n) => (
            <Checkbox key={n.key} checked={!!form[n.key]} onChange={() => toggle(n.key)}>{n.label}</Checkbox>
          ))}
        </div>
      </section>

      <section className="bg-card rounded-2xl p-4 border border-border mb-4 space-y-2">
        <h2 className="font-bold text-foreground">Already receiving?</h2>
        <Checkbox checked={!!form.currently_receiving_snap} onChange={() => toggle("currently_receiving_snap")}>SNAP</Checkbox>
        <Checkbox checked={!!form.currently_receiving_wic} onChange={() => toggle("currently_receiving_wic")}>WIC</Checkbox>
        <Checkbox checked={!!form.currently_receiving_medicaid} onChange={() => toggle("currently_receiving_medicaid")}>Medicaid</Checkbox>
      </section>

      <p className="text-xs text-muted-foreground mb-3">
        Results are informational. You <em>may</em> qualify — please confirm eligibility directly with each program.
      </p>

      <div className="flex gap-2">
        <button onClick={() => navigate("/dashboard/resources/matches")} className="flex-1 py-3 rounded-xl border border-border text-foreground font-semibold">Skip</button>
        <button disabled={submitting} onClick={onSubmit} className="flex-1 py-3 rounded-xl bg-[#E63B6B] text-white font-semibold flex items-center justify-center gap-1 disabled:opacity-60">
          Find Resources <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <style>{`.input { width: 100%; border: 1px solid hsl(var(--border)); border-radius: 10px; padding: 8px 10px; background: hsl(var(--background)); color: hsl(var(--foreground)); font-size: 14px; }`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-semibold text-muted-foreground">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: () => void; children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-2 text-sm text-foreground cursor-pointer py-1">
      <input type="checkbox" checked={checked} onChange={onChange} className="w-4 h-4" />
      {children}
    </label>
  );
}
