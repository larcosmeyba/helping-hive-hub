import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Heart, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { updateResourceStatus } from "@/lib/familyAssistance";
import { toast } from "@/components/ui/sonner";

type SavedRow = {
  id: string;
  resource_id: string;
  status: string;
  notes: string | null;
  resource_name: string;
  category: string;
};

const STATUSES = ["saved", "contacted", "applied", "completed"] as const;

export default function FamilyAssistancePlanPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [rows, setRows] = useState<SavedRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    setLoading(true);
    const { data: saved, error } = await supabase
      .from("saved_resources")
      .select("id, resource_id, status, notes, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }

    const ids = (saved ?? []).map((s) => s.resource_id);
    let map: Record<string, { resource_name: string; category: string }> = {};
    if (ids.length) {
      const { data: res } = await supabase.from("local_resources").select("id, resource_name, category").in("id", ids);
      for (const r of res ?? []) map[r.id] = { resource_name: r.resource_name, category: r.category };
    }
    setRows(
      (saved ?? []).map((s) => ({
        id: s.id,
        resource_id: s.resource_id,
        status: s.status,
        notes: s.notes,
        resource_name: map[s.resource_id]?.resource_name ?? "Resource",
        category: map[s.resource_id]?.category ?? "",
      }))
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, [user?.id]);

  const counts = STATUSES.reduce((acc, s) => {
    acc[s] = rows.filter((r) => r.status === s).length;
    return acc;
  }, {} as Record<string, number>);

  const cycleStatus = async (row: SavedRow) => {
    const idx = STATUSES.indexOf(row.status as any);
    const next = STATUSES[(idx + 1) % STATUSES.length];
    try {
      await updateResourceStatus(row.resource_id, next);
      setRows((rs) => rs.map((r) => (r.id === row.id ? { ...r, status: next } : r)));
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update");
    }
  };

  return (
    <div className="max-w-md mx-auto px-1 pb-32">
      <h1 className="text-center text-[20px] font-extrabold text-[#1a1a1a] mt-2">Your Family Assistance Plan</h1>
      <div className="flex justify-center my-3">
        <Heart className="w-7 h-7 fill-[#E63B6B] text-[#E63B6B]" />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-[#E63B6B]" /></div>
      ) : (
        <>
          <div className="rounded-2xl bg-[#FEECEC] p-4 mb-4">
            <h2 className="font-bold text-[15px] text-[#1a1a1a] mb-2">Saved Resources</h2>
            {rows.length === 0 ? (
              <p className="text-[13px] text-[#6b6b6b]">No saved resources yet. Browse matches to save some.</p>
            ) : (
              <ul className="space-y-1.5">
                {rows.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 text-[14px] text-[#1a1a1a]">
                    <Check className="w-4 h-4 text-[#1F7A3D] shrink-0" />
                    <button onClick={() => navigate(`/dashboard/resources/match/${r.resource_id}`)} className="text-left flex-1 truncate underline-offset-2 hover:underline">
                      {r.resource_name}
                    </button>
                    <button
                      onClick={() => cycleStatus(r)}
                      className="text-[11px] font-bold uppercase px-2 py-1 rounded-md bg-white border border-[#EAEAEA] text-[#1a1a1a] shrink-0"
                    >
                      {r.status}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl bg-[#FEECEC] p-4 mb-5">
            <h2 className="font-bold text-[15px] text-[#1a1a1a] mb-3">Progress Tracker</h2>
            <ul className="space-y-2">
              {STATUSES.map((s) => (
                <li key={s} className="flex justify-between text-[14px] text-[#1a1a1a]">
                  <span className="capitalize">{s}</span>
                  <span className="font-bold">{counts[s] ?? 0}</span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}

      <button
        onClick={() => navigate("/dashboard")}
        className="w-full bg-[#E63B6B] text-white font-bold text-[15px] py-4 rounded-xl"
      >
        Return Home
      </button>
    </div>
  );
}
