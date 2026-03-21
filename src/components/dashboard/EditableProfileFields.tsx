import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, DollarSign, Pencil, Check, X } from "lucide-react";

interface Props {
  zipCode: string | null;
  weeklyBudget: number | null;
  onUpdate: () => void;
}

export function EditableProfileFields({ zipCode, weeklyBudget, onUpdate }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingField, setEditingField] = useState<"zip" | "budget" | null>(null);
  const [zipValue, setZipValue] = useState(zipCode ?? "");
  const [budgetValue, setBudgetValue] = useState(weeklyBudget ?? 75);
  const [saving, setSaving] = useState(false);

  const save = async (field: "zip" | "budget") => {
    if (!user) return;
    setSaving(true);
    try {
      const update = field === "zip"
        ? { zip_code: zipValue }
        : { weekly_budget: budgetValue };
      const { error } = await supabase.from("profiles").update(update).eq("user_id", user.id);
      if (error) throw error;
      toast({ title: "Updated!", description: `${field === "zip" ? "ZIP code" : "Weekly budget"} saved.` });
      setEditingField(null);
      onUpdate();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-3">
      {/* ZIP Code */}
      <div className="flex items-center gap-2 bg-card rounded-xl border border-border px-4 py-2.5 shadow-card">
        <MapPin className="w-4 h-4 text-primary shrink-0" />
        {editingField === "zip" ? (
          <>
            <Input
              value={zipValue}
              onChange={(e) => setZipValue(e.target.value)}
              maxLength={5}
              className="w-20 h-7 text-sm"
              autoFocus
            />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => save("zip")} disabled={saving}>
              <Check className="w-3.5 h-3.5 text-accent" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingField(null)}>
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

      {/* Weekly Budget */}
      <div className="flex items-center gap-2 bg-card rounded-xl border border-border px-4 py-2.5 shadow-card">
        <DollarSign className="w-4 h-4 text-accent shrink-0" />
        {editingField === "budget" ? (
          <>
            <span className="text-sm text-foreground">$</span>
            <Input
              type="number"
              value={budgetValue}
              onChange={(e) => setBudgetValue(Number(e.target.value))}
              min={10}
              max={500}
              className="w-20 h-7 text-sm"
              autoFocus
            />
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => save("budget")} disabled={saving}>
              <Check className="w-3.5 h-3.5 text-accent" />
            </Button>
            <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingField(null)}>
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
    </div>
  );
}
