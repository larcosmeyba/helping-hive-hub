import { supabase } from "@/integrations/supabase/client";

export interface OutcomeInputs {
  userId: string;
  weekStart: string; // YYYY-MM-DD
  budgetTarget: number;
  actualSpend: number;
  mealsPlanned: number;
  mealsCooked: number;
  pantrySavings?: number;
  wasteReported?: boolean;
}

/**
 * Outcome score (0-100) blends three signals:
 *  - Budget adherence (40 pts): how well actual spend hit the target
 *  - Plan adherence (40 pts): meals cooked / meals planned
 *  - Waste penalty (20 pts): full credit if no waste reported
 */
export function computeOutcomeScore(i: Omit<OutcomeInputs, "userId" | "weekStart">) {
  const { budgetTarget, actualSpend, mealsPlanned, mealsCooked, wasteReported } = i;

  // Budget adherence: 100% if at or under budget; degrades as overspend grows
  const budgetPts =
    budgetTarget > 0
      ? Math.max(0, Math.min(40, Math.round((1 - Math.max(0, actualSpend - budgetTarget) / budgetTarget) * 40)))
      : 0;

  // Plan adherence
  const adherenceRatio = mealsPlanned > 0 ? mealsCooked / mealsPlanned : 0;
  const adherencePts = Math.round(Math.min(1, adherenceRatio) * 40);

  const wastePts = wasteReported ? 0 : 20;

  return {
    score: budgetPts + adherencePts + wastePts,
    adherenceScore: Math.round(adherenceRatio * 100),
  };
}

export async function recordWeeklyOutcome(i: OutcomeInputs) {
  const { score, adherenceScore } = computeOutcomeScore(i);
  const savings = Math.max(0, i.budgetTarget - i.actualSpend) + (i.pantrySavings ?? 0);

  const { error } = await supabase.from("user_outcomes").upsert(
    {
      user_id: i.userId,
      week_start: i.weekStart,
      budget_target: i.budgetTarget,
      actual_spend: i.actualSpend,
      savings_amount: savings,
      meals_cooked: i.mealsCooked,
      meals_planned: i.mealsPlanned,
      adherence_score: adherenceScore,
      waste_reported: i.wasteReported ?? false,
      outcome_score: score,
    },
    { onConflict: "user_id,week_start" }
  );

  return { error, score, adherenceScore, savings };
}

export function currentWeekStart(): string {
  const d = new Date();
  const day = d.getDay(); // 0 = Sunday
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday
  const monday = new Date(d.setDate(diff));
  return monday.toISOString().slice(0, 10);
}
