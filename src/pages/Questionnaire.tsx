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
import { Switch } from "@/components/ui/switch";
import { MapPin, Loader2, Sparkles, CheckCircle2, DollarSign, Store, AlertCircle, Check } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { trackEvent } from "@/lib/analytics";
import { motion } from "framer-motion";
import { useZipValidation } from "@/hooks/useZipValidation";
import { useInstacartRetailers } from "@/hooks/useInstacartRetailers";

// 1 welcome + 10 onboarding sections
const TOTAL_STEPS = 10;

const DIETARY_OPTIONS = [
  { key: "vegetarian", label: "Vegetarian" },
  { key: "vegan", label: "Vegan" },
  { key: "gluten_free", label: "Gluten-free" },
  { key: "dairy_free", label: "Dairy-free" },
  { key: "nut_allergy", label: "Nut allergy" },
  { key: "seafood_free", label: "No seafood" },
  { key: "halal", label: "Halal" },
  { key: "kosher", label: "Kosher" },
];

const COOKING_CONFIDENCE_OPTIONS = [
  { value: "beginner", label: "🍳 Beginner — keep it simple" },
  { value: "intermediate", label: "🔥 Intermediate — most recipes work" },
  { value: "advanced", label: "👨‍🍳 Advanced — I love to cook" },
];

const PANTRY_STAPLES = [
  "Rice", "Beans", "Pasta", "Oil", "Eggs", "Milk", "Cheese", "Butter",
  "Flour", "Sugar", "Canned Tomatoes", "Onions", "Garlic", "Bread",
];

