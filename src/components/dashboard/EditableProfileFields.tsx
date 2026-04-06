import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, DollarSign, Users, Pencil, Check, X } from "lucide-react";

interface Props {
  zipCode: string | null;
  weeklyBudget: number | null;
  householdSize: number | null;
  onUpdate: () => void;
}

export function EditableProfileFields({ zipCode, weeklyBudget, householdSize, onUpdate }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingField, setEditingField] = useState<"zip" | "budget" | "household" | null>(null);
  const [zipValue, setZipValue] = useState(zipCode ?? "");
  const [budgetValue, setBudgetValue] = useState(weeklyBudget ?? 75);
  const [householdValue, setHouseholdValue] = useState(householdSize ?? 1);
  const [saving, setSaving] = useState(false);

  const save = async (field: "zip" | "budget") => {
    if (!user) return;
    setSaving(true);
    try {
      const update = field === "zip"
        ? { zip_code: zipValue }
        : field === "budget"
        ? { weekly_budget: budgetValue }
        : { household_size: householdValue };
      const { error } = await supabase.from("profiles").update(update).eq("user_id", user.id);
      if (error) throw error;
      const labels: Record<string, string> = { zip: "ZIP code", budget: "Weekly budget", household: "Household size" };
      toast({ title: "Updated!", description: `${labels[field]} saved.` });
      setEditingField(null);
      onUpdate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 md:gap-2">
      {/* ZIP Code */}
      <div className="flex items-center gap-1.5 bg-card rounded-xl border border-border px-3 py-2 md:px-4 md:py-2.5 shadow-card">
        <MapPin className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary shrink-0" />
        {editingField === "zip" ? (
          <>
            <Input
              value={zipValue}
              onChange={(e) => setZipValue(e.target.value)}
              maxLength={5}
              className="w-14 h-7 text-sm md:w-20 md:h-8 md:text-sm"
              autoFocus
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => save("zip")} disabled={saving}>
              <Check className="w-3.5 h-3.5 text-accent" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingField(null)}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm md:text-sm font-medium text-foreground">{zipCode || "Set ZIP"}</span>
            <button onClick={() => { setZipValue(zipCode ?? ""); setEditingField("zip"); }} className="ml-1">
              <Pencil className="w-3 h-3 md:w-3.5 md:h-3.5 text-muted-foreground hover:text-primary transition-colors" />
            </button>
          </>
        )}
      </div>

      {/* Weekly Budget */}
      <div className="flex items-center gap-1.5 bg-card rounded-xl border border-border px-3 py-2 md:px-4 md:py-2.5 shadow-card">
        <DollarSign className="w-3.5 h-3.5 md:w-4 md:h-4 text-accent shrink-0" />
        {editingField === "budget" ? (
          <>
            <span className="text-sm text-foreground">$</span>
            <Input
              type="number"
              value={budgetValue}
              onChange={(e) => setBudgetValue(Number(e.target.value))}
              min={10}
              max={500}
              className="w-14 h-7 text-sm md:w-20 md:h-8 md:text-sm"
              autoFocus
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => save("budget")} disabled={saving}>
              <Check className="w-3.5 h-3.5 text-accent" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingField(null)}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm md:text-sm font-medium text-foreground">${weeklyBudget ?? 75}/wk</span>
            <button onClick={() => { setBudgetValue(weeklyBudget ?? 75); setEditingField("budget"); }} className="ml-1">
              <Pencil className="w-3 h-3 md:w-3.5 md:h-3.5 text-muted-foreground hover:text-primary transition-colors" />
            </button>
          </>
        )}
      </div>

      {/* Household Size */}
      <div className="flex items-center gap-1.5 bg-card rounded-xl border border-border px-3 py-2 md:px-4 md:py-2.5 shadow-card">
        <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary shrink-0" />
        {editingField === "household" ? (
          <>
            <Input
              type="number"
              value={householdValue}
              onChange={(e) => setHouseholdValue(Number(e.target.value))}
              min={1}
              max={20}
              className="w-14 h-7 text-sm md:w-20 md:h-8 md:text-sm"
              autoFocus
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => save("household")} disabled={saving}>
              <Check className="w-3.5 h-3.5 text-accent" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingField(null)}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm md:text-sm font-medium text-foreground">{householdSize ?? 1} {(householdSize ?? 1) === 1 ? "person" : "people"}</span>
            <button onClick={() => { setHouseholdValue(householdSize ?? 1); setEditingField("household"); }} className="ml-1">
              <Pencil className="w-3 h-3 md:w-3.5 md:h-3.5 text-muted-foreground hover:text-primary transition-colors" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
