import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Check, Plus, X } from "lucide-react";
import logo from "@/assets/logo-transparent.png";

const STEPS = ["Household", "Budget & Store", "Preferences", "Your Pantry"];

const STORE_OPTIONS = ["Walmart", "Aldi", "Target", "Kroger", "Costco", "Publix", "H-E-B", "Trader Joe's", "Other"];
const ALLERGY_OPTIONS = ["Dairy", "Gluten", "Nuts", "Shellfish", "Soy", "Eggs", "None"];
const DIET_OPTIONS = ["No restrictions", "Vegetarian", "Vegan", "Keto", "Low-carb", "Halal", "Kosher"];
const COOK_TIME_OPTIONS = [
  { value: "quick", label: "Quick (Under 30 min)" },
  { value: "medium", label: "Medium (30–60 min)" },
  { value: "any", label: "Any cook time" },
];

const COMMON_PANTRY_ITEMS = [
  { name: "Rice", category: "grains" },
  { name: "Pasta", category: "grains" },
  { name: "Bread", category: "grains" },
  { name: "Flour", category: "grains" },
  { name: "Oats", category: "grains" },
  { name: "Chicken", category: "proteins" },
  { name: "Ground Beef", category: "proteins" },
  { name: "Eggs", category: "proteins" },
  { name: "Canned Tuna", category: "proteins" },
  { name: "Beans (canned)", category: "canned_goods" },
  { name: "Diced Tomatoes (canned)", category: "canned_goods" },
  { name: "Tomato Sauce", category: "canned_goods" },
  { name: "Potatoes", category: "vegetables" },
  { name: "Onions", category: "vegetables" },
  { name: "Garlic", category: "vegetables" },
  { name: "Carrots", category: "vegetables" },
  { name: "Frozen Vegetables", category: "frozen_foods" },
  { name: "Milk", category: "dairy" },
  { name: "Butter", category: "dairy" },
  { name: "Cheese", category: "dairy" },
  { name: "Cooking Oil", category: "pantry_staples" },
  { name: "Salt & Pepper", category: "pantry_staples" },
  { name: "Soy Sauce", category: "pantry_staples" },
  { name: "Sugar", category: "pantry_staples" },
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
  const [pantryItems, setPantryItems] = useState<string[]>([]);
  const [customPantryItem, setCustomPantryItem] = useState("");
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const toggleItem = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  const addCustomPantry = () => {
    const trimmed = customPantryItem.trim();
    if (trimmed && !pantryItems.includes(trimmed)) {
      setPantryItems((prev) => [...prev, trimmed]);
      setCustomPantryItem("");
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Update profile
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

      // Save pantry items
      if (pantryItems.length > 0) {
        const items = pantryItems.map((name) => {
          const common = COMMON_PANTRY_ITEMS.find((i) => i.name === name);
          return {
            user_id: user.id,
            item_name: name,
            quantity: "some",
            category: common?.category || "pantry_staples",
          };
        });
        const { error: pantryError } = await supabase.from("pantry_items").insert(items);
        if (pantryError) console.error("Pantry save error:", pantryError);
      }

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
          <img src={logo} alt="Help The Hive" className="h-10 w-10 mx-auto mb-4" />
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Household Questionnaire</h1>
          <p className="text-muted-foreground">Tell us about your household so we can plan your meals</p>
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-1 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                i <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}>
                {i < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span className="text-xs text-muted-foreground hidden sm:block">{s}</span>
              {i < STEPS.length - 1 && <div className="w-6 h-px bg-border" />}
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

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <Label>What food do you currently have?</Label>
                <p className="text-xs text-muted-foreground mt-1">This helps our AI save you money by using what you already own.</p>
                <div className="flex flex-wrap gap-2 mt-3">
                  {COMMON_PANTRY_ITEMS.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => toggleItem(pantryItems, setPantryItems, item.name)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        pantryItems.includes(item.name)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border hover:border-primary/40"
                      }`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <Label>Other items</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    value={customPantryItem}
                    onChange={(e) => setCustomPantryItem(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && addCustomPantry()}
                    placeholder="Add other food..."
                    className="text-sm"
                  />
                  <Button variant="outline" onClick={addCustomPantry} className="shrink-0">
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
                {pantryItems.filter((i) => !COMMON_PANTRY_ITEMS.some((c) => c.name === i)).length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {pantryItems.filter((i) => !COMMON_PANTRY_ITEMS.some((c) => c.name === i)).map((item) => (
                      <span key={item} className="flex items-center gap-1 bg-accent/10 text-accent text-sm px-3 py-1 rounded-full">
                        {item}
                        <button onClick={() => toggleItem(pantryItems, setPantryItems, item)}><X className="w-3 h-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>Back</Button>
            ) : <div />}
            {step < 3 ? (
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
