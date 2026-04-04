import { useState, useEffect } from "react";
import { Settings, Save, LogOut, TrendingUp, DollarSign, ShoppingCart, PiggyBank, Target, MapPin, Camera, ExternalLink, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { useNavigate } from "react-router-dom";
import { useLocationPermission, useCameraPermission } from "@/hooks/usePermissions";

const STORE_OPTIONS = ["Walmart", "Aldi", "Target", "Kroger", "Costco", "Publix", "H-E-B", "Trader Joe's"];
const ALLERGY_OPTIONS = ["Dairy", "Gluten", "Nuts", "Shellfish", "Soy", "Eggs"];
const DIET_OPTIONS = ["Vegetarian", "Vegan", "Keto", "Low-carb", "Halal", "Kosher"];

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const { mealPlan } = useMealPlan();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [householdSize, setHouseholdSize] = useState(2);
  const [weeklyBudget, setWeeklyBudget] = useState(75);
  const [zipCode, setZipCode] = useState("");
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("*").eq("user_id", user.id).single().then(({ data }) => {
      if (!data) return;
      setHouseholdSize(data.household_size ?? 2);
      setWeeklyBudget(Number(data.weekly_budget) ?? 75);
      setZipCode(data.zip_code ?? "");
      setSelectedStores((data.preferred_stores as string[]) ?? []);
      setAllergies((data.allergies as string[]) ?? []);
      setDietaryPreferences((data.dietary_preferences as string[]) ?? []);
    });
  }, [user]);

  const toggle = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase.from("profiles").update({
        household_size: householdSize,
        weekly_budget: weeklyBudget,
        zip_code: zipCode,
        preferred_stores: selectedStores,
        allergies,
        dietary_preferences: dietaryPreferences,
      }).eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Saved!", description: "Your settings have been updated. A new meal plan will be generated." });
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
            { label: "Cost/Meal", value: `$${costPerMeal.toFixed(2)}`, icon: DollarSign, color: "text-primary" },
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
          <Label>Weekly Grocery Budget: ${weeklyBudget}</Label>
          <input type="range" min={25} max={300} step={5} value={weeklyBudget} onChange={(e) => setWeeklyBudget(Number(e.target.value))} className="w-full mt-2 accent-primary" />
        </div>

        <div>
          <Label>ZIP Code</Label>
          <Input value={zipCode} onChange={(e) => setZipCode(e.target.value)} maxLength={5} className="mt-1 max-w-xs" />
        </div>

        <div>
          <Label>Preferred Stores</Label>
          <div className="flex flex-wrap gap-2 mt-2">
            {STORE_OPTIONS.map((store) => (
              <button key={store} onClick={() => toggle(selectedStores, setSelectedStores, store)}
                className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${selectedStores.includes(store) ? "bg-primary text-primary-foreground border-primary" : "bg-card text-muted-foreground border-border hover:border-primary/40"}`}>
                {store}
              </button>
            ))}
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

        <Button onClick={handleSave} disabled={loading} className="w-full bg-gradient-honey text-primary-foreground hover:opacity-90">
          <Save className="w-4 h-4 mr-2" /> {loading ? "Saving..." : "Save & Regenerate Plan"}
        </Button>
      </div>

      {/* Sign Out */}
      <Button variant="outline" onClick={handleSignOut} className="w-full">
        <LogOut className="w-4 h-4 mr-2" /> Sign Out
      </Button>
    </div>
  );
}
