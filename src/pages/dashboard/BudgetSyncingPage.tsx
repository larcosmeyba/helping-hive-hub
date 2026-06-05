import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const STEPS = [
  "Connecting to your bank",
  "Importing transactions",
  "Finding food-related spending",
  "Categorizing groceries and restaurants",
  "Building your dashboard",
];

export default function BudgetSyncingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [search] = useSearchParams();
  const demo = search.get("demo") === "1";
  const [step, setStep] = useState(0);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      for (let i = 0; i < STEPS.length; i++) {
        await new Promise((r) => setTimeout(r, 700));
        if (cancelled) return;
        setStep(i + 1);
        // Trigger real sync + calc partway through if Plaid is wired up.
        if (!demo && user && i === 2) {
          try {
            await supabase.functions.invoke("sync-plaid-transactions", { body: {} });
            await supabase.functions.invoke("calculate-budget-dashboard", { body: {} });
          } catch {
            // Ignore; we'll fall back to mock data on the dashboard.
          }
        }
      }
      if (!cancelled) {
        setTimeout(() => navigate("/dashboard/budget-snapshot", { replace: true }), 500);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [navigate, user, demo]);

  return (
    <div className="max-w-md mx-auto px-4 pt-8 pb-10">
      <h1 className="text-[22px] font-extrabold text-[#1a1a1a] mb-2">Syncing Your Food Spending</h1>
      <p className="text-[13px] text-[#6b6b6b] mb-8">This may take a few moments.</p>

      <div className="space-y-3">
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div
              key={label}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition ${
                done ? "bg-[#E9F4ED] border-[#9CB87A]" : active ? "bg-white border-[#1F5A3D]" : "bg-white border-[#EEE7DA]"
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center ${
                  done ? "bg-[#1F5A3D] text-white" : active ? "bg-[#FFF8E8] text-[#1F5A3D]" : "bg-[#F5EBDC] text-[#6b6b6b]"
                }`}
              >
                {done ? <Check className="w-4 h-4" /> : <span className="text-[12px] font-bold">{i + 1}</span>}
              </div>
              <span className={`text-[14px] ${done ? "text-[#1F5A3D] font-semibold" : "text-[#1a1a1a]"}`}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
