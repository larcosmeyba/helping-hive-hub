import { useState, useEffect } from "react";
import { Settings, Save, LogOut, TrendingUp, DollarSign, ShoppingCart, PiggyBank, Target, MapPin, Camera, ExternalLink, Shield, Sparkles, Trash2, Bell } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { useNavigate } from "react-router-dom";
import { useLocation } from "@/contexts/LocationContext";
import { useCameraPermission } from "@/hooks/usePermissions";
import { PrivacyDataControls } from "@/components/dashboard/PrivacyDataControls";
import { KrogerConnectionCard } from "@/components/kroger/KrogerConnectionCard";
import { Switch } from "@/components/ui/switch";
import { useShowMacros } from "@/hooks/useShowMacros";

const ALLERGY_OPTIONS = ["Dairy", "Gluten", "Nuts", "Shellfish", "Soy", "Eggs"];
const DIET_OPTIONS = ["Vegetarian", "Vegan", "Keto", "Low-carb", "Halal", "Kosher", "Gluten-free", "Dairy-free", "Nut allergy", "No seafood"];

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

const APOLLO_GOALS: { key: string; label: string }[] = [
  { key: "goal_lose_weight", label: "Lose weight" },
  { key: "goal_build_muscle", label: "Build muscle" },
  { key: "goal_stay_active", label: "Stay active" },
  { key: "goal_improve_mobility", label: "Improve mobility" },
];

const COOKING_OPTIONS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];




