import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, AlertTriangle, Loader2, Refrigerator, Package } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { generateRecipesFromInventory } from "@/lib/cookFromWhatIHave";

interface PantryRow {
  id: string;
  item_name: string;
  location: string | null;
  expiration_date: string | null;
  is_out_of_stock: boolean | null;
  is_low_stock: boolean | null;
}

function daysUntil(date: string | null): number | null {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

export default function CookInventoryPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [items, setItems] = useState<PantryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [finding, setFinding] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("pantry_items")
      .select("id,item_name,location,expiration_date,is_out_of_stock,is_low_stock")
      .eq("user_id", user.id)
      .then(({ data }) => {
        setItems((data ?? []).filter((r) => !r.is_out_of_stock) as PantryRow[]);
        setLoading(false);
      });
  }, [user]);

  const { pantry, fridge, expiring } = useMemo(() => {
    const p: PantryRow[] = [];
    const f: PantryRow[] = [];
    const exp: { name: string; days: number }[] = [];
    for (const it of items) {
      const loc = (it.location || "pantry").toLowerCase();
      if (loc.includes("fridge") || loc.includes("freezer")) f.push(it);
      else p.push(it);
      const d = daysUntil(it.expiration_date);
      if (d !== null && d >= 0 && d <= 5) exp.push({ name: it.item_name, days: d });
    }
    exp.sort((a, b) => a.days - b.days);
    return { pantry: p, fridge: f, expiring: exp };
  }, [items]);

  const findMeals = async () => {
    if (!items.length) {
      toast({ title: "Add pantry items first", description: "We need something to cook with.", variant: "destructive" });
      return;
    }
    setFinding(true);
    try {
      const recipes = await generateRecipesFromInventory({ count: 3 });
      if (!recipes.length) {
        toast({ title: "No recipes found", description: "Try adding more ingredients to your pantry.", variant: "destructive" });
        return;
      }
      navigate("/dashboard/cook/recipes", { state: { recipes } });
    } catch (err) {
      toast({ title: "Couldn't generate recipes", description: (err as Error).message, variant: "destructive" });
    } finally {
      setFinding(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 pt-3 pb-28">
      <h1 className="text-center text-[20px] font-extrabold text-[#1a1a1a] mb-4">
        What Do You Already Have?
      </h1>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-[#5B3FBF]" />
        </div>
      ) : (
        <div className="space-y-3">
          <SectionCard title="Pantry" headerBg="#FDECEC" titleColor="#C0392B" Icon={Package}>
            {pantry.length ? (
              <ItemList rows={pantry} />
            ) : (
              <EmptyHint to="/dashboard/pantry" label="Add pantry items" />
            )}
          </SectionCard>

          <SectionCard title="Fridge" headerBg="#E8F0FE" titleColor="#1A56DB" Icon={Refrigerator}>
            {fridge.length ? (
              <ItemList rows={fridge} />
            ) : (
              <EmptyHint to="/dashboard/pantry" label="Add fridge items" />
            )}
          </SectionCard>

          {expiring.length > 0 && (
            <SectionCard title="Expiring Soon" headerBg="#FFF3E0" titleColor="#B26A00" Icon={AlertTriangle}>
              <ul className="divide-y divide-border">
                {expiring.map((e) => (
                  <li key={e.name} className="flex items-center px-4 py-3">
                    <AlertTriangle className="w-4 h-4 text-[#E67E22] mr-3 shrink-0" />
                    <span className="text-[14px] font-semibold text-[#1a1a1a] flex-1 truncate">
                      {e.name}
                    </span>
                    <span className="text-[12px] text-[#B26A00] font-semibold">
                      {e.days === 0 ? "Today" : `${e.days} Day${e.days === 1 ? "" : "s"} Left`}
                    </span>
                  </li>
                ))}
              </ul>
            </SectionCard>
          )}
        </div>
      )}

      <button
        onClick={findMeals}
        disabled={finding || loading}
        className="mt-6 w-full h-[52px] rounded-2xl bg-[#5B3FBF] text-white font-bold text-[15px] disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {finding ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
        {finding ? "Finding meals…" : "Find Meals"}
      </button>
    </div>
  );
}

function SectionCard({
  title, headerBg, titleColor, Icon, children,
}: { title: string; headerBg: string; titleColor: string; Icon: typeof Package; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden">
      <div className="px-4 py-2.5 flex items-center gap-2" style={{ backgroundColor: headerBg }}>
        <Icon className="w-4 h-4" style={{ color: titleColor }} />
        <p className="text-[13px] font-extrabold" style={{ color: titleColor }}>{title}</p>
      </div>
      {children}
    </div>
  );
}

function ItemList({ rows }: { rows: PantryRow[] }) {
  return (
    <ul className="divide-y divide-border">
      {rows.map((r) => (
        <li key={r.id} className="flex items-center px-4 py-3">
          <div className="w-5 h-5 rounded-full bg-[#2E7D32] flex items-center justify-center shrink-0 mr-3">
            <Check className="w-3 h-3 text-white" strokeWidth={3} />
          </div>
          <span className="text-[14px] text-[#1a1a1a] font-medium truncate">{r.item_name}</span>
        </li>
      ))}
    </ul>
  );
}

function EmptyHint({ to, label }: { to: string; label: string }) {
  return (
    <div className="px-4 py-4 text-center">
      <a href={to} className="text-[13px] text-[#5B3FBF] font-semibold underline">{label}</a>
    </div>
  );
}
