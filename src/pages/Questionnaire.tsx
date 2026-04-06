import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QuestionnaireStep } from "@/components/questionnaire/QuestionnaireStep";
import { OptionChip } from "@/components/questionnaire/OptionChip";
import { MultiChip } from "@/components/questionnaire/MultiChip";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, Sparkles, CheckCircle2, DollarSign } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { trackEvent } from "@/lib/analytics";
import { motion } from "framer-motion";

const TOTAL_STEPS = 11;

const HOUSEHOLD_OPTIONS = [
  { value: 1, label: "Just me", icon: "👤" },
  { value: 2, label: "2 people", icon: "👥" },
  { value: 3, label: "3 people", icon: "👨‍👩‍👦" },
  { value: 4, label: "4 people", icon: "👨‍👩‍👧‍👦" },
  { value: 5, label: "5 people", icon: "👨‍👩‍👧‍👦" },
  { value: 6, label: "6 people", icon: "🏠" },
  { value: 7, label: "7 people", icon: "🏠" },
  { value: 8, label: "8+ people", icon: "🏡" },
];

const CHILDREN_AGE_OPTIONS = [
  { value: "none", label: "No children" },
  { value: "0-1", label: "0–1 years" },
  { value: "1-4", label: "1–4 years" },
  { value: "5-10", label: "5–10 years" },
  { value: "11-17", label: "11–17 years" },
];

const STORE_OPTIONS = [
  "Walmart", "Target", "Costco", "Sam's Club", "Trader Joe's",
  "Whole Foods", "Kroger", "Safeway", "Albertsons", "Aldi",
  "Sprouts", "Other",
];

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Gluten-Free", "Dairy-Free",
  "Keto", "Paleo", "Halal", "Kosher", "Low-Sodium", "None",
];

const ELIGIBILITY_OPTIONS = [
  { value: "snap", label: "SNAP / EBT recipient" },
  { value: "teacher", label: "Teacher / Educator" },
  { value: "student", label: "Student" },
  { value: "military", label: "Military / Veteran" },
  { value: "first_responder", label: "First Responder" },
  { value: "general", label: "None of these" },
];

const REFERRAL_OPTIONS = [
  "TikTok", "Instagram", "Friend / Family", "School",
  "Food bank / community resource", "Search / Google", "Other",
];

const STORAGE_KEY = "hth_onboarding_progress";

