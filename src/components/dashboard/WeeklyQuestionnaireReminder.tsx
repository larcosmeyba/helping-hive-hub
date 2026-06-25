import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarCheck, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchCurrentWeekQuestionnaire, isQuestionnaireDue } from "@/lib/weeklyQuestionnaire";

export function WeeklyQuestionnaireReminder() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (!user) return;
      // Fast path: profile timestamp says it's still fresh.
      const last = (profile as any)?.last_weekly_questionnaire_at as string | undefined;
      if (last && !isQuestionnaireDue(last)) {
        if (!cancelled) setShow(false);
        return;
      }
      // Confirm by checking the current-week row directly.
      const row = await fetchCurrentWeekQuestionnaire(user.id);
      if (!cancelled) setShow(!row);
    }
    check();
    return () => { cancelled = true; };
  }, [user?.id, (profile as any)?.last_weekly_questionnaire_at]);

  if (!show) return null;

  return (
    <button
      onClick={() => navigate("/dashboard/meal-plan/weekly-questionnaire")}
      className="w-full text-left mt-3 rounded-2xl p-4 bg-[#FFF6E0] border border-[#F2B233]/40 flex items-center gap-3 active:scale-[0.99] transition-transform"
    >
      <div className="w-10 h-10 rounded-full bg-[#F2B233] flex items-center justify-center shrink-0">
        <CalendarCheck className="w-5 h-5 text-white" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[14px] font-bold text-[#1a1a1a]">It's time to build this week's meal plan.</div>
        <div className="text-[12.5px] text-[#5a4a1f] mt-0.5">Choose the foods you want this week and we'll create meals that fit your budget.</div>
        <div className="mt-2 inline-flex items-center gap-1 text-[12.5px] font-semibold text-[#1F5A3D]">
          Start This Week's Questionnaire <ArrowRight className="w-3.5 h-3.5" />
        </div>
      </div>
    </button>
  );
}
