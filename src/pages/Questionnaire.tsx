import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QuestionnaireStep } from "@/components/questionnaire/QuestionnaireStep";
import { OptionChip } from "@/components/questionnaire/OptionChip";
import { MultiChip } from "@/components/questionnaire/MultiChip";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { MapPin, Loader2, Sparkles, CheckCircle2, DollarSign, Store, AlertCircle, Check } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { trackEvent } from "@/lib/analytics";
import { motion } from "framer-motion";
import { useZipValidation } from "@/hooks/useZipValidation";

const TOTAL_STEPS = 9;

const HOME_STORE_OPTIONS = [
  "Aldi", "Trader Joe's", "Whole Foods", "Target",
  "Safeway / Albertsons", "H-E-B", "Publix", "Costco",
  "Sam's Club", "Sprouts", "Other",
];

const DIETARY_OPTIONS = [
  "Vegetarian", "Vegan", "Gluten-free", "Dairy-free",
  "Nut allergy", "No seafood", "Halal", "Kosher",
];

const COOKING_CONFIDENCE_OPTIONS = [
  { value: "beginner", label: "🍳 Just starting out — keep it simple" },
  { value: "intermediate", label: "🔥 I can handle most recipes" },
  { value: "advanced", label: "👨‍🍳 I love to cook" },
];

const PANTRY_STAPLES = [
  "Rice", "Beans", "Eggs", "Pasta", "Flour", "Oil", "Sugar",
  "Canned Tomatoes", "Onions", "Garlic", "Butter", "Milk", "Bread", "Cheese",
];

const STORAGE_KEY = "hth_onboarding_progress";

