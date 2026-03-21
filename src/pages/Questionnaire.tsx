import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check } from "lucide-react";

const STEPS = ["Household", "Budget & Store", "Preferences"];

const STORE_OPTIONS = ["Walmart", "Aldi", "Target", "Kroger", "Costco", "Publix", "H-E-B", "Trader Joe's", "Other"];
const ALLERGY_OPTIONS = ["Dairy", "Gluten", "Nuts", "Shellfish", "Soy", "Eggs", "None"];
const DIET_OPTIONS = ["No restrictions", "Vegetarian", "Vegan", "Keto", "Low-carb", "Halal", "Kosher"];
const COOK_TIME_OPTIONS = [
  { value: "quick", label: "Quick (Under 30 min)" },
  { value: "medium", label: "Medium (30–60 min)" },
  { value: "any", label: "Any cook time" },
];

export default function Questionnaire() {
  const [step, setStep] = useState(0);
  const [householdSize, setHouseholdSize] = useState(2);
  const [zipCode, setZipCode] = useState("");
  const [weeklyBudget, setWeeklyBudget] = useState(75);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [dietaryPreferences, setDietaryPreferences] = useState<string[]>([]);
  const [cookTime, setCookTime] = useState("medium");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          household_size: householdSize,
          zip_code: zipCode,
          weekly_budget: weeklyBudget,
          preferred_stores: selectedStores,
          allergies: allergies.filter((a) => a !== "None"),
          dietary_preferences: dietaryPreferences.filter((d) => d !== "No restrictions"),
          cooking_time_preference: cookTime,
          questionnaire_completed: true,
        })
        .eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "All set!", description: "Your personalized meal plan is ready." });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <img src="/favicon.png" alt="Help The Hive" className="h-10 w-10 mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Household Questionnaire</h1>
          <p className="text-muted-foreground">Tell us about your household so we can plan your meals</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className="text-sm text-muted-foreground hidden sm:block">{s}</span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-border" />}
            </div>
          ))}
        </div>

        <div className="bg-card rounded-2xl shadow-card border border-border p-8">
          {step === 0 && (
            <div className="space-y-6">
              <div>
                <Label>How many people are in your household?</Label>
                <div className="flex items-center gap-4 mt-3">
                  <Button variant="outline" size="icon" onClick={() => setHouseholdSize(Math.max(1, householdSize - 1))}>−</Button>
                  <span className="text-3xl font-bold text-foreground w-12 text-center">{householdSize}</span>
                  <Button variant="outline" size="icon" onClick={() => setHouseholdSize(householdSize + 1)}>+</Button>
                </div>
              </div>
              <div>
                <Label htmlFor="zip">ZIP Code</Label>
                <Input id="zip" value={zipCode} onChange={(e) => setZipCode(e.target.value)} placeholder="e.g. 75001" maxLength={5} className="mt-1" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-6">
              <div>
                <Label>Weekly Grocery Budget</Label>
                <div className="flex items-center gap-3 mt-3">
                  <span className="text-2xl font-bold text-primary">${weeklyBudget}</span>
                </div>
                <input
                  type="range" min={25} max={300} step={5} value={weeklyBudget}
                  onChange={(e) => setWeeklyBudget(Number(e.target.value))}
                  className="w-full mt-3 accent-primary"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>$25</span><span>$300</span>
                </div>
              </div>
              <div>
                <Label>Preferred Stores</Label>
                <div className="flex flex-wrap gap-2 mt-3">
                  {STORE_OPTIONS.map((store) => (
                    <button
                      key={store}
                      onClick={() => toggleItem(selectedStores, setSelectedStores, store)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        selectedStores.includes(store)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      {store}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <div>
                <Label>Any food allergies?</Label>
                <div className="flex flex-wrap gap-2 mt-3">
                  {ALLERGY_OPTIONS.map((item) => (
                    <button
                      key={item}
                      onClick={() => toggleItem(allergies, setAllergies, item)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        allergies.includes(item)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Dietary Preferences</Label>
                <div className="flex flex-wrap gap-2 mt-3">
                  {DIET_OPTIONS.map((item) => (
                    <button
                      key={item}
                      onClick={() => toggleItem(dietaryPreferences, setDietaryPreferences, item)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        dietaryPreferences.includes(item)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Preferred Cooking Time</Label>
                <div className="space-y-2 mt-3">
                  {COOK_TIME_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setCookTime(opt.value)}
                      className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
                        cookTime === opt.value
                          ? "bg-primary/10 border-primary text-foreground"
                          : "bg-card border-border text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
            ) : <div />}
            {step < 2 ? (
              <Button onClick={() => setStep(step + 1)} className="bg-gradient-honey text-primary-foreground hover:opacity-90">Continue</Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading} className="bg-gradient-honey text-primary-foreground hover:opacity-90">
                {loading ? "Setting up..." : "Generate My Meal Plan"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
