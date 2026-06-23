import { describe, it, expect } from "vitest";
import {
  computeHouseholdServings,
  scaleIngredientQuantity,
} from "../../supabase/functions/_shared/householdScaling";

describe("computeHouseholdServings", () => {
  it("1 adult -> 1.0", () => {
    expect(computeHouseholdServings({ household_size: 1 })).toBe(1);
  });

  it("2 adults + 2 children (ages 6 and 10) -> 3.3", () => {
    const s = computeHouseholdServings({
      household_size: 4,
      children_5_to_12: 2,
      children_ages: [6, 10],
    });
    expect(s).toBeCloseTo(3.3, 5);
  });

  it("toddler is excluded (2 adults + 1 under-5 -> 2.0)", () => {
    const s = computeHouseholdServings({
      household_size: 3,
      children_under_5: 1,
    });
    expect(s).toBe(2);
  });

  it("1 adult + 1 senior -> 1.9", () => {
    const s = computeHouseholdServings({
      household_size: 2,
      seniors_65_plus: 1,
    });
    expect(s).toBeCloseTo(1.9, 5);
  });

  it("defaults children to 0.7 when ages are missing", () => {
    const s = computeHouseholdServings({
      household_size: 3,
      children_5_to_12: 2,
    });
    // adults = max(1, 3-2) = 1; kids 0.7*2 = 1.4 -> 2.4
    expect(s).toBeCloseTo(2.4, 5);
  });

  it("always returns at least 1.0", () => {
    expect(computeHouseholdServings({})).toBe(1);
    expect(computeHouseholdServings({ household_size: 0 })).toBe(1);
  });

  it("is deterministic", () => {
    const p = { household_size: 4, children_5_to_12: 2, children_ages: [7, 11] };
    expect(computeHouseholdServings(p)).toBe(computeHouseholdServings(p));
  });
});

describe("scaleIngredientQuantity", () => {
  it("scales fractional units with 1-decimal rounding", () => {
    expect(scaleIngredientQuantity("2 cups rice", 2)).toBe("4 cups rice");
  });

  it("rounds whole counts UP", () => {
    expect(scaleIngredientQuantity("1 lb chicken", 3.3)).toBe("3.3 lb chicken");
    expect(scaleIngredientQuantity("2 eggs", 1.7)).toBe("4 eggs");
  });

  it("leaves staples unscaled", () => {
    expect(scaleIngredientQuantity("salt", 5)).toBe("salt");
    expect(scaleIngredientQuantity("1 tbsp olive oil", 4)).toBe("1 tbsp olive oil");
  });

  it("returns input unchanged when no quantity is parseable", () => {
    expect(scaleIngredientQuantity("chicken breast", 2)).toBe("chicken breast");
  });

  it("is deterministic", () => {
    expect(scaleIngredientQuantity("3 cups flour", 2.5))
      .toBe(scaleIngredientQuantity("3 cups flour", 2.5));
  });
});