export default function SettingsPage() {
  const { user, signOut, refreshProfile } = useAuth();
  const { toast } = useToast();
  const { mealPlan } = useMealPlan();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [householdSize, setHouseholdSize] = useState(2);
  const [weeklyBudget, setWeeklyBudget] = useState(75);
  const [zipCode, setZipCode] = useState("");
  const [allergies, setAllergies] = useState<string[]>([]);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  // Extended onboarding profile fields
  const [childrenUnder5, setChildrenUnder5] = useState(0);
  const [children5to12, setChildren5to12] = useState(0);
  const [teenagers, setTeenagers] = useState(0);
  const [seniors65plus, setSeniors65plus] = useState(0);
  const [city, setCity] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [cookingConfidence, setCookingConfidence] = useState("");
  const [assistance, setAssistance] = useState<Record<string, boolean>>({});
  const [goals, setGoals] = useState<Record<string, boolean>>({});
  const [foodWasteAlerts, setFoodWasteAlerts] = useState(true);
  const [foodWasteSuggestions, setFoodWasteSuggestions] = useState(true);
  
  const { status: locationStatus } = useLocation();
  const { status: cameraStatus } = useCameraPermission();
  const [showMacros, setShowMacros] = useShowMacros();
  const [notifPrefs, setNotifPrefs] = useState({
    meal_plan_reminders: true,
    snap_deposit_alerts: true,
    new_features: true,
  });

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (!data) return;
      const d = data as Record<string, any>;
      setHouseholdSize(d.household_size ?? 2);
      setWeeklyBudget(d.weekly_budget != null ? Number(d.weekly_budget) : 75);
      setZipCode(d.zip_code ?? "");
      setAllergies((d.allergies as string[]) ?? []);
      setDietaryPreferences((d.dietary_preferences as string[]) ?? []);
      setChildrenUnder5(d.children_under_5 ?? 0);
      setChildren5to12(d.children_5_to_12 ?? 0);
      setTeenagers(d.teenagers ?? 0);
      setSeniors65plus(d.seniors_65_plus ?? 0);
      setCity(d.city ?? "");
      setStateCode(d.state ?? "");
      setCookingConfidence(d.cooking_confidence ?? "");
      const a: Record<string, boolean> = {};
      ASSISTANCE_OPTIONS.forEach((o) => { a[o.key] = !!d[o.key]; });
      setAssistance(a);
      const g: Record<string, boolean> = {};
      APOLLO_GOALS.forEach((o) => { g[o.key] = !!d[o.key]; });
      setGoals(g);
      setFoodWasteAlerts(d.food_waste_alerts_enabled ?? true);
      setFoodWasteSuggestions(d.food_waste_recipe_suggestions_enabled ?? true);
      
      const prefs = (d.notification_preferences as Record<string, boolean> | null) ?? {};
      setNotifPrefs({
        meal_plan_reminders: prefs.meal_plan_reminders ?? true,
        snap_deposit_alerts: prefs.snap_deposit_alerts ?? true,
        new_features: prefs.new_features ?? true,
      });
    });
  }, [user]);

  const updateNotifPref = async (key: keyof typeof notifPrefs, value: boolean) => {
    if (!user) return;
    const next = { ...notifPrefs, [key]: value };
    setNotifPrefs(next);
    const { error } = await supabase
      .from("profiles")
      .update({ notification_preferences: next })
      .eq("user_id", user.id);
    if (error) {
      setNotifPrefs(notifPrefs);
      toast({ title: "Couldn't save", description: error.message, variant: "destructive" });
    }
  };

  const toggle = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  const toggleMap = (map: Record<string, boolean>, setter: (m: Record<string, boolean>) => void, key: string) => {
    setter({ ...map, [key]: !map[key] });
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const assistanceCols = ASSISTANCE_OPTIONS.reduce((acc, o) => { acc[o.key] = !!assistance[o.key]; return acc; }, {} as Record<string, boolean>);
      const goalCols = APOLLO_GOALS.reduce((acc, o) => { acc[o.key] = !!goals[o.key]; return acc; }, {} as Record<string, boolean>);

      const { error } = await supabase.from("profiles").update({
        household_size: householdSize,
        children_under_5: childrenUnder5,
        children_5_to_12: children5to12,
        teenagers: teenagers,
        seniors_65_plus: seniors65plus,
        weekly_budget: weeklyBudget,
        zip_code: zipCode,
        city: city || null,
        state: stateCode || null,
        allergies,
        dietary_preferences: dietaryPreferences,
        cooking_confidence: cookingConfidence || null,
        ...assistanceCols,
        ...goalCols,
        food_waste_alerts_enabled: foodWasteAlerts,
        food_waste_recipe_suggestions_enabled: foodWasteSuggestions,
      }).eq("user_id", user.id);
      if (error) throw error;
      await refreshProfile?.();
      toast({ title: "Saved!", description: "Your settings have been updated." });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };



  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const spent = mealPlan?.totalEstimatedCost ?? 0;
  const saved = weeklyBudget - spent;
  const pantrySavings = mealPlan?.pantrySavings ?? 0;
  const costPerMeal = mealPlan?.costPerMeal ?? 0;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" /> Account Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Changes will regenerate your meal plan</p>
      </div>

      {/* Budget Insights Summary */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" /> Budget Overview
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Budget", value: `$${weeklyBudget}`, icon: Target, color: "text-primary" },
            { label: "Est. Spend", value: `$${spent.toFixed(0)}`, icon: ShoppingCart, color: "text-accent" },
            { label: "Saved", value: `$${saved > 0 ? saved.toFixed(0) : '0'}`, icon: PiggyBank, color: "text-accent" },
            { label: "Est. Cost/Meal", value: `~$${costPerMeal.toFixed(2)}`, icon: DollarSign, color: "text-primary" },
          ].map((stat) => (
            <div key={stat.label} className="bg-muted/30 rounded-xl p-3 text-center">
              <stat.icon className={`w-4 h-4 ${stat.color} mx-auto mb-1`} />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
            </div>
          ))}
        </div>
        {pantrySavings > 0 && (
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Including ${pantrySavings.toFixed(0)} saved from pantry items
          </p>
        )}
      </div>

      <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-6">
        <div>
          <Label>Household Size</Label>
          <div className="flex items-center gap-4 mt-2">
            <Button variant="outline" size="icon" onClick={() => setHouseholdSize(Math.max(1, householdSize - 1))}>−</Button>
            <span className="text-2xl font-bold text-foreground w-10 text-center">{householdSize}</span>
            <Button variant="outline" size="icon" onClick={() => setHouseholdSize(householdSize + 1)}>+</Button>
          </div>
        </div>

        <div>
          <Label>Household composition</Label>
          <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">Used for portion sizing and resource recommendations.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { label: "Children under 5", val: childrenUnder5, set: setChildrenUnder5 },
              { label: "Children 5–12", val: children5to12, set: setChildren5to12 },
              { label: "Teenagers (13–17)", val: teenagers, set: setTeenagers },
              { label: "Seniors 65+", val: seniors65plus, set: setSeniors65plus },
            ].map((row) => (
              <div key={row.label} className="flex items-center justify-between bg-muted/30 rounded-xl px-3 py-2">
                <span className="text-sm text-foreground">{row.label}</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => row.set(Math.max(0, row.val - 1))}>−</Button>
                  <span className="w-6 text-center font-semibold text-foreground tabular-nums">{row.val}</span>
                  <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => row.set(row.val + 1)}>+</Button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <Label>Weekly Grocery Budget: ${weeklyBudget}</Label>
          <input type="range" min={25} max={500} step={5} value={weeklyBudget} onChange={(e) => setWeeklyBudget(Number(e.target.value))} className="w-full mt-2 accent-primary" />
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label>ZIP Code</Label>
            <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} maxLength={5} className="mt-1" />
          </div>
          <div>
            <Label>City</Label>
            <Input value={city} onChange={(e) => setCity(e.target.value)} className="mt-1" />
          </div>
          <div>
            <Label>State</Label>
            <Input value={stateCode} onChange={(e) => setStateCode(e.target.value)} maxLength={2} className="mt-1" />
          </div>
        </div>




        <div>
          <Label>Allergies</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {ALLERGY_OPTIONS.map((item) => (
              <button key={item} onClick={() => toggle(allergies, setAllergies, item)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${allergies.includes(item) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40"}`}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Dietary Preferences</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {DIET_OPTIONS.map((item) => (
              <button key={item} onClick={() => toggle(dietaryPreferences, setDietaryPreferences, item)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${dietaryPreferences.includes(item) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40"}`}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Cooking confidence</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {COOKING_OPTIONS.map((opt) => (
              <button key={opt.value} onClick={() => setCookingConfidence(opt.value)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${cookingConfidence === opt.value ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Family assistance needs</Label>
          <p className="text-[11px] text-muted-foreground mt-0.5 mb-2">Tap any that apply. Hive Family Assistance uses these to recommend resources.</p>
          <div className="flex flex-wrap gap-2">
            {ASSISTANCE_OPTIONS.map((opt) => (
              <button key={opt.key} onClick={() => toggleMap(assistance, setAssistance, opt.key)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${assistance[opt.key] ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40"}`}>
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Label>Food waste preferences</Label>
          <div className="space-y-2 mt-2">
            <div className="flex items-center justify-between bg-muted/30 rounded-xl px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Expiration alerts</p>
                <p className="text-[11px] text-muted-foreground">Warn me before pantry items spoil.</p>
              </div>
              <Switch checked={foodWasteAlerts} onCheckedChange={setFoodWasteAlerts} />
            </div>
            <div className="flex items-center justify-between bg-muted/30 rounded-xl px-3 py-2">
              <div>
                <p className="text-sm font-medium text-foreground">Recipe suggestions for leftovers</p>
                <p className="text-[11px] text-muted-foreground">"Use it up" recipes from current pantry.</p>
              </div>
              <Switch checked={foodWasteSuggestions} onCheckedChange={setFoodWasteSuggestions} />
            </div>
          </div>
        </div>


        <div>
          <Label>Move with your meals</Label>
          <div className="mt-2 rounded-xl border border-[#EEE7DA] bg-[#F8F3E2]/50 p-4">
            <p className="text-sm font-semibold text-foreground mb-1">
              Looking to improve your health and fitness?
            </p>
            <p className="text-[12px] text-muted-foreground mb-3">
              Pair your meal plan with Apollo Reborn for guided workouts and wellness.
            </p>
            <a
              href={
                typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent)
                  ? "https://apps.apple.com/us/app/apollo-reborn/id6761779680"
                  : "https://play.google.com/store/apps/details?id=com.apollonation.app"
              }
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 bg-[#5B3FBF] hover:bg-[#4A33A0] text-white text-[13px] font-semibold px-4 py-2 rounded-lg"
            >
              Move With Your Meals
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full bg-gradient-honey text-primary-foreground hover:opacity-90">
          <Save className="w-4 h-4 mr-2" /> {loading ? "Saving..." : "Save Changes"}
        </Button>

      </div>

      {/* Permissions Section */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> Permissions & Privacy
        </h2>

        <div className="space-y-3">
          {/* Location */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Location</p>
                <p className="text-[11px] text-muted-foreground">Nearby stores & pricing accuracy</p>
              </div>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              locationStatus === "granted" ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
            }`}>
              {locationStatus === "granted" ? "On" : locationStatus === "denied" ? "Off" : "Not Set"}
            </span>
          </div>

          {/* Camera */}
          <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl">
            <div className="flex items-center gap-3">
              <Camera className="w-4 h-4 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">Camera</p>
                <p className="text-[11px] text-muted-foreground">Scan pantry & fridge items</p>
              </div>
            </div>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
              cameraStatus === "granted" ? "bg-accent/15 text-accent" : "bg-muted text-muted-foreground"
            }`}>
              {cameraStatus === "granted" ? "On" : cameraStatus === "denied" ? "Off" : "Not Set"}
            </span>
          </div>
        </div>

        {(locationStatus === "denied" || cameraStatus === "denied") && (
          <Button
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const { Capacitor } = await import("@capacitor/core");
                if (Capacitor.isNativePlatform() && Capacitor.getPlatform() === "ios") {
                  // iOS WKWebView honors the app-settings: scheme via location change.
                  window.location.href = "app-settings:";
                  return;
                }
              } catch { /* fall through */ }
              window.open("app-settings:", "_blank");
            }}
            className="w-full text-sm gap-2"
          >
            <ExternalLink className="w-3.5 h-3.5" /> Open Device Settings
          </Button>
        )}

        <p className="text-[11px] text-muted-foreground leading-relaxed">
          We use your approximate location for store and pricing relevance. Photos are processed securely and never stored without your permission.
        </p>
      </div>

      {/* Privacy & Data Controls */}
      <KrogerConnectionCard />
      <PrivacyDataControls />

      {/* Notification Preferences */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" /> Notification Preferences
        </h2>
        <p className="text-[11px] text-muted-foreground -mt-2">
          Choose which categories of push notifications you want to receive. You can also manage system-level permission in your device settings.
        </p>

        {[
          { key: "meal_plan_reminders" as const, label: "Meal plan reminders", desc: "Weekly plan generated, prep reminders" },
          { key: "snap_deposit_alerts" as const, label: "SNAP deposit alerts", desc: "Reminders around your benefit deposit day" },
          { key: "new_features" as const, label: "New features", desc: "Occasional updates about new app features" },
        ].map((item) => (
          <div key={item.key} className="flex items-center justify-between p-3 bg-muted/30 rounded-xl gap-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
            <Switch
              checked={notifPrefs[item.key]}
              onCheckedChange={(v) => updateNotifPref(item.key, v)}
              aria-label={item.label}
            />
          </div>
        ))}
      </div>


      {/* Display Preferences (Fix 2.6) */}
      <div className="bg-card rounded-xl border border-border shadow-card p-6 space-y-4">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" /> Display Preferences
        </h2>

        <div className="flex items-center justify-between p-3 bg-muted/30 rounded-xl gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Show macros on meal cards</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Protein, carbs, and fat pills on each meal. Turn off for a cleaner view.
            </p>
          </div>
          <Switch
            checked={showMacros}
            onCheckedChange={setShowMacros}
            aria-label="Show macros on meal cards"
          />
        </div>
      </div>


      {/* Sign Out */}
      <Button variant="outline" onClick={handleSignOut} className="w-full">
        <LogOut className="w-4 h-4 mr-2" /> Sign Out
      </Button>

      {/* Delete Account */}
      <div className="bg-destructive/5 rounded-xl border border-destructive/20 p-5 space-y-3">
        <h2 className="font-display text-lg font-semibold text-destructive flex items-center gap-2">
          <Trash2 className="w-5 h-5" /> Delete Account
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Permanently delete your account and all associated data including meal plans, grocery lists, pantry items, and profile information. This action cannot be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full">
              <Trash2 className="w-4 h-4 mr-2" /> Request Account Deletion
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will submit a request to permanently delete your account and all associated data. Our team will process your request within 72 hours. You will receive a confirmation email when the deletion is complete.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={async () => {
                  try {
                    await supabase.from("support_tickets").insert({
                      user_id: user!.id,
                      name: user!.email ?? "User",
                      email: user!.email ?? "",
                      message: "Account deletion request — please delete my account and all associated data.",
                      ticket_type: "account_deletion",
                    });
                    toast({ title: "Request submitted", description: "Your account deletion request has been received. We'll process it within 72 hours." });
                  } catch {
                    toast({ title: "Error", description: "Could not submit request. Please try again.", variant: "destructive" });
                  }
                }}
              >
                Yes, Delete My Account
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