function loadLocalProgress(): Record<string, unknown> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalProgress(data: Record<string, unknown>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

function clearProgress() {
  localStorage.removeItem(STORAGE_KEY);
}

function defaultBudget(size: number): number {
  if (size <= 1) return 100;
  if (size === 2) return 150;
  if (size === 3) return 185;
  if (size === 4) return 220;
  return 220 + (size - 4) * 35;
}

export default function Questionnaire() {
  const localSeed = loadLocalProgress();
  const [step, setStep] = useState<number>((localSeed.step as number) || 1);
  const [hydrated, setHydrated] = useState(false);
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("questionnaire_completed, questionnaire_progress")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (cancelled) return;
        if (data?.questionnaire_completed) {
          clearProgress();
          navigate("/dashboard", { replace: true });
          return;
        }
        const dbProgress = (data?.questionnaire_progress ?? null) as
          | Record<string, unknown>
          | null;
        if (dbProgress && typeof dbProgress === "object") {
          if (typeof dbProgress.step === "number") setStep(dbProgress.step);
          if (typeof dbProgress.householdSize === "number") setHouseholdSize(dbProgress.householdSize);
          if (typeof dbProgress.hasYoungKids === "boolean") setHasYoungKids(dbProgress.hasYoungKids);
          if (typeof dbProgress.weeklyBudget === "number") setWeeklyBudget(dbProgress.weeklyBudget);
          if (typeof dbProgress.budgetTouched === "boolean") setBudgetTouched(dbProgress.budgetTouched);
          if (typeof dbProgress.homeStore === "string") setHomeStore(dbProgress.homeStore);
          if (typeof dbProgress.zipCode === "string") setZipCode(dbProgress.zipCode);
          if (Array.isArray(dbProgress.dietaryPrefs)) setDietaryPrefs(dbProgress.dietaryPrefs as string[]);
          if (typeof dbProgress.cookingConfidence === "string") setCookingConfidence(dbProgress.cookingConfidence);
          if (Array.isArray(dbProgress.pantryStarter)) setPantryStarter(dbProgress.pantryStarter as string[]);
        }
        setHydrated(true);
      })
      .then(undefined, (e) => {
        console.warn("[Questionnaire] profile load failed", e);
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  const [householdSize, setHouseholdSize] = useState<number>((localSeed.householdSize as number) ?? 2);
  const [hasYoungKids, setHasYoungKids] = useState<boolean>((localSeed.hasYoungKids as boolean) ?? false);
  const [weeklyBudget, setWeeklyBudget] = useState<number>((localSeed.weeklyBudget as number) || defaultBudget(2));
  const [budgetTouched, setBudgetTouched] = useState<boolean>((localSeed.budgetTouched as boolean) ?? false);
  const [homeStore, setHomeStore] = useState<string>((localSeed.homeStore as string) || "");
  const [zipCode, setZipCode] = useState<string>((localSeed.zipCode as string) || "");
  const [dietaryPrefs, setDietaryPrefs] = useState<string[]>((localSeed.dietaryPrefs as string[]) || []);
  const [cookingConfidence, setCookingConfidence] = useState<string>((localSeed.cookingConfidence as string) || "");
  const [pantryStarter, setPantryStarter] = useState<string[]>((localSeed.pantryStarter as string[]) || []);
  const [loading, setLoading] = useState(false);
  const zipValidation = useZipValidation(zipCode);

  useEffect(() => {
    if (!budgetTouched) setWeeklyBudget(defaultBudget(householdSize));
  }, [householdSize, budgetTouched]);

  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");
  const [userLatitude, setUserLatitude] = useState<number | null>(null);
  const [userLongitude, setUserLongitude] = useState<number | null>(null);
  const [locationCity, setLocationCity] = useState("");

  useEffect(() => { trackEvent("onboarding_started"); }, []);

  useEffect(() => {
    const progress = {
      step, householdSize, hasYoungKids, weeklyBudget, budgetTouched,
      homeStore, zipCode, dietaryPrefs, cookingConfidence, pantryStarter,
    };
    saveLocalProgress(progress);
    if (!user || !hydrated) return;
    const t = setTimeout(() => {
      supabase
        .from("profiles")
        .update({ questionnaire_progress: progress })
        .eq("user_id", user.id)
        .then(({ error }) => {
          if (error && import.meta.env.DEV) {
            console.error("Failed to persist onboarding progress to DB", error);
          }
        });
    }, 400);
    return () => clearTimeout(t);
  }, [user, hydrated, step, householdSize, hasYoungKids, weeklyBudget, budgetTouched, homeStore, zipCode, dietaryPrefs, cookingConfidence, pantryStarter]);

  const togglePantryItem = (item: string) => {
    setPantryStarter((prev) => prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]);
  };

  const toggleDietary = (item: string) => {
    setDietaryPrefs((prev) => prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]);
  };

  const requestLocation = async () => {
    setLocationStatus("requesting");
    try {
      const isNative = Capacitor.isNativePlatform();
      const { Geolocation } = await import("@capacitor/geolocation");
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
      // Seed pantry items the user said they have
      if (pantryStarter.length > 0) {
        const pantryRows = pantryStarter.map((item) => ({
          user_id: user.id,
          item_name: item,
          quantity: "Some",
          category: "Staples",
        }));
        await supabase.from("pantry_items").insert(pantryRows);
      }

      const { error } = await supabase.from("profiles").update({
        household_size: householdSize,
        children_ages: hasYoungKids ? ["0-4"] : [],
        weekly_budget: weeklyBudget,
        home_store: homeStore,
        preferred_stores: homeStore ? [homeStore] : [],
        zip_code: zipCode,
        dietary_preferences: dietaryPrefs,
        cooking_confidence: cookingConfidence || null,
        questionnaire_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        beta_user: true,
        latitude: userLatitude,
        longitude: userLongitude,
        city: locationCity || null,
      }).eq("user_id", user.id);

      if (error) throw error;

      await refreshProfile();

      trackEvent("onboarding_completed", {
        household_size: householdSize,
        weekly_budget: weeklyBudget,
        home_store: homeStore,
        cooking_confidence: cookingConfidence,
        pantry_starter_count: pantryStarter.length,
        dietary_preferences: dietaryPrefs,
      });

      clearProgress();
      toast({
        title: "You're in! 💚",
        description: "Welcome to Help The Hive — free for every family.",
      });
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    trackEvent("onboarding_step_completed", { step_number: step, step_name: stepName(step) });
    setStep(Math.min(step + 1, TOTAL_STEPS));
  };

  const back = () => setStep(Math.max(step - 1, 1));

  function stepName(s: number) {
    const names: Record<number, string> = {
      1: "welcome",
      2: "household_size",
      3: "weekly_budget",
      4: "home_store",
      5: "zip_code",
      6: "dietary_preferences",
      7: "cooking_confidence",
      8: "pantry_check",
      9: "completion",
    };
    return names[s] || "unknown";
  }

  if (user && !hydrated) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">

      {/* Step 1: Welcome */}
      {step === 1 && (
        <QuestionnaireStep
          step={1}
          totalSteps={TOTAL_STEPS}
          title="Welcome to Help The Hive 🐝"
          subtitle="Free meal planning for every family. Let's set you up in 60 seconds."
          onNext={next}
        >
          <div className="flex flex-col items-center mt-8 space-y-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center"
            >
              <Sparkles className="w-10 h-10 text-primary" />
            </motion.div>
            <div className="text-center space-y-3 max-w-xs">
              <p className="text-sm text-muted-foreground leading-relaxed">
                We'll ask a few quick questions to build your first weekly meal plan.
              </p>
              <p className="text-xs text-muted-foreground/70">Takes about 60 seconds — 100% free, no payment ever.</p>
            </div>

            <div className="w-full max-w-sm rounded-2xl border border-border bg-muted/40 px-4 py-3 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary mb-1">
                A quick note on health & pricing
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Help The Hive provides planning and budgeting tools only — not medical or nutritional advice.
                Prices shown are estimates; final pricing is confirmed at Instacart checkout.
              </p>
            </div>
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 2: Household Size */}
      {step === 2 && (
        <QuestionnaireStep
          step={2}
          totalSteps={TOTAL_STEPS}
          title="How many people are you cooking for?"
          onNext={next}
          onBack={back}
        >
          <div className="mt-8 flex flex-col items-center space-y-6">
            <div className="flex items-center gap-6">
              <button
                onClick={() => setHouseholdSize(Math.max(1, householdSize - 1))}
                className="w-14 h-14 rounded-2xl border-2 border-border bg-card text-2xl font-bold text-foreground hover:border-primary/30 transition-all"
                aria-label="Decrease"
              >
                −
              </button>
              <div className="text-6xl font-bold text-foreground tabular-nums w-24 text-center">
                {householdSize}
              </div>
              <button
                onClick={() => setHouseholdSize(Math.min(12, householdSize + 1))}
                className="w-14 h-14 rounded-2xl border-2 border-border bg-card text-2xl font-bold text-foreground hover:border-primary/30 transition-all"
                aria-label="Increase"
              >
                +
              </button>
            </div>
            <p className="text-sm text-muted-foreground">{householdSize === 1 ? "Just you" : `${householdSize} people`}</p>

            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <input
                type="checkbox"
                checked={hasYoungKids}
                onChange={(e) => setHasYoungKids(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-border accent-primary"
              />
              <span className="text-sm text-foreground">Include kids under 5 (we'll adjust portion sizes)</span>
            </label>
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 3: Weekly Budget */}
      {step === 3 && (
        <QuestionnaireStep
          step={3}
          totalSteps={TOTAL_STEPS}
          title="What's your weekly grocery budget?"
          subtitle="We'll build meal plans that fit inside this budget."
          onNext={next}
          onBack={back}
        >
          <div className="mt-8 space-y-8">
            <div className="text-center">
              <div className="inline-flex items-baseline">
                <DollarSign className="w-8 h-8 text-primary self-center" />
                <span className="text-6xl font-bold text-foreground tabular-nums">{weeklyBudget}</span>
                <span className="text-lg text-muted-foreground ml-1">/ week</span>
              </div>
            </div>

            <Slider
              value={[weeklyBudget]}
              onValueChange={(v) => { setWeeklyBudget(v[0]); setBudgetTouched(true); }}
              min={50}
              max={500}
              step={5}
              className="w-full"
            />

            <div className="flex justify-between text-xs text-muted-foreground">
              <span>$50</span>
              <span>$500</span>
            </div>

            <p className="text-xs text-muted-foreground text-center">You can change this anytime in settings.</p>
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 4: Home Store */}
      {step === 4 && (
        <QuestionnaireStep
          step={4}
          totalSteps={TOTAL_STEPS}
          title="Which store do you shop at most?"
          subtitle="We'll build your meal plan using products available at this store."
          onNext={() => { trackEvent("home_store_selected", { store: homeStore }); next(); }}
          onBack={back}
          nextDisabled={!homeStore}
        >
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            {HOME_STORE_OPTIONS.map((store) => (
              <button
                key={store}
                onClick={() => setHomeStore(store)}
                className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all text-left ${
                  homeStore === store
                    ? "bg-primary/10 border-primary"
                    : "bg-card border-border hover:border-primary/30"
                }`}
              >
                <Store className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-foreground truncate">{store}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Grocery checkout depends on stores Instacart supports in your area. You can change stores anytime.
          </p>
        </QuestionnaireStep>
      )}

      {/* Step 5: ZIP Code */}
      {step === 5 && (
        <QuestionnaireStep
          step={5}
          totalSteps={TOTAL_STEPS}
          title="Your ZIP code?"
          subtitle="Used to find your nearest store and local sale prices."
          onNext={next}
          onBack={back}
          nextDisabled={!zipValidation.isValid}
        >
          <div className="mt-4 space-y-5">
            {locationStatus === "idle" && (
              <button
                onClick={requestLocation}
                className="w-full flex items-center justify-center gap-3 h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-md hover:opacity-90 transition-opacity"
              >
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
            <div>
              <Input
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="e.g. 75001"
                aria-invalid={zipValidation.status === "invalid"}
                aria-describedby="zip-feedback"
                className={`text-center text-2xl font-bold h-16 rounded-2xl border-2 transition-colors ${
                  zipValidation.status === "valid" ? "border-emerald-500 focus-visible:ring-emerald-500/30" :
                  zipValidation.status === "invalid" ? "border-destructive focus-visible:ring-destructive/30" :
                  ""
                }`}
                inputMode="numeric"
                maxLength={5}
              />
              <div id="zip-feedback" className="min-h-5 mt-2 flex items-center justify-center gap-1.5 text-sm" role="status" aria-live="polite">
                {zipValidation.status === "checking" && (
                  <span className="text-muted-foreground flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking…</span>
                )}
                {zipValidation.status === "valid" && (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1.5"><Check className="w-4 h-4" /> {zipValidation.message}</span>
                )}
                {zipValidation.status === "invalid" && (
                  <span className="text-destructive font-medium flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {zipValidation.message}</span>
                )}
                {zipValidation.status === "incomplete" && zipCode.length > 0 && (
                  <span className="text-muted-foreground">{zipValidation.message}</span>
                )}
              </div>
            </div>
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 6: Dietary Preferences (optional) */}
      {step === 6 && (
        <QuestionnaireStep
          step={6}
          totalSteps={TOTAL_STEPS}
          title="Any dietary preferences or allergies?"
          subtitle="Optional — tap any that apply."
          onNext={next}
          onBack={back}
          optional
          onSkip={next}
        >
          <div className="flex flex-wrap gap-2.5 mt-4">
            {DIETARY_OPTIONS.map((pref) => (
              <MultiChip
                key={pref}
                label={pref}
                selected={dietaryPrefs.includes(pref)}
                onClick={() => toggleDietary(pref)}
              />
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 7: Cooking Confidence (optional) */}
      {step === 7 && (
        <QuestionnaireStep
          step={7}
          totalSteps={TOTAL_STEPS}
          title="How comfortable are you in the kitchen?"
          subtitle="We'll calibrate recipe complexity to your skill level."
          onNext={next}
          onBack={back}
          optional
          onSkip={next}
        >
          <div className="space-y-3 mt-4">
            {COOKING_CONFIDENCE_OPTIONS.map((opt) => (
              <OptionChip
                key={opt.value}
                label={opt.label}
                selected={cookingConfidence === opt.value}
                onClick={() => setCookingConfidence(opt.value)}
              />
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 8: Quick Pantry Check (optional) */}
      {step === 8 && (
        <QuestionnaireStep
          step={8}
          totalSteps={TOTAL_STEPS}
          title="Quick pantry check"
          subtitle="Tap anything you already have at home. We'll skip these on your grocery list."
          onNext={next}
          onBack={back}
          optional
          onSkip={next}
        >
          <div className="grid grid-cols-3 gap-2 mt-4">
            {PANTRY_STAPLES.map((item) => (
              <button
                key={item}
                onClick={() => togglePantryItem(item)}
                className={`p-3 rounded-2xl border-2 text-sm font-medium transition-all ${
                  pantryStarter.includes(item)
                    ? "bg-primary/10 border-primary text-foreground"
                    : "bg-card border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                {item}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            {pantryStarter.length > 0
              ? `${pantryStarter.length} item${pantryStarter.length === 1 ? "" : "s"} added to your pantry`
              : "You can add more later in the Pantry tab."}
          </p>
        </QuestionnaireStep>
      )}

      {/* Step 9: All Set */}
      {step === 9 && (
        <QuestionnaireStep
          step={9}
          totalSteps={TOTAL_STEPS}
          title="Perfect — you're all set! 🎉"
          onNext={handleSubmit}
          onBack={back}
          nextLabel={loading ? "Setting up..." : "See My Plan →"}
          loading={loading}
        >
          <div className="flex flex-col items-center mt-8 space-y-6">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5 }}
              className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center"
            >
              <CheckCircle2 className="w-12 h-12 text-primary" />
            </motion.div>
            <div className="text-center space-y-3 max-w-xs">
              <p className="text-base text-foreground leading-relaxed">
                Your first meal plan fits your <strong>${weeklyBudget}/week</strong> budget
                {homeStore && <> at <strong>{homeStore}</strong></>}
                {householdSize > 0 && <>, for <strong>{householdSize} {householdSize === 1 ? "person" : "people"}</strong></>}
                {pantryStarter.length > 0 && <>, using what's already in your kitchen</>}.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-xs font-semibold border border-accent/20">
              <Sparkles className="w-3.5 h-3.5" />
              Free for every family — forever
            </div>
          </div>
        </QuestionnaireStep>
      )}
    </div>
  );
}
