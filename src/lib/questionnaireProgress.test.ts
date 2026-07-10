import { describe, expect, it } from "vitest";
import { ONBOARDING_TOTAL_STEPS, normalizeQuestionnaireStep } from "./questionnaireProgress";

describe("normalizeQuestionnaireStep", () => {
  it("keeps valid steps unchanged", () => {
    expect(normalizeQuestionnaireStep(1)).toBe(1);
    expect(normalizeQuestionnaireStep(4)).toBe(4);
    expect(normalizeQuestionnaireStep(ONBOARDING_TOTAL_STEPS)).toBe(ONBOARDING_TOTAL_STEPS);
  });

  it("clamps stale or invalid saved progress into the visible questionnaire range", () => {
    expect(normalizeQuestionnaireStep(0)).toBe(1);
    expect(normalizeQuestionnaireStep(-3)).toBe(1);
    expect(normalizeQuestionnaireStep(10)).toBe(ONBOARDING_TOTAL_STEPS);
    expect(normalizeQuestionnaireStep(undefined)).toBe(1);
    expect(normalizeQuestionnaireStep("4")).toBe(1);
  });

  it("handles fractional and non-finite values", () => {
    expect(normalizeQuestionnaireStep(4.8)).toBe(4);
    expect(normalizeQuestionnaireStep(Number.NaN)).toBe(1);
    expect(normalizeQuestionnaireStep(Number.POSITIVE_INFINITY)).toBe(1);
  });
});
