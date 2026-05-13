import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, DollarSign, Users, Pencil, Check, X, AlertCircle, Loader2 } from "lucide-react";
import { useZipValidation } from "@/hooks/useZipValidation";

interface Props {
  zipCode: string | null;
  weeklyBudget: number | null;
  householdSize: number | null;
  regionLabel?: string | null;
  onUpdate: () => void;
  onValueChanged?: () => void;
}

export function EditableProfileFields({ zipCode, weeklyBudget, householdSize, regionLabel, onUpdate, onValueChanged }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingField, setEditingField] = useState<"zip" | "budget" | "household" | null>(null);
  const [zipValue, setZipValue] = useState(zipCode ?? "");
  const [budgetValue, setBudgetValue] = useState(weeklyBudget ?? 75);
  const [householdValue, setHouseholdValue] = useState(householdSize ?? 1);
  const [saving, setSaving] = useState(false);
  const zipValidation = useZipValidation(editingField === "zip" ? zipValue : "");

  const save = async (field: "zip" | "budget" | "household") => {
    if (!user) return;
    if (field === "zip" && !zipValidation.isValid) {
      toast({ title: "Invalid ZIP", description: zipValidation.message || "Please enter a valid 5-digit US ZIP code", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const update = field === "zip"
        ? { zip_code: zipValue }
        : field === "budget"
        ? { weekly_budget: budgetValue }
        : { household_size: householdValue };
      const prev = field === "zip" ? zipCode : field === "budget" ? weeklyBudget : householdSize;
      const next = field === "zip" ? zipValue : field === "budget" ? budgetValue : householdValue;
      const changed = String(prev ?? "") !== String(next ?? "");
      const { error } = await supabase.from("profiles").update(update).eq("user_id", user.id);
      if (error) throw error;
      const labels: Record<string, string> = { zip: "ZIP code", budget: "Weekly budget", household: "Household size" };
      toast({ title: "Saved", description: `${labels[field]} updated` });
      // Blur active input so iOS un-zooms
      (document.activeElement as HTMLElement | null)?.blur?.();
      setEditingField(null);
      onUpdate();
      if (changed) onValueChanged?.();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // text-base (16px) prevents iOS Safari auto-zoom on focus
  const inputClass = "w-16 h-8 text-base md:w-20 md:h-8 md:text-sm";

  return (
    <div className="flex flex-wrap gap-2">
      {/* ZIP Code */}
      <div className="flex flex-col bg-card rounded-xl border border-border px-3 py-1.5 shadow-card">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
          {editingField === "zip" ? (
            <>
              <Input
                value={zipValue}
                onChange={(e) => setZipValue(e.target.value.replace(/\D/g, "").slice(0, 5))}
                maxLength={5}
                inputMode="numeric"
                pattern="[0-9]*"
                aria-invalid={zipValidation.status === "invalid"}
                className={`${inputClass} ${
                  zipValidation.status === "valid" ? "border-emerald-500" :
                  zipValidation.status === "invalid" ? "border-destructive" : ""
                }`}
                autoFocus
                onBlur={() => { if (zipValidation.isValid) save("zip"); }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && zipValidation.isValid) (e.target as HTMLInputElement).blur();
                  if (e.key === "Escape") setEditingField(null);
                }}
              />
              {zipValidation.status === "checking" && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
              {zipValidation.status === "valid" && <Check className="w-3.5 h-3.5 text-emerald-600" />}
              {zipValidation.status === "invalid" && <AlertCircle className="w-3.5 h-3.5 text-destructive" />}
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingField(null)}>
                <X className="w-3.5 h-3.5 text-muted-foreground" />
              </Button>
            </>
          ) : (
            <>
              <span className="text-sm font-medium text-foreground">{zipCode || "Set ZIP"}</span>
              <button onClick={() => { setZipValue(zipCode ?? ""); setEditingField("zip"); }} className="ml-1">
                <Pencil className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" />
              </button>
            </>
          )}
        </div>
        {editingField === "zip" && zipValidation.message && (
          <span className={`text-[10px] mt-0.5 ml-5 leading-tight truncate max-w-[180px] ${
            zipValidation.status === "invalid" ? "text-destructive" :
            zipValidation.status === "valid" ? "text-emerald-700" : "text-muted-foreground"
          }`}>{zipValidation.message}</span>
        )}
        {regionLabel && editingField !== "zip" && (
          <span className="text-[10px] text-muted-foreground mt-0.5 ml-5 leading-tight truncate max-w-[140px]">{regionLabel}</span>
        )}
      </div>

      {/* Weekly Budget */}
      <div className="flex items-center gap-1.5 bg-card rounded-xl border border-border px-3 py-2 shadow-card">
        <DollarSign className="w-3.5 h-3.5 text-accent shrink-0" />
        {editingField === "budget" ? (
          <>
            <span className="text-sm text-foreground">$</span>
            <Input
              type="number"
              inputMode="numeric"
              value={budgetValue}
              onChange={(e) => setBudgetValue(Number(e.target.value))}
              min={10}
              max={500}
              className={inputClass}
              autoFocus
              onBlur={() => save("budget")}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingField(null)}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm font-medium text-foreground">${weeklyBudget ?? 75}/wk</span>
            <button onClick={() => { setBudgetValue(weeklyBudget ?? 75); setEditingField("budget"); }} className="ml-1">
              <Pencil className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" />
            </button>
          </>
        )}
      </div>

      {/* Household Size */}
      <div className="flex items-center gap-1.5 bg-card rounded-xl border border-border px-3 py-2 shadow-card">
        <Users className="w-3.5 h-3.5 text-primary shrink-0" />
        {editingField === "household" ? (
          <>
            <Input
              type="number"
              inputMode="numeric"
              value={householdValue}
              onChange={(e) => setHouseholdValue(Number(e.target.value))}
              min={1}
              max={20}
              className={inputClass}
              autoFocus
              onBlur={() => save("household")}
              onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
            />
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingField(null)}>
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </Button>
          </>
        ) : (
          <>
            <span className="text-sm font-medium text-foreground">{householdSize ?? 1} {(householdSize ?? 1) === 1 ? "person" : "people"}</span>
            <button onClick={() => { setHouseholdValue(householdSize ?? 1); setEditingField("household"); }} className="ml-1">
              <Pencil className="w-3 h-3 text-muted-foreground hover:text-primary transition-colors" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