const ASSISTANCE_OPTIONS: { key: string; label: string }[] = [
  { key: "assistance_food", label: "Food" },
  { key: "assistance_snap", label: "SNAP / EBT" },
  { key: "assistance_wic", label: "WIC" },
  { key: "assistance_diapers", label: "Diapers" },
  { key: "assistance_housing", label: "Housing" },
  { key: "assistance_utilities", label: "Utilities" },
  { key: "assistance_healthcare", label: "Healthcare" },
  { key: "assistance_employment", label: "Employment" },
  { key: "assistance_transportation", label: "Transportation" },
  { key: "assistance_childcare", label: "Childcare" },
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

type BoolMap = Record<string, boolean>;

export default function Questionnaire() {
  const localSeed = loadLocalProgress();
  const [step, setStep] = useState<number>((localSeed.step as number) || 1);
  const [hydrated, setHydrated] = useState(false);
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  // SECTION 1 — Household
  const [householdSize, setHouseholdSize] = useState<number>((localSeed.householdSize as number) ?? 2);
  const [childrenUnder5, setChildrenUnder5] = useState<number>((localSeed.childrenUnder5 as number) ?? 0);
  const [children5to12, setChildren5to12] = useState<number>((localSeed.children5to12 as number) ?? 0);
  const [teenagers, setTeenagers] = useState<number>((localSeed.teenagers as number) ?? 0);
  const [seniors65plus, setSeniors65plus] = useState<number>((localSeed.seniors65plus as number) ?? 0);

  // SECTION 2 — Budget
  const [weeklyBudget, setWeeklyBudget] = useState<number>((localSeed.weeklyBudget as number) || defaultBudget(2));
  const [budgetTouched, setBudgetTouched] = useState<boolean>((localSeed.budgetTouched as boolean) ?? false);

  // SECTION 3 — Location
  const [zipCode, setZipCode] = useState<string>((localSeed.zipCode as string) || "");
  const [locationCity, setLocationCity] = useState<string>((localSeed.locationCity as string) || "");
  const [locationState, setLocationState] = useState<string>((localSeed.locationState as string) || "");
  const [userLatitude, setUserLatitude] = useState<number | null>(null);
  const [userLongitude, setUserLongitude] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");

  // SECTION 4 — Store (chosen from Instacart-supported retailers for this ZIP)
  const [homeStore, setHomeStore] = useState<string>((localSeed.homeStore as string) || "");

  // SECTION 5 — Family assistance
  const [assistance, setAssistance] = useState<BoolMap>((localSeed.assistance as BoolMap) || {});

  // SECTION 6 — Dietary
  const [dietary, setDietary] = useState<BoolMap>((localSeed.dietary as BoolMap) || {});

  // SECTION 7 — Cooking confidence
  const [cookingConfidence, setCookingConfidence] = useState<string>((localSeed.cookingConfidence as string) || "");

  // SECTION 8 — Pantry defaults
  const [pantryStarter, setPantryStarter] = useState<string[]>((localSeed.pantryStarter as string[]) || []);

  // SECTION 9 — Food waste prefs
  const [foodWasteAlerts, setFoodWasteAlerts] = useState<boolean>((localSeed.foodWasteAlerts as boolean) ?? true);
  const [foodWasteSuggestions, setFoodWasteSuggestions] = useState<boolean>((localSeed.foodWasteSuggestions as boolean) ?? true);


  const [loading, setLoading] = useState(false);
  const zipValidation = useZipValidation(zipCode);
  const retailers = useInstacartRetailers(zipValidation.isValid ? zipCode : null);

  useEffect(() => {
    if (!budgetTouched) setWeeklyBudget(defaultBudget(householdSize));
  }, [householdSize, budgetTouched]);

  useEffect(() => { trackEvent("onboarding_started"); }, []);

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
        const dbProgress = (data?.questionnaire_progress ?? null) as Record<string, unknown> | null;
        if (dbProgress && typeof dbProgress === "object") {
          if (typeof dbProgress.step === "number") setStep(dbProgress.step);
          if (typeof dbProgress.householdSize === "number") setHouseholdSize(dbProgress.householdSize);
          if (typeof dbProgress.childrenUnder5 === "number") setChildrenUnder5(dbProgress.childrenUnder5);
          if (typeof dbProgress.children5to12 === "number") setChildren5to12(dbProgress.children5to12);
          if (typeof dbProgress.teenagers === "number") setTeenagers(dbProgress.teenagers);
          if (typeof dbProgress.seniors65plus === "number") setSeniors65plus(dbProgress.seniors65plus);
          if (typeof dbProgress.weeklyBudget === "number") setWeeklyBudget(dbProgress.weeklyBudget);
          if (typeof dbProgress.budgetTouched === "boolean") setBudgetTouched(dbProgress.budgetTouched);
          if (typeof dbProgress.homeStore === "string") setHomeStore(dbProgress.homeStore);
          if (typeof dbProgress.zipCode === "string") setZipCode(dbProgress.zipCode);
          if (typeof dbProgress.locationCity === "string") setLocationCity(dbProgress.locationCity);
          if (typeof dbProgress.locationState === "string") setLocationState(dbProgress.locationState);
          if (dbProgress.assistance && typeof dbProgress.assistance === "object") setAssistance(dbProgress.assistance as BoolMap);
          if (dbProgress.dietary && typeof dbProgress.dietary === "object") setDietary(dbProgress.dietary as BoolMap);
          if (typeof dbProgress.cookingConfidence === "string") setCookingConfidence(dbProgress.cookingConfidence);
          if (Array.isArray(dbProgress.pantryStarter)) setPantryStarter(dbProgress.pantryStarter as string[]);
          if (typeof dbProgress.foodWasteAlerts === "boolean") setFoodWasteAlerts(dbProgress.foodWasteAlerts);
          if (typeof dbProgress.foodWasteSuggestions === "boolean") setFoodWasteSuggestions(dbProgress.foodWasteSuggestions);
          
          if (dbProgress.goals && typeof dbProgress.goals === "object") setGoals(dbProgress.goals as BoolMap);
        }
        setHydrated(true);
      })
      .then(undefined, (e) => {
        console.warn("[Questionnaire] profile load failed", e);
        if (!cancelled) setHydrated(true);
      });
    return () => { cancelled = true; };
  }, [user, navigate]);

  useEffect(() => {
    const progress = {
      step,
      householdSize, childrenUnder5, children5to12, teenagers, seniors65plus,
      weeklyBudget, budgetTouched,
      zipCode, locationCity, locationState,
      homeStore,
      assistance, dietary,
      cookingConfidence, pantryStarter,
      foodWasteAlerts, foodWasteSuggestions,
      goals,
    };
    saveLocalProgress(progress);
    if (!user || !hydrated) return;
    const t = setTimeout(() => {
      supabase
        .from("profiles")
        .update({ questionnaire_progress: progress })
        .eq("user_id", user.id)
        .then(({ error }) => {
          if (error && import.meta.env.DEV) console.error("Persist progress failed", error);
        });
    }, 400);
    return () => clearTimeout(t);
  }, [
    user, hydrated, step,
    householdSize, childrenUnder5, children5to12, teenagers, seniors65plus,
    weeklyBudget, budgetTouched, zipCode, locationCity, locationState,
    homeStore, assistance, dietary, cookingConfidence, pantryStarter,
    foodWasteAlerts, foodWasteSuggestions, goals,
  ]);

  const toggleBool = (map: BoolMap, key: string, setter: (m: BoolMap) => void) => {
    setter({ ...map, [key]: !map[key] });
  };

  const togglePantryItem = (item: string) => {
    setPantryStarter((prev) => prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item]);
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
        const city = data?.address?.city || data?.address?.town || data?.address?.village;
        if (city) setLocationCity(city);
        if (data?.address?.state) setLocationState(data.address.state);
      } catch {}
    } catch {
      setLocationStatus("denied");
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      if (pantryStarter.length > 0) {
        const pantryRows = pantryStarter.map((item) => ({
          user_id: user.id,
          item_name: item,
          quantity: "Some",
          category: "Staples",
        }));
        await supabase.from("pantry_items").insert(pantryRows);
      }

      const assistanceCols = ASSISTANCE_OPTIONS.reduce((acc, o) => {
        acc[o.key] = !!assistance[o.key];
        return acc;
      }, {} as Record<string, boolean>);

      const goalCols = APOLLO_GOALS.reduce((acc, o) => {
        acc[o.key] = !!goals[o.key];
        return acc;
      }, {} as Record<string, boolean>);

      const dietaryPrefs = DIETARY_OPTIONS
        .filter((o) => dietary[o.key])
        .map((o) => o.label);

      const hasYoungKids = childrenUnder5 > 0;

      const { error } = await supabase.from("profiles").update({
        // Household
        household_size: householdSize,
        children_under_5: childrenUnder5,
        children_5_to_12: children5to12,
        teenagers: teenagers,
        seniors_65_plus: seniors65plus,
        children_ages: hasYoungKids ? ["0-4"] : [],
        // Budget
        weekly_budget: weeklyBudget,
        // Location
        zip_code: zipCode,
        city: locationCity || null,
        state: locationState || null,
        latitude: userLatitude,
        longitude: userLongitude,
        // Store
        home_store: homeStore,
        preferred_stores: homeStore ? [homeStore] : [],
        // Assistance
        ...assistanceCols,
        // Dietary
        dietary_preferences: dietaryPrefs,
        // Cooking
        cooking_confidence: cookingConfidence || null,
        // Food waste
        food_waste_alerts_enabled: foodWasteAlerts,
        food_waste_recipe_suggestions_enabled: foodWasteSuggestions,
        // Apollo
        ...goalCols,
        // Onboarding
        questionnaire_completed: true,
        onboarding_completed_at: new Date().toISOString(),
        beta_user: true,
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
        assistance_count: Object.values(assistanceCols).filter(Boolean).length,
        apollo_goals_count: Object.values(goalCols).filter(Boolean).length,
        
      });

      clearProgress();
      toast({ title: "You're in! 💚", description: "Welcome to Help The Hive — free for every family." });
      navigate("/dashboard", { replace: true });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const next = () => {
    trackEvent("onboarding_step_completed", { step_number: step });
    setStep(Math.min(step + 1, TOTAL_STEPS));
  };
  const back = () => setStep(Math.max(step - 1, 1));

  if (user && !hydrated) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-primary animate-spin" />
      </div>
    );
  }

  const Counter = ({ value, set, min = 0, max = 12, label }: { value: number; set: (n: number) => void; min?: number; max?: number; label: string; }) => (
    <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-3">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <button onClick={() => set(Math.max(min, value - 1))} className="w-9 h-9 rounded-xl border-2 border-border text-lg font-bold">−</button>
        <span className="w-7 text-center font-bold text-foreground tabular-nums">{value}</span>
        <button onClick={() => set(Math.min(max, value + 1))} className="w-9 h-9 rounded-xl border-2 border-border text-lg font-bold">+</button>
      </div>
    </div>
  );

  return (
    <div className="min-h-dvh bg-background">

      {/* STEP 1 — Welcome */}
      {step === 1 && (
        <QuestionnaireStep step={1} totalSteps={TOTAL_STEPS}
          title="Welcome to Help The Hive 🐝"
          subtitle="Free meal planning and family-support tools. Takes about 90 seconds."
          onNext={next}
        >
          <div className="flex flex-col items-center mt-8 space-y-6">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.4 }}
              className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-primary" />
            </motion.div>
            <div className="text-center space-y-3 max-w-xs">
              <p className="text-sm text-muted-foreground leading-relaxed">
                We'll ask a few quick questions to personalize your meal plans, grocery lists, and recommended resources.
              </p>
              <p className="text-xs text-muted-foreground/70">100% free — no payment ever.</p>
            </div>
            <div className="w-full max-w-sm rounded-2xl border border-border bg-muted/40 px-4 py-3 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-primary mb-1">Health & pricing</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Help The Hive provides planning and budgeting tools only — not medical or nutritional advice.
                Prices shown are estimates; final pricing is confirmed at Instacart checkout.
              </p>
            </div>
          </div>
        </QuestionnaireStep>
      )}

      {/* STEP 2 — Section 1: Household */}
      {step === 2 && (
        <QuestionnaireStep step={2} totalSteps={TOTAL_STEPS}
          title="Tell us about your household"
          subtitle="So we can plan portions and recommend the right resources."
          onNext={next} onBack={back}
        >
          <div className="mt-6 space-y-3">
            <Counter value={householdSize} set={setHouseholdSize} min={1} max={20} label="Total people in household" />
            <Counter value={childrenUnder5} set={setChildrenUnder5} label="Children under 5" />
            <Counter value={children5to12} set={setChildren5to12} label="Children 5–12" />
            <Counter value={teenagers} set={setTeenagers} label="Teenagers (13–17)" />
            <Counter value={seniors65plus} set={setSeniors65plus} label="Seniors 65+" />
          </div>
        </QuestionnaireStep>
      )}

      {/* STEP 3 — Section 2: Budget */}
      {step === 3 && (
        <QuestionnaireStep step={3} totalSteps={TOTAL_STEPS}
          title="What's your weekly grocery budget?"
          subtitle="We'll build meal plans that fit inside this budget."
          onNext={next} onBack={back}
        >
          <div className="mt-8 space-y-8">
            <div className="text-center">
              <div className="inline-flex items-baseline">
                <DollarSign className="w-8 h-8 text-primary self-center" />
                <span className="text-6xl font-bold text-foreground tabular-nums">{weeklyBudget}</span>
                <span className="text-lg text-muted-foreground ml-1">/ week</span>
              </div>
            </div>
            <Slider value={[weeklyBudget]} onValueChange={(v) => { setWeeklyBudget(v[0]); setBudgetTouched(true); }} min={50} max={500} step={5} className="w-full" />
            <div className="flex justify-between text-xs text-muted-foreground"><span>$50</span><span>$500</span></div>
            <p className="text-xs text-muted-foreground text-center">You can change this anytime in Settings.</p>
          </div>
        </QuestionnaireStep>
      )}

      {/* STEP 4 — Section 3: Location */}
      {step === 4 && (
        <QuestionnaireStep step={4} totalSteps={TOTAL_STEPS}
          title="Where are you located?"
          subtitle="Used for local stores, SNAP offices, and food banks."
          onNext={next} onBack={back}
          nextDisabled={!zipValidation.isValid}
        >
          <div className="mt-4 space-y-5">
            {locationStatus === "idle" && (
              <button onClick={requestLocation} className="w-full flex items-center justify-center gap-3 h-14 rounded-2xl bg-primary text-primary-foreground font-semibold text-base shadow-md hover:opacity-90 transition-opacity">
                <MapPin className="w-5 h-5" /> Use My Location
              </button>
            )}
            {locationStatus === "requesting" && (
              <div className="w-full flex items-center justify-center gap-3 h-14 rounded-2xl bg-muted text-muted-foreground font-medium">
                <Loader2 className="w-5 h-5 animate-spin" /> Finding your location...
              </div>
            )}
            {locationStatus === "granted" && (
              <div className="flex items-center gap-3 bg-primary/10 border-2 border-primary rounded-2xl px-4 py-3">
                <MapPin className="w-5 h-5 text-primary shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-foreground">{locationCity ? `📍 ${locationCity}${locationState ? ", " + locationState : ""}` : "📍 Location found"}</p>
                  <p className="text-xs text-muted-foreground">We'll show nearby stores and local resources.</p>
                </div>
              </div>
            )}
            {locationStatus !== "granted" && (
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground font-medium">{locationStatus === "idle" ? "or enter manually" : "Enter your ZIP"}</span>
                <div className="flex-1 h-px bg-border" />
              </div>
            )}
            <div>
              <Input
                value={zipCode}
                onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                placeholder="ZIP code"
                aria-invalid={zipValidation.status === "invalid"}
                className={`text-center text-2xl font-bold h-16 rounded-2xl border-2 transition-colors ${
                  zipValidation.status === "valid" ? "border-emerald-500" :
                  zipValidation.status === "invalid" ? "border-destructive" : ""
                }`}
                inputMode="numeric" maxLength={5}
              />
              <div className="min-h-5 mt-2 flex items-center justify-center gap-1.5 text-sm" role="status" aria-live="polite">
                {zipValidation.status === "checking" && <span className="text-muted-foreground flex items-center gap-1.5"><Loader2 className="w-3.5 h-3.5 animate-spin" /> Checking…</span>}
                {zipValidation.status === "valid" && <span className="text-emerald-700 font-semibold flex items-center gap-1.5"><Check className="w-4 h-4" /> {zipValidation.message}</span>}
                {zipValidation.status === "invalid" && <span className="text-destructive font-medium flex items-center gap-1.5"><AlertCircle className="w-4 h-4" /> {zipValidation.message}</span>}
                {zipValidation.status === "incomplete" && zipCode.length > 0 && <span className="text-muted-foreground">{zipValidation.message}</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Input value={locationCity} onChange={(e) => setLocationCity(e.target.value)} placeholder="City (optional)" />
                <Input value={locationState} onChange={(e) => setLocationState(e.target.value)} placeholder="State (optional)" maxLength={2} />
              </div>
            </div>
          </div>
        </QuestionnaireStep>
      )}

      {/* STEP 5 — Section 4: Store (live Instacart-supported retailers for this ZIP) */}
      {step === 5 && (
        <QuestionnaireStep step={5} totalSteps={TOTAL_STEPS}
          title="Which store do you shop at most?"
          subtitle={zipCode ? `Showing stores near ${zipCode}.` : "Enter your ZIP code first so we can show stores near you."}
          onNext={() => { trackEvent("home_store_selected", { store: homeStore }); next(); }}
          onBack={back}
          nextDisabled={!homeStore}
        >
          {!zipValidation.isValid && (
            <div className="mt-4 p-4 rounded-2xl border border-border bg-card text-sm text-muted-foreground text-center">
              Please go back and enter a valid 5-digit ZIP code.
            </div>
          )}
          {zipValidation.isValid && retailers.loading && (
            <div className="mt-4 flex items-center justify-center gap-2 p-6 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Loading stores near {zipCode}…
            </div>
          )}
          {zipValidation.isValid && !retailers.loading && retailers.error && (
            <div className="mt-4 p-4 rounded-2xl border border-destructive/30 bg-destructive/5 text-sm text-destructive">
              Couldn't load stores for ZIP {zipCode}. {retailers.error}
            </div>
          )}
          {zipValidation.isValid && !retailers.loading && !retailers.error && retailers.retailers.length === 0 && (
            <div className="mt-4 p-4 rounded-2xl border border-border bg-card text-sm text-muted-foreground text-center">
              No stores were found for ZIP {zipCode}.
            </div>
          )}
          {zipValidation.isValid && !retailers.loading && retailers.retailers.length > 0 && (
            <div className="grid grid-cols-2 gap-2.5 mt-4 max-h-[420px] overflow-y-auto pr-1">
              {retailers.retailers.map((r) => (
                <button key={r.retailer_key} onClick={() => setHomeStore(r.name)}
                  className={`flex items-center gap-2 p-3 rounded-2xl border-2 transition-all text-left ${
                    homeStore === r.name ? "bg-primary/10 border-primary" : "bg-card border-border hover:border-primary/30"
                  }`}>
                  {r.retailer_logo_url ? (
                    <img src={r.retailer_logo_url} alt="" className="w-6 h-6 rounded object-contain shrink-0" loading="lazy" />
                  ) : (
                    <Store className="w-4 h-4 text-primary shrink-0" />
                  )}
                  <span className="text-sm font-medium text-foreground truncate">{r.name}</span>
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-muted-foreground mt-4 text-center">
            You can change this anytime. Only stores in your area are shown.
          </p>
        </QuestionnaireStep>
      )}


      {/* STEP 6 — Section 5: Family Assistance */}
      {step === 6 && (
        <QuestionnaireStep step={6} totalSteps={TOTAL_STEPS}
          title="What support is your family looking for?"
          subtitle="Optional — tap any that apply. We'll surface matching resources."
          onNext={next} onBack={back} optional onSkip={next}
        >
          <div className="flex flex-wrap gap-2.5 mt-4">
            {ASSISTANCE_OPTIONS.map((opt) => (
              <MultiChip key={opt.key} label={opt.label}
                selected={!!assistance[opt.key]}
                onClick={() => toggleBool(assistance, opt.key, setAssistance)} />
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* STEP 7 — Section 6: Dietary */}
      {step === 7 && (
        <QuestionnaireStep step={7} totalSteps={TOTAL_STEPS}
          title="Any dietary preferences or allergies?"
          subtitle="Optional — tap any that apply."
          onNext={next} onBack={back} optional onSkip={next}
        >
          <div className="flex flex-wrap gap-2.5 mt-4">
            {DIETARY_OPTIONS.map((opt) => (
              <MultiChip key={opt.key} label={opt.label}
                selected={!!dietary[opt.key]}
                onClick={() => toggleBool(dietary, opt.key, setDietary)} />
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* STEP 8 — Section 7: Cooking confidence */}
      {step === 8 && (
        <QuestionnaireStep step={8} totalSteps={TOTAL_STEPS}
          title="How comfortable are you in the kitchen?"
          subtitle="We'll calibrate recipe complexity to your skill level."
          onNext={next} onBack={back} optional onSkip={next}
        >
          <div className="space-y-3 mt-4">
            {COOKING_CONFIDENCE_OPTIONS.map((opt) => (
              <OptionChip key={opt.value} label={opt.label}
                selected={cookingConfidence === opt.value}
                onClick={() => setCookingConfidence(opt.value)} />
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* STEP 9 — Section 8: Pantry defaults */}
      {step === 9 && (
        <QuestionnaireStep step={9} totalSteps={TOTAL_STEPS}
          title="Quick pantry check"
          subtitle="Tap anything you already have. We'll skip these on your grocery list."
          onNext={next} onBack={back} optional onSkip={next}
        >
          <div className="grid grid-cols-3 gap-2 mt-4">
            {PANTRY_STAPLES.map((item) => (
              <button key={item} onClick={() => togglePantryItem(item)}
                className={`p-3 rounded-2xl border-2 text-sm font-medium transition-all ${
                  pantryStarter.includes(item) ? "bg-primary/10 border-primary text-foreground" : "bg-card border-border text-muted-foreground hover:border-primary/30"
                }`}>
                {item}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-4 text-center">
            {pantryStarter.length > 0 ? `${pantryStarter.length} item${pantryStarter.length === 1 ? "" : "s"} added` : "You can add more later in the Pantry tab."}
          </p>
        </QuestionnaireStep>
      )}

      {/* STEP 10 — Section 9: Food waste */}
      {step === 10 && (
        <QuestionnaireStep step={10} totalSteps={TOTAL_STEPS}
          title="Help us cut food waste in your kitchen?"
          subtitle="Hive Assistant can warn you before things spoil and suggest recipes."
          onNext={next} onBack={back}
        >
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-4">
              <div className="pr-4">
                <p className="text-sm font-semibold text-foreground">Food waste alerts</p>
                <p className="text-xs text-muted-foreground mt-0.5">Heads-up when pantry items are about to expire.</p>
              </div>
              <Switch checked={foodWasteAlerts} onCheckedChange={setFoodWasteAlerts} />
            </div>
            <div className="flex items-center justify-between bg-card border border-border rounded-2xl px-4 py-4">
              <div className="pr-4">
                <p className="text-sm font-semibold text-foreground">Recipe suggestions to use leftovers</p>
                <p className="text-xs text-muted-foreground mt-0.5">"Use it up" recipes based on what's in your kitchen.</p>
              </div>
              <Switch checked={foodWasteSuggestions} onCheckedChange={setFoodWasteSuggestions} />
            </div>
          </div>
        </QuestionnaireStep>
      )}

      {/* STEP 11 — Section 10: Apollo goals + finish */}
      {step === 11 && (
        <QuestionnaireStep step={11} totalSteps={TOTAL_STEPS}
          title="Any wellness goals?"
          subtitle="Optional — Apollo Reborn uses these for personalized recommendations."
          onNext={handleSubmit} onBack={back}
          nextLabel={loading ? "Setting up..." : "Finish & See My Plan →"}
          loading={loading}
        >
          <div className="flex flex-wrap gap-2.5 mt-4">
            {APOLLO_GOALS.map((opt) => (
              <MultiChip key={opt.key} label={opt.label}
                selected={!!goals[opt.key]}
                onClick={() => toggleBool(goals, opt.key, setGoals)} />
            ))}
          </div>

          <div className="flex flex-col items-center mt-8 space-y-4">
            <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ duration: 0.5 }}
              className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-primary" />
            </motion.div>
            <div className="text-center space-y-2 max-w-xs">
              <p className="text-sm text-foreground leading-relaxed">
                Your first meal plan will fit your <strong>${weeklyBudget}/week</strong> budget
                {homeStore && <> at <strong>{homeStore}</strong></>}
                {householdSize > 0 && <>, for <strong>{householdSize} {householdSize === 1 ? "person" : "people"}</strong></>}.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-accent text-xs font-semibold border border-accent/20">
              <Sparkles className="w-3.5 h-3.5" /> Free for every family — forever
            </div>
          </div>
        </QuestionnaireStep>
      )}
    </div>
  );
}
