import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { useToast } from "@/hooks/use-toast";
import { Textarea } from "@/components/ui/textarea";
import {
  BREAKFAST_CARBS, BREAKFAST_PROTEINS, BREAKFAST_FATS, BREAKFAST_SNACKS,
  LUNCH_CARBS, LUNCH_PROTEINS, LUNCH_FATS, LUNCH_SNACKS,
  DINNER_CARBS, DINNER_PROTEINS, DINNER_FATS, EVENING_SNACKS,
  VEGETABLES, ALLERGY_OPTIONS,
} from "@/data/weeklyQuestionnaireOptions";
import {
  fetchCurrentWeekQuestionnaire, saveWeeklyQuestionnaire,
  type WeeklyQuestionnaire,
} from "@/lib/weeklyQuestionnaire";

interface ChipGroupProps {
  label: string;
  options: string[];
  selected: string[];
  setSelected: (v: string[]) => void;
  max: number;
  hint?: string;
}

function ChipGroup({ label, options, selected, setSelected, max, hint }: ChipGroupProps) {
  const toggle = (o: string) => {
    if (selected.includes(o)) {
      setSelected(selected.filter((x) => x !== o));
    } else {
      if (selected.length >= max) return;
      setSelected([...selected, o]);
    }
  };
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <h3 className="text-[15px] font-bold text-[#1a1a1a]">{label}</h3>
        <span className="text-[11px] text-[#6b6b6b]">{selected.length}/{max}</span>
      </div>
      {hint && <p className="text-[12px] text-[#6b6b6b] -mt-1">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o) => {
          const active = selected.includes(o);
          const disabled = !active && selected.length >= max;
          return (
            <button
              key={o}
              onClick={() => toggle(o)}
              disabled={disabled}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border-2 text-[13px] font-medium transition-all ${
                active
                  ? "bg-[#1F5A3D] text-white border-[#1F5A3D]"
                  : disabled
                    ? "bg-white text-[#c0c0c0] border-[#EEE7DA] cursor-not-allowed"
                    : "bg-white text-[#4a4a4a] border-[#EEE7DA]"
              }`}
            >
              {active && <Check className="w-3.5 h-3.5" />}
              {o}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const EMPTY: Omit<WeeklyQuestionnaire, "user_id" | "week_start" | "id" | "completed_at"> = {
  breakfast_carbs: [], breakfast_proteins: [], breakfast_fats: [], breakfast_snacks: [],
  lunch_carbs: [], lunch_proteins: [], lunch_fats: [], lunch_snacks: [],
  dinner_carbs: [], dinner_proteins: [], dinner_fats: [], evening_snacks: [],
  vegetables: [], foods_to_avoid: "", allergies: [], extra_cart_items: "",
};

const STEPS = [
  "Breakfast", "Lunch", "Dinner", "Snacks & Vegetables", "Avoid, Allergies & Extras",
];

export default function WeeklyQuestionnairePage() {
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const { generate } = useMealPlan();
  const { toast } = useToast();

  const [step, setStep] = useState(0);
  const [data, setData] = useState(EMPTY);
  const [submitting, setSubmitting] = useState(false);

  // Prefill from existing row (this week) or from profile allergies.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const existing = await fetchCurrentWeekQuestionnaire(user.id);
      if (cancelled) return;
      if (existing) {
        setData({
          breakfast_carbs: existing.breakfast_carbs ?? [],
          breakfast_proteins: existing.breakfast_proteins ?? [],
          breakfast_fats: existing.breakfast_fats ?? [],
          breakfast_snacks: existing.breakfast_snacks ?? [],
          lunch_carbs: existing.lunch_carbs ?? [],
          lunch_proteins: existing.lunch_proteins ?? [],
          lunch_fats: existing.lunch_fats ?? [],
          lunch_snacks: existing.lunch_snacks ?? [],
          dinner_carbs: existing.dinner_carbs ?? [],
          dinner_proteins: existing.dinner_proteins ?? [],
          dinner_fats: existing.dinner_fats ?? [],
          evening_snacks: existing.evening_snacks ?? [],
          vegetables: existing.vegetables ?? [],
          foods_to_avoid: existing.foods_to_avoid ?? "",
          allergies: existing.allergies ?? [],
          extra_cart_items: existing.extra_cart_items ?? "",
        });
      } else {
        const profileAllergies = ((profile as any)?.allergies as string[] | undefined) ?? [];
        setData((d) => ({ ...d, allergies: profileAllergies }));
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  const totalSteps = STEPS.length;
  const progress = ((step + 1) / totalSteps) * 100;
  const isLast = step === totalSteps - 1;

  const set = <K extends keyof typeof data>(key: K, value: (typeof data)[K]) =>
    setData((d) => ({ ...d, [key]: value }));

  const submit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      await saveWeeklyQuestionnaire(user.id, data);
      toast({ title: "Saved this week's preferences" });
      navigate("/dashboard/meal-plan/generating");
      await generate();
    } catch (e: any) {
      toast({ title: "Couldn't save", description: e?.message ?? "Try again", variant: "destructive" });
      setSubmitting(false);
    }
  };

  const stepContent = useMemo(() => {
    switch (step) {
      case 0:
        return (
          <div className="space-y-6">
            <ChipGroup label="Breakfast carbs" options={BREAKFAST_CARBS}
              selected={data.breakfast_carbs} setSelected={(v) => set("breakfast_carbs", v)} max={3} />
            <ChipGroup label="Breakfast proteins" options={BREAKFAST_PROTEINS}
              selected={data.breakfast_proteins} setSelected={(v) => set("breakfast_proteins", v)} max={3} />
            <ChipGroup label="Breakfast fats" options={BREAKFAST_FATS}
              selected={data.breakfast_fats} setSelected={(v) => set("breakfast_fats", v)} max={2} />
            <ChipGroup label="Breakfast snacks (optional)" options={BREAKFAST_SNACKS}
              selected={data.breakfast_snacks} setSelected={(v) => set("breakfast_snacks", v)} max={2}
              hint="Choose 1–2" />
          </div>
        );
      case 1:
        return (
          <div className="space-y-6">
            <ChipGroup label="Lunch carbs" options={LUNCH_CARBS}
              selected={data.lunch_carbs} setSelected={(v) => set("lunch_carbs", v)} max={3} />
            <ChipGroup label="Lunch proteins" options={LUNCH_PROTEINS}
              selected={data.lunch_proteins} setSelected={(v) => set("lunch_proteins", v)} max={3} />
            <ChipGroup label="Lunch fats" options={LUNCH_FATS}
              selected={data.lunch_fats} setSelected={(v) => set("lunch_fats", v)} max={2} />
            <ChipGroup label="Lunch snacks (optional)" options={LUNCH_SNACKS}
              selected={data.lunch_snacks} setSelected={(v) => set("lunch_snacks", v)} max={2}
              hint="Choose 1–2" />
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <ChipGroup label="Dinner carbs" options={DINNER_CARBS}
              selected={data.dinner_carbs} setSelected={(v) => set("dinner_carbs", v)} max={3} />
            <ChipGroup label="Dinner proteins" options={DINNER_PROTEINS}
              selected={data.dinner_proteins} setSelected={(v) => set("dinner_proteins", v)} max={3} />
            <ChipGroup label="Dinner fats" options={DINNER_FATS}
              selected={data.dinner_fats} setSelected={(v) => set("dinner_fats", v)} max={2} />
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <ChipGroup label="Evening snacks (optional)" options={EVENING_SNACKS}
              selected={data.evening_snacks} setSelected={(v) => set("evening_snacks", v)} max={2}
              hint="Choose 1–2" />
            <ChipGroup label="Vegetables for the week" options={VEGETABLES}
              selected={data.vegetables} setSelected={(v) => set("vegetables", v)} max={5} />
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="text-[15px] font-bold text-[#1a1a1a]">Foods to avoid this week</h3>
              <p className="text-[12px] text-[#6b6b6b] -mt-1">Anything you don't want in your plan (e.g. mushrooms, spicy food).</p>
              <Textarea
                value={data.foods_to_avoid}
                onChange={(e) => set("foods_to_avoid", e.target.value)}
                placeholder="e.g. mushrooms, olives, spicy food"
                rows={3}
              />
            </div>
            <ChipGroup label="Allergies & dietary restrictions" options={ALLERGY_OPTIONS}
              selected={data.allergies} setSelected={(v) => set("allergies", v)} max={ALLERGY_OPTIONS.length} />
            <div className="space-y-2">
              <h3 className="text-[15px] font-bold text-[#1a1a1a]">Extra shopping cart items</h3>
              <p className="text-[12px] text-[#6b6b6b] -mt-1">We'll add these to your grocery list this week.</p>
              <Textarea
                value={data.extra_cart_items}
                onChange={(e) => set("extra_cart_items", e.target.value)}
                placeholder="e.g. paper towels, coffee, baby wipes"
                rows={3}
              />
            </div>
          </div>
        );
    }
  }, [step, data]);

  return (
    <div className="w-full max-w-3xl mx-auto -mx-4 px-4 pb-6 min-h-full bg-white flex flex-col">
      <div className="flex items-center gap-3 pt-2 pb-2">
        <button
          onClick={() => (step === 0 ? navigate(-1) : setStep((s) => s - 1))}
          aria-label="Back"
          className="p-2 -ml-2"
        >
          <ArrowLeft className="w-5 h-5 text-[#1a1a1a]" />
        </button>
        <span className="text-[12px] font-medium text-[#6b6b6b]">Step {step + 1} of {totalSteps} · {STEPS[step]}</span>
      </div>
      <div className="h-1.5 bg-[#F0EAD8] rounded-full overflow-hidden mb-4">
        <div className="h-full bg-[#1F5A3D] transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <h1 className="text-[22px] font-extrabold text-[#1a1a1a]">Build Your Perfect Meal Plan</h1>
      <p className="text-[13px] text-[#6b6b6b] mt-1 mb-5">
        Tell us what you enjoy eating this week, and we'll create recipes you'll actually look forward to eating.
      </p>

      <div className="flex-1">{stepContent}</div>

      <div className="pt-6">
        <button
          onClick={() => (isLast ? submit() : setStep((s) => s + 1))}
          disabled={submitting}
          className="w-full bg-[#1F5A3D] disabled:opacity-60 text-white font-bold py-4 rounded-2xl text-[16px] active:scale-[0.99] transition-transform"
        >
          {submitting ? "Saving…" : isLast ? "Save & Generate Meal Plan" : "Next"}
        </button>
      </div>
    </div>
  );
}
