import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { QuestionnaireStep } from "@/components/questionnaire/QuestionnaireStep";
import { OptionChip } from "@/components/questionnaire/OptionChip";
import { MultiChip } from "@/components/questionnaire/MultiChip";
import { Input } from "@/components/ui/input";
import { Upload, ShieldCheck, X, Plus } from "lucide-react";

const TOTAL_STEPS = 14;

const HOUSEHOLD_OPTIONS = [
  { value: 1, label: "Just me" },
  { value: 2, label: "2 people" },
  { value: 4, label: "3–4 people" },
  { value: 5, label: "5+ people" },
];

const BUDGET_OPTIONS = [
  { value: 50, label: "$50" },
  { value: 75, label: "$75" },
  { value: 100, label: "$100" },
  { value: 150, label: "$150" },
  { value: 200, label: "$200+" },
];

const STORE_OPTIONS = ["Walmart", "Target", "Costco", "Trader Joe's", "Aldi", "Kroger", "Safeway", "Local grocery store"];

const FOOD_PREF_OPTIONS = ["American", "Mexican", "Italian", "Mediterranean", "Asian", "Vegetarian", "Vegan", "High Protein", "Gluten Free"];

const ALLERGY_OPTIONS = ["Dairy free", "Gluten free", "Nut allergy", "Shellfish allergy", "Vegetarian", "Vegan", "None"];

const COOK_TIME_OPTIONS = [
  { value: "under_15", label: "Under 15 minutes" },
  { value: "15_30", label: "15–30 minutes" },
  { value: "30_60", label: "30–60 minutes" },
  { value: "batch", label: "Batch cooking for the week" },
];

const COOKING_STYLE_OPTIONS = [
  { value: "fresh", label: "I prefer cooking fresh meals every day" },
  { value: "leftovers", label: "I like meals that create leftovers for the next day" },
  { value: "batch", label: "I prefer batch cooking for several days" },
  { value: "cheapest", label: "I want the cheapest meals possible even if meals repeat" },
];

const MEAL_REPEAT_OPTIONS = [
  { value: "once", label: "Only once" },
  { value: "twice", label: "Up to twice" },
  { value: "three", label: "Up to three times" },
  { value: "often", label: "I don't mind repeating meals often" },
];

const EQUIPMENT_OPTIONS = ["Stove", "Oven", "Air fryer", "Slow cooker", "Instant pot", "Microwave", "Blender"];

const PANTRY_OPTIONS = ["Rice", "Beans", "Pasta", "Eggs", "Chicken", "Potatoes", "Onions", "Bread", "Cheese", "Milk", "Tomatoes", "Butter"];

const GOAL_OPTIONS = [
  "Save money on groceries",
  "Eat healthier",
  "Meal prep more efficiently",
  "Reduce food waste",
  "Feed my family affordably",
];

const ELIGIBILITY_OPTIONS = [
  { value: "snap", label: "I receive SNAP / EBT benefits", badge: "Free Membership" },
  { value: "military", label: "I am active military", badge: "50% Discount" },
  { value: "veteran", label: "I am a veteran", badge: "50% Discount" },
  { value: "teacher", label: "I am a teacher", badge: "40% Discount" },
  { value: "student", label: "I am a college student", badge: "40% Discount" },
  { value: "first_responder", label: "I am a first responder", badge: "50% Discount" },
  { value: "none", label: "None of these apply to me", badge: "" },
];

function getDiscountForCategory(cat: string): { tier: string; discount: number; badge: string } {
  switch (cat) {
    case "snap": return { tier: "free", discount: 100, badge: "Verified SNAP Member" };
    case "military": return { tier: "discounted", discount: 50, badge: "Verified Military" };
    case "veteran": return { tier: "discounted", discount: 50, badge: "Verified Veteran" };
    case "first_responder": return { tier: "discounted", discount: 50, badge: "Verified First Responder" };
    case "teacher": return { tier: "discounted", discount: 40, badge: "Verified Teacher" };
    case "student": return { tier: "discounted", discount: 40, badge: "Verified Student" };
    default: return { tier: "standard", discount: 0, badge: "" };
  }
}

