import { supabase } from "@/integrations/supabase/client";

export interface WeeklyQuestionnaire {
  id?: string;
  user_id?: string;
  week_start: string; // YYYY-MM-DD (Monday)
  breakfast_carbs: string[];
  breakfast_proteins: string[];
  breakfast_fats: string[];
  breakfast_snacks: string[];
  lunch_carbs: string[];
  lunch_proteins: string[];
  lunch_fats: string[];
  lunch_snacks: string[];
  dinner_carbs: string[];
  dinner_proteins: string[];
  dinner_fats: string[];
  evening_snacks: string[];
  vegetables: string[];
  foods_to_avoid: string;
  allergies: string[];
  extra_cart_items: string;
  completed_at?: string;
}

export function getCurrentWeekStart(d = new Date()): string {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun..6=Sat
  const diff = (day === 0 ? -6 : 1 - day); // shift to Monday
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}

export function isQuestionnaireDue(lastCompletedAt: string | null | undefined): boolean {
  if (!lastCompletedAt) return true;
  const last = new Date(lastCompletedAt).getTime();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
  return Date.now() - last >= sevenDaysMs;
}

export async function fetchCurrentWeekQuestionnaire(userId: string): Promise<WeeklyQuestionnaire | null> {
  const weekStart = getCurrentWeekStart();
  const { data, error } = await supabase
    .from("weekly_meal_questionnaires" as any)
    .select("*")
    .eq("user_id", userId)
    .eq("week_start", weekStart)
    .maybeSingle();
  if (error) {
    console.warn("[weeklyQuestionnaire] fetch failed", error);
    return null;
  }
  return (data as any) ?? null;
}

export async function saveWeeklyQuestionnaire(
  userId: string,
  payload: Omit<WeeklyQuestionnaire, "user_id" | "week_start" | "id" | "completed_at">,
): Promise<void> {
  const week_start = getCurrentWeekStart();
  const row = {
    user_id: userId,
    week_start,
    ...payload,
    completed_at: new Date().toISOString(),
  };
  const { error } = await supabase
    .from("weekly_meal_questionnaires" as any)
    .upsert(row, { onConflict: "user_id,week_start" });
  if (error) throw error;

  await supabase
    .from("profiles")
    .update({ last_weekly_questionnaire_at: new Date().toISOString() } as any)
    .eq("user_id", userId);
}
