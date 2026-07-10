export const ONBOARDING_TOTAL_STEPS = 9;

export function normalizeQuestionnaireStep(value: unknown): number {
  const step = typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : 1;
  return Math.min(Math.max(step, 1), ONBOARDING_TOTAL_STEPS);
}