export default function Questionnaire() {
  const [step, setStep] = useState(1);
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  // Step data
  const [zipCode, setZipCode] = useState("");
  const [householdSize, setHouseholdSize] = useState<number | null>(null);
  const [weeklyBudget, setWeeklyBudget] = useState<number | null>(null);
  const [selectedStores, setSelectedStores] = useState<string[]>([]);
  const [foodPreferences, setFoodPreferences] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [cookTime, setCookTime] = useState("");
  const [cookingStyle, setCookingStyle] = useState("");
  const [mealRepetition, setMealRepetition] = useState("");
  const [kitchenEquipment, setKitchenEquipment] = useState<string[]>([]);
  const [pantryItems, setPantryItems] = useState<string[]>([]);
  const [customPantryItem, setCustomPantryItem] = useState("");
  const [userGoals, setUserGoals] = useState<string[]>([]);
  const [eligibility, setEligibility] = useState("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const toggleMulti = (arr: string[], setArr: (v: string[]) => void, item: string) => {
    setArr(arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item]);
  };

  const addCustomPantry = () => {
    const trimmed = customPantryItem.trim();
    if (trimmed && !pantryItems.includes(trimmed)) {
      setPantryItems((prev) => [...prev, trimmed]);
      setCustomPantryItem("");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ["image/jpeg", "image/png", "application/pdf"];
      if (!validTypes.includes(file.type)) {
        toast({ title: "Invalid file", description: "Please upload JPG, PNG, or PDF", variant: "destructive" });
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max file size is 10MB", variant: "destructive" });
        return;
      }
      setUploadedFile(file);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const discountInfo = getDiscountForCategory(eligibility);
      const needsVerification = eligibility && eligibility !== "none";

      // Update profile
      const { error } = await supabase.from("profiles").update({
        zip_code: zipCode,
        household_size: householdSize ?? 2,
        weekly_budget: weeklyBudget ?? 75,
        preferred_stores: selectedStores,
        food_preferences: foodPreferences,
        allergies: allergies.filter((a) => a !== "None"),
        dietary_preferences: allergies.filter((a) => ["Vegetarian", "Vegan"].includes(a)),
        cooking_time_preference: cookTime,
        cooking_style: cookingStyle,
        meal_repetition: mealRepetition,
        kitchen_equipment: kitchenEquipment,
        user_goals: userGoals,
        eligibility_category: eligibility || null,
        verification_status: needsVerification ? "pending" : "none",
        verification_badge: needsVerification ? null : null,
        membership_tier: needsVerification ? "pending" : "standard",
        membership_discount: needsVerification ? 0 : 0,
        questionnaire_completed: true,
      }).eq("user_id", user.id);
      if (error) throw error;

      // Save pantry items
      if (pantryItems.length > 0) {
        const items = pantryItems.map((name) => ({
          user_id: user.id,
          item_name: name,
          quantity: "some",
          category: "pantry_staples",
        }));
        await supabase.from("pantry_items").insert(items);
      }

      // Upload SNAP verification document
      if (eligibility === "snap" && uploadedFile) {
        const ext = uploadedFile.name.split(".").pop();
        const filePath = `${user.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("verification-documents")
          .upload(filePath, uploadedFile);

        if (!uploadError) {
          await supabase.from("verification_documents").insert({
            user_id: user.id,
            eligibility_category: "snap",
            document_url: filePath,
            document_type: uploadedFile.type,
            file_name: uploadedFile.name,
            status: "pending",
          });
        }
      }

      // For non-SNAP eligibility (ID.me will handle later)
      if (needsVerification && eligibility !== "snap") {
        await supabase.from("verification_documents").insert({
          user_id: user.id,
          eligibility_category: eligibility,
          document_url: "pending_idme_verification",
          document_type: "idme",
          file_name: "ID.me Verification",
          status: "pending",
        });
      }

      toast({ title: "All set! 🎉", description: "Your personalized meal plan is being created." });
      navigate("/dashboard");
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const back = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="min-h-dvh bg-background">
      {/* Step 1: ZIP Code */}
      {step === 1 && (
        <QuestionnaireStep step={1} totalSteps={TOTAL_STEPS} title="What is your ZIP Code?" subtitle="We'll use this to find local grocery prices and stores near you." onNext={next} onBack={undefined} nextDisabled={zipCode.length < 5}>
          <div className="mt-4">
            <Input
              value={zipCode}
              onChange={(e) => setZipCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
              placeholder="e.g. 75001"
              className="text-center text-2xl font-bold h-16 rounded-2xl border-2"
              inputMode="numeric"
              maxLength={5}
            />
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 2: Household Size */}
      {step === 2 && (
        <QuestionnaireStep step={2} totalSteps={TOTAL_STEPS} title="How many people are you feeding?" onNext={next} onBack={back} nextDisabled={householdSize === null}>
          <div className="space-y-3 mt-4">
            {HOUSEHOLD_OPTIONS.map((opt) => (
              <OptionChip key={opt.value} label={opt.label} selected={householdSize === opt.value} onClick={() => setHouseholdSize(opt.value)} />
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 3: Weekly Budget */}
      {step === 3 && (
        <QuestionnaireStep step={3} totalSteps={TOTAL_STEPS} title="What is your weekly grocery budget?" onNext={next} onBack={back} nextDisabled={weeklyBudget === null}>
          <div className="space-y-3 mt-4">
            {BUDGET_OPTIONS.map((opt) => (
              <OptionChip key={opt.value} label={opt.label} selected={weeklyBudget === opt.value} onClick={() => setWeeklyBudget(opt.value)} />
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 4: Grocery Stores */}
      {step === 4 && (
        <QuestionnaireStep step={4} totalSteps={TOTAL_STEPS} title="Where do you usually shop?" subtitle="Select all that apply." onNext={next} onBack={back}>
          <div className="flex flex-wrap gap-2.5 mt-4">
            {STORE_OPTIONS.map((store) => (
              <MultiChip key={store} label={store} selected={selectedStores.includes(store)} onClick={() => toggleMulti(selectedStores, setSelectedStores, store)} />
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 5: Food Preferences */}
      {step === 5 && (
        <QuestionnaireStep step={5} totalSteps={TOTAL_STEPS} title="What types of food do you enjoy?" subtitle="Select all that apply." onNext={next} onBack={back}>
          <div className="flex flex-wrap gap-2.5 mt-4">
            {FOOD_PREF_OPTIONS.map((pref) => (
              <MultiChip key={pref} label={pref} selected={foodPreferences.includes(pref)} onClick={() => toggleMulti(foodPreferences, setFoodPreferences, pref)} />
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 6: Dietary Restrictions */}
      {step === 6 && (
        <QuestionnaireStep step={6} totalSteps={TOTAL_STEPS} title="Do you have any dietary restrictions or allergies?" onNext={next} onBack={back}>
          <div className="space-y-3 mt-4">
            {ALLERGY_OPTIONS.map((item) => (
              <OptionChip key={item} label={item} selected={allergies.includes(item)} onClick={() => {
                if (item === "None") {
                  setAllergies(allergies.includes("None") ? [] : ["None"]);
                } else {
                  const filtered = allergies.filter((a) => a !== "None");
                  setAllergies(filtered.includes(item) ? filtered.filter((a) => a !== item) : [...filtered, item]);
                }
              }} />
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 7: Cooking Time */}
      {step === 7 && (
        <QuestionnaireStep step={7} totalSteps={TOTAL_STEPS} title="How much time do you want to spend cooking?" onNext={next} onBack={back} nextDisabled={!cookTime}>
          <div className="space-y-3 mt-4">
            {COOK_TIME_OPTIONS.map((opt) => (
              <OptionChip key={opt.value} label={opt.label} selected={cookTime === opt.value} onClick={() => setCookTime(opt.value)} />
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 8: Cooking Style */}
      {step === 8 && (
        <QuestionnaireStep step={8} totalSteps={TOTAL_STEPS} title="How do you prefer to cook meals?" onNext={next} onBack={back} nextDisabled={!cookingStyle}>
          <div className="space-y-3 mt-4">
            {COOKING_STYLE_OPTIONS.map((opt) => (
              <OptionChip key={opt.value} label={opt.label} selected={cookingStyle === opt.value} onClick={() => setCookingStyle(opt.value)} />
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 9: Meal Repetition */}
      {step === 9 && (
        <QuestionnaireStep step={9} totalSteps={TOTAL_STEPS} title="How often are you comfortable repeating meals?" onNext={next} onBack={back} nextDisabled={!mealRepetition}>
          <div className="space-y-3 mt-4">
            {MEAL_REPEAT_OPTIONS.map((opt) => (
              <OptionChip key={opt.value} label={opt.label} selected={mealRepetition === opt.value} onClick={() => setMealRepetition(opt.value)} />
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 10: Kitchen Equipment */}
      {step === 10 && (
        <QuestionnaireStep step={10} totalSteps={TOTAL_STEPS} title="What appliances do you have available?" subtitle="Select all that apply." onNext={next} onBack={back}>
          <div className="flex flex-wrap gap-2.5 mt-4">
            {EQUIPMENT_OPTIONS.map((item) => (
              <MultiChip key={item} label={item} selected={kitchenEquipment.includes(item)} onClick={() => toggleMulti(kitchenEquipment, setKitchenEquipment, item)} />
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 11: Pantry Ingredients */}
      {step === 11 && (
        <QuestionnaireStep step={11} totalSteps={TOTAL_STEPS} title="Which ingredients do you already have at home?" subtitle="This helps our AI save you money by using what you own." onNext={next} onBack={back} optional onSkip={next}>
          <div className="flex flex-wrap gap-2.5 mt-4">
            {PANTRY_OPTIONS.map((item) => (
              <MultiChip key={item} label={item} selected={pantryItems.includes(item)} onClick={() => toggleMulti(pantryItems, setPantryItems, item)} />
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <Input
              value={customPantryItem}
              onChange={(e) => setCustomPantryItem(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCustomPantry()}
              placeholder="Add other items..."
              className="rounded-xl"
            />
            <button onClick={addCustomPantry} className="shrink-0 w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
              <Plus className="w-4 h-4" />
            </button>
          </div>
          {pantryItems.filter((i) => !PANTRY_OPTIONS.includes(i)).length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {pantryItems.filter((i) => !PANTRY_OPTIONS.includes(i)).map((item) => (
                <span key={item} className="flex items-center gap-1 bg-primary/10 text-primary text-sm px-3 py-1.5 rounded-full">
                  {item}
                  <button onClick={() => toggleMulti(pantryItems, setPantryItems, item)}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          )}
        </QuestionnaireStep>
      )}

      {/* Step 12: Goals */}
      {step === 12 && (
        <QuestionnaireStep step={12} totalSteps={TOTAL_STEPS} title="What is your main goal with Help The Hive?" subtitle="Select all that apply." onNext={next} onBack={back}>
          <div className="space-y-3 mt-4">
            {GOAL_OPTIONS.map((goal) => (
              <OptionChip key={goal} label={goal} selected={userGoals.includes(goal)} onClick={() => toggleMulti(userGoals, setUserGoals, goal)} />
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 13: Eligibility */}
      {step === 13 && (
        <QuestionnaireStep step={13} totalSteps={TOTAL_STEPS} title="Do you qualify for a free or discounted membership?" onNext={next} onBack={back} nextDisabled={!eligibility}>
          <div className="space-y-3 mt-4">
            {ELIGIBILITY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setEligibility(opt.value)}
                className={`flex items-center justify-between w-full px-4 py-3.5 rounded-2xl border-2 text-left transition-all text-[15px] font-medium ${
                  eligibility === opt.value
                    ? "bg-primary/10 border-primary text-foreground"
                    : "bg-card border-border text-muted-foreground hover:border-primary/30"
                }`}
              >
                <span>{opt.label}</span>
                {opt.badge && (
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    eligibility === opt.value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    {opt.badge}
                  </span>
                )}
              </button>
            ))}
          </div>
        </QuestionnaireStep>
      )}

      {/* Step 14: Verification */}
      {step === 14 && (
        <QuestionnaireStep
          step={14}
          totalSteps={TOTAL_STEPS}
          title={eligibility === "none" || !eligibility ? "You're all set!" : "Verify your eligibility"}
          subtitle={
            eligibility === "none" || !eligibility
              ? "Let's generate your personalized meal plan."
              : "To receive your benefit, we need to verify your status. This protects the program and ensures benefits go to those who qualify."
          }
          onNext={handleSubmit}
          onBack={back}
          nextLabel={loading ? "Setting up..." : "Generate My Meal Plan 🍽️"}
          loading={loading}
        >
          {eligibility && eligibility !== "none" && (
            <div className="mt-4 space-y-6">
              {eligibility === "snap" ? (
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-2xl p-4">
                    <p className="text-sm font-medium text-foreground mb-1">Upload SNAP / EBT Verification</p>
                    <p className="text-xs text-muted-foreground">Upload a photo of your EBT card or SNAP approval letter. Accepted: JPG, PNG, PDF.</p>
                  </div>

                  <input
                    ref={fileRef}
                    type="file"
                    accept=".jpg,.jpeg,.png,.pdf"
                    onChange={handleFileChange}
                    className="hidden"
                  />

                  {uploadedFile ? (
                    <div className="flex items-center gap-3 bg-primary/10 border-2 border-primary rounded-2xl p-4">
                      <ShieldCheck className="w-5 h-5 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{uploadedFile.name}</p>
                        <p className="text-xs text-muted-foreground">{(uploadedFile.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button onClick={() => setUploadedFile(null)} className="text-muted-foreground">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="w-full flex flex-col items-center gap-2 border-2 border-dashed border-border rounded-2xl py-8 text-muted-foreground hover:border-primary/40 transition-colors"
                    >
                      <Upload className="w-8 h-8" />
                      <span className="text-sm font-medium">Tap to upload document</span>
                    </button>
                  )}

                  <div className="bg-muted/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">
                      🔒 Your documents are encrypted and stored securely. They are only used for verification purposes and will be reviewed by an admin.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-muted/50 rounded-2xl p-4 text-center">
                    <ShieldCheck className="w-10 h-10 text-primary mx-auto mb-3" />
                    <p className="text-sm font-medium text-foreground mb-1">Verify with ID.me</p>
                    <p className="text-xs text-muted-foreground mb-4">
                      ID.me securely verifies your {eligibility === "military" ? "military" : eligibility === "veteran" ? "veteran" : eligibility === "teacher" ? "teacher" : eligibility === "student" ? "student" : "first responder"} status.
                    </p>
                    <button
                      className="inline-flex items-center gap-2 bg-[#2B7DE9] text-white font-semibold px-6 py-3 rounded-xl hover:bg-[#2568c7] transition-colors"
                      onClick={() => {
                        toast({ title: "Coming Soon", description: "ID.me verification will be available shortly. Your account has been flagged for manual review." });
                      }}
                    >
                      <ShieldCheck className="w-5 h-5" />
                      Verify with ID.me
                    </button>
                  </div>

                  <div className="bg-muted/30 rounded-xl p-3">
                    <p className="text-xs text-muted-foreground">
                      🔒 ID.me is trusted by the IRS, Veterans Affairs, and major companies. Your data is secure.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {(!eligibility || eligibility === "none") && (
            <div className="mt-8 text-center">
              <div className="text-6xl mb-4">🍽️</div>
              <p className="text-muted-foreground text-sm">Your personalized meal plan, grocery list, and budget insights are ready to be generated.</p>
            </div>
          )}
        </QuestionnaireStep>
      )}
    </div>
  );
}