function loadProgress(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveProgress(data: Record<string, unknown>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function clearProgress() {
  localStorage.removeItem(STORAGE_KEY);
}

export default function Questionnaire() {
  const saved = loadProgress();
  const [step, setStep] = useState<number>((saved.step as number) || 1);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("questionnaire_completed")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.questionnaire_completed) {
          clearProgress();
          navigate("/dashboard", { replace: true });
        }
      });
  }, [user, navigate]);

  // State
  const [householdSize, setHouseholdSize] = useState<number | null>((saved.householdSize as number) ?? null);
  const [childrenAges, setChildrenAges] = useState<string[]>((saved.childrenAges as string[]) || []);
  const [infantFormula, setInfantFormula] = useState<string>((saved.infantFormula as string) || "");
  const [weeklyBudget, setWeeklyBudget] = useState<string>((saved.weeklyBudget as string) || "");
  const [zipCode, setZipCode] = useState<string>((saved.zipCode as string) || "");
  const [selectedStores, setSelectedStores] = useState<string[]>((saved.selectedStores as string[]) || []);
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>((saved.dietaryPrefs as string[]) || []);
  const [userType, setUserType] = useState<string>((saved.userType as string) || "");
  const [referralSource, setReferralSource] = useState<string>((saved.referralSource as string) || "");
  const [loading, setLoading] = useState(false);

  // Location
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [userLatitude, setUserLatitude] = useState<number | null>(null);
  const [userLongitude, setUserLongitude] = useState<number | null>(null);
  const [locationCity, setLocationCity] = useState("");

  useEffect(() => { trackEvent("onboarding_started"); }, []);

  useEffect(() => {
    saveProgress({
      step, householdSize, childrenAges, infantFormula, weeklyBudget,
      zipCode, selectedStores, dietaryPrefs, userType, referralSource,
    });
  }, [step, householdSize, childrenAges, infantFormula, weeklyBudget, zipCode, selectedStores, dietaryPrefs, userType, referralSource]);

  const toggleMulti = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  // For children ages: selecting "none" clears others, selecting an age clears "none"
  const toggleChildAge = (value: string) => {
    if (value === "none") {
      setChildrenAges(childrenAges.includes("none") ? [] : ["none"]);
    } else {
      const without = childrenAges.filter((v) => v !== "none");
      if (without.includes(value)) {
        setChildrenAges(without.filter((v) => v !== value));
      } else {
        setChildrenAges([...without, value]);
      }
    }
  };

  const hasInfants = childrenAges.includes("0-1");

  const requestLocation = async () => {
    setLocationStatus("requesting");
    try {
      const isNative = Capacitor.isNativePlatform();
      if (isNative) {
        const perm = await Geolocation.requestPermissions();
        if (perm.location !== "granted") { setLocationStatus("denied"); return; }
      }
      const position = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 10000 });
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      setUserLatitude(lat);
      setUserLongitude(lng);
      setLocationStatus("granted");
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`, {
          headers: { "User-Agent": "HelpTheHive/1.0" },
        });
        const data = await res.json();
        if (data?.address?.postcode) setZipCode(data.address.postcode.slice(0, 5));
        if (data?.address?.city || data?.address?.town || data?.address?.village) {
          setLocationCity(data.address.city || data.address.town || data.address.village);
        }
      } catch {}
    } catch {
      setLocationStatus("denied");
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const budgetNum = parseFloat(weeklyBudget) || 75;
      const normalizedType = userType || "general";
      const cleanDietary = dietaryPrefs.filter((d) => d !== "None");

      const { error } = await supabase.from("profiles").update({
        household_size: householdSize ?? 2,
        weekly_budget: budgetNum,
        zip_code: zipCode,
        preferred_stores: selectedStores,
        eligibility_category: normalizedType === "general" ? null : normalizedType,
        user_type: normalizedType,
        referral_source: referralSource || null,
        dietary_preferences: cleanDietary.length > 0 ? cleanDietary : null,
        children_ages: childrenAges.includes("none") ? [] : childrenAges,
        infant_formula: hasInfants ? infantFormula === "yes" : null,
        questionnaire_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        beta_user: true,
        verification_status: "not_started",
        membership_tier: "standard",
        latitude: userLatitude,
        longitude: userLongitude,
        city: locationCity || null,
      }).eq("user_id", user.id);

      if (error) throw error;

      trackEvent("onboarding_completed", {
        household_size: householdSize,
        weekly_budget: budgetNum,
        user_type: normalizedType,
        stores_count: selectedStores.length,
        referral_source: referralSource,
        children_ages: childrenAges,
        dietary_preferences: cleanDietary,
      });

      clearProgress();
      toast({ title: "You're in!", description: "Welcome to Help the Hive Beta." });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  // Determine the actual visual step (skipping step 4 if no infants)
  const next = () => {
    let nextStep = step + 1;
    // Skip step 4 (infant formula) if no infants selected
    if (nextStep === 4 && !hasInfants) nextStep = 5;
    trackEvent("onboarding_step_completed", { step_number: step, step_name: stepName(step) });
    setStep(Math.min(nextStep, TOTAL_STEPS));
  };

  const back = () => {
    let prevStep = step - 1;
    // Skip step 4 going back if no infants
    if (prevStep === 4 && !hasInfants) prevStep = 3;
    setStep(Math.max(prevStep, 1));
  };

  function stepName(s: number) {
    const names: Record<number, string> = {
      1: "welcome", 2: "household_size", 3: "children_ages",
      4: "infant_formula", 5: "weekly_budget", 6: "zip_code",
      7: "preferred_stores", 8: "dietary_preferences", 9: "user_type",
      10: "referral_source", 11: "completion",
    };
    return names[s] || "unknown";
  }

  // Calculate visual progress (account for skipped step 4)
  const effectiveTotal = hasInfants ? TOTAL_STEPS : TOTAL_STEPS - 1;
  const effectiveStep = !hasInfants && step > 4 ? step - 1 : step;

  return (
    <div className="min-h-dvh bg-background">

      {/* Step 1: Welcome */}
      {step === 1 && (
        <QuestionnaireStep step={effectiveStep} totalSteps={effectiveTotal} title="Welcome to Help the Hive" subtitle="Smart meal planning that saves you money on groceries — personalized for your household." onNext={next}>
          <div className="flex flex-col items-center mt-8 space-y-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }} className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary" />
            </motion.div>
            <div className="text-center space-y-3 max-w-xs">
              <p className="text-sm text-muted-foreground leading-relaxed">We'll ask a few quick questions to personalize your meal plans, grocery lists, and budget insights.</p>
              <p className="text-xs text-muted-foreground/70">Takes about 2 minutes</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Free Beta Access
            </div>
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 2: Household Size */}
      {step === 2 && (
        <QuestionnaireStep step={effectiveStep} totalSteps={effectiveTotal} title="How many people live in your household?" subtitle="This helps us size your meal plans." onNext={next} onBack={back} nextDisabled={householdSize === null}>
          <div className="grid grid-cols-2 gap-3 mt-4">
            {HOUSEHOLD_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setHouseholdSize(opt.value)} className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 transition-all ${householdSize === opt.value ? "bg-primary/10 border-primary" : "bg-card border-border hover:border-primary/30"}`}>
                <span className="text-2xl">{opt.icon}</span>
                <span className={`text-sm font-medium ${householdSize === opt.value ? "text-foreground" : "text-muted-foreground"}`}>{opt.label}</span>
              </button>
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 3: Children Ages */}
      {step === 3 && (
        <QuestionnaireStep step={effectiveStep} totalSteps={effectiveTotal} title="Do any children live in your household?" subtitle="Select all that apply." onNext={next} onBack={back} optional onSkip={next}>
          <div className="space-y-3 mt-4">
            {CHILDREN_AGE_OPTIONS.map((opt) => (
              <OptionChip key={opt.value} label={opt.label} selected={childrenAges.includes(opt.value)} onClick={() => toggleChildAge(opt.value)} />
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 4: Infant Formula (conditional) */}
      {step === 4 && hasInfants && (
        <QuestionnaireStep step={effectiveStep} totalSteps={effectiveTotal} title="Does your household purchase infant formula?" subtitle="This helps us include formula-friendly budgeting." onNext={next} onBack={back} nextDisabled={!infantFormula}>
          <div className="space-y-3 mt-4">
            <OptionChip label="Yes" selected={infantFormula === "yes"} onClick={() => setInfantFormula("yes")} />
            <OptionChip label="No" selected={infantFormula === "no"} onClick={() => setInfantFormula("no")} />
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 5: Weekly Budget */}
      {step === 5 && (
        <QuestionnaireStep step={effectiveStep} totalSteps={effectiveTotal} title="What's your typical weekly grocery budget?" subtitle="We'll optimize meals to fit your budget." onNext={next} onBack={back} nextDisabled={!weeklyBudget || parseFloat(weeklyBudget) <= 0}>
          <div className="mt-6 space-y-5">
            <div className="relative">
              <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
              <Input value={weeklyBudget} onChange={(e) => setWeeklyBudget(e.target.value.replace(/[^\d.]/g, ""))} placeholder="75" className="text-center text-3xl font-bold h-20 rounded-2xl border-2 pl-12" inputMode="decimal" />
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {[50, 75, 100, 150, 200, 250, 300].map((amt) => (
                <button key={amt} onClick={() => setWeeklyBudget(String(amt))} className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${weeklyBudget === String(amt) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/30"}`}>
                  {amt === 300 ? "$300+" : `$${amt}`}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground text-center">You can always change this later in settings</p>
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 6: ZIP Code */}
      {step === 6 && (
        <QuestionnaireStep step={effectiveStep} totalSteps={effectiveTotal} title="What ZIP code do you shop in most often?" subtitle="We'll find stores and prices near you." onNext={next} onBack={back} nextDisabled={zipCode.length < 5}>
          <div className="mt-4 space-y-5">
            {locationStatus === "idle" && (
              <button onClick={requestLocation} className="w-full flex items-center justify-center gap-3 h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-md hover:opacity-90 transition-opacity">
                <MapPin className="w-5 h-5" />
                Use My Location
              </button>
            )}
            {locationStatus === "requesting" && (
              <div className="w-full flex items-center justify-center gap-3 h-14 rounded-2xl bg-muted text-muted-foreground font-medium">
                <Loader2 className="w-5 h-5 animate-spin" />
                Finding your location...
              </div>
            )}
            {locationStatus === "granted" && (
              <div className="flex items-center gap-3 bg-primary/10 border-2 border-primary rounded-2xl px-4 py-3">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{locationCity ? `📍 ${locationCity}` : "📍 Location found"}</p>
                  <p className="text-xs text-muted-foreground">We'll show nearby stores and local prices</p>
                </div>
              </div>
            )}
            {locationStatus === "denied" && (
              <div className="flex items-center gap-3 bg-muted/50 rounded-2xl px-4 py-3">
                <MapPin className="w-5 h-5 text-muted-foreground shrink-0" />
                <p className="text-sm text-muted-foreground">No worries! Just enter your ZIP code below.</p>
              </div>
            )}
            {locationStatus !== "granted" && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">{locationStatus === "idle" ? "or enter manually" : "Enter your ZIP code"}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            <Input value={zipCode} onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))} placeholder="e.g. 75001" className="text-center text-2xl font-bold h-16 rounded-2xl border-2" inputMode="numeric" maxLength={5} />
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 7: Preferred Stores */}
      {step === 7 && (
        <QuestionnaireStep step={effectiveStep} totalSteps={effectiveTotal} title="Where do you usually shop?" subtitle="Select all that apply." onNext={() => { trackEvent("preferred_store_selected", { count: selectedStores.length, stores: selectedStores }); next(); }} onBack={back}>
          <div className="flex flex-wrap gap-2.5 mt-4">
            {STORE_OPTIONS.map((store) => (
              <MultiChip key={store} label={store} selected={selectedStores.includes(store)} onClick={() => toggleMulti(selectedStores, setSelectedStores, store)} />
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 8: Dietary Preferences */}
      {step === 8 && (
        <QuestionnaireStep step={effectiveStep} totalSteps={effectiveTotal} title="Do you follow any dietary preferences?" subtitle="Select all that apply." onNext={next} onBack={back} optional onSkip={next}>
          <div className="flex flex-wrap gap-2.5 mt-4">
            {DIETARY_OPTIONS.map((pref) => (
              <MultiChip key={pref} label={pref} selected={dietaryPrefs.includes(pref)} onClick={() => {
                if (pref === "None") {
                  setDietaryPrefs(dietaryPrefs.includes("None") ? [] : ["None"]);
                } else {
                  const without = dietaryPrefs.filter((d) => d !== "None");
                  if (without.includes(pref)) {
                    setDietaryPrefs(without.filter((d) => d !== pref));
                  } else {
                    setDietaryPrefs([...without, pref]);
                  }
                }
              }} />
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 9: User Type / Eligibility */}
      {step === 9 && (
        <QuestionnaireStep step={effectiveStep} totalSteps={effectiveTotal} title="Do any of these apply to you?" subtitle="This is optional and for tracking only. No proof required during beta." onNext={() => { trackEvent("user_type_selected", { user_type: userType }); next(); }} onBack={back} nextDisabled={!userType}>
          <div className="space-y-3 mt-4">
            {ELIGIBILITY_OPTIONS.map((opt) => (
              <OptionChip key={opt.value} label={opt.label} selected={userType === opt.value} onClick={() => setUserType(opt.value)} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">During beta, all features are free. No verification needed.</p>
        </QuestionnaireStep>
      )}

      {/* Step 10: Referral Source */}
      {step === 10 && (
        <QuestionnaireStep step={effectiveStep} totalSteps={effectiveTotal} title="How did you hear about us?" subtitle="This helps us grow." onNext={next} onBack={back} optional onSkip={next}>
          <div className="space-y-3 mt-4">
            {REFERRAL_OPTIONS.map((opt) => (
              <OptionChip key={opt} label={opt} selected={referralSource === opt} onClick={() => setReferralSource(opt)} />
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 11: Completion */}
      {step === 11 && (
        <QuestionnaireStep step={effectiveStep} totalSteps={effectiveTotal} title="You're in!" onNext={handleSubmit} onBack={back} nextLabel={loading ? "Setting up..." : "Continue to App"} loading={loading}>
          <div className="flex flex-col items-center mt-8 space-y-6">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }} className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-12 h-12 text-primary" />
            </motion.div>
            <div className="text-center space-y-2 max-w-xs">
              <h2 className="text-xl font-bold text-foreground">Welcome to Help the Hive Beta</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">Your personalized meal plans, grocery lists, and budget insights are ready to be generated.</p>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              Free Beta Access — All Features Unlocked
            </div>
          </div>
        </QuestionnaireStep>
      )}
    </div>
  );
}
