import { describe, expect, it } from "vitest";
import { computeOwnedAdjustedMealFloor } from "../../supabase/functions/_shared/mealPlanBudgetFloor";

const baseOptions = {
  servingsMultiplier: 4,
  ownedNormalized: new Set<string>(),
  stapleKeywords: ["salt", "pepper", "olive oil", "water", "oil"],
  snackSlotKeys: ["morning_snack", "afternoon_snack", "after_dinner_snack"],
};

describe("computeOwnedAdjustedMealFloor", () => {
  it("keeps the conservative floor when no ingredients are owned", () => {
    const floor = computeOwnedAdjustedMealFloor({
      meal_type: "dinner",
      recipe: {
        cost_per_serving: 5,
        ingredients: ["1 lb chicken thighs", "2 cups rice", "1 cup broccoli", "1 tsp salt"],
      },
    }, baseOptions);

    // Salt is treated as a staple, so 3 of 4 ingredients remain cost-bearing.
    expect(floor).toBe(15);
  });

  it("discounts owned pantry, fridge, and freezer ingredients", () => {
    const floor = computeOwnedAdjustedMealFloor({
      meal_type: "dinner",
      recipe: {
        cost_per_serving: 5,
        ingredients: ["1 lb chicken thighs", "2 cups rice", "1 cup spinach", "1 tsp salt"],
      },
    }, {
      ...baseOptions,
      ownedNormalized: new Set(["chicken thighs", "rice", "spinach"]),
    });

    expect(floor).toBe(0);
  });

  it("caps snack floor at the minimum snack amount", () => {
    const floor = computeOwnedAdjustedMealFloor({
      meal_type: "morning_snack",
      recipe: {
        cost_per_serving: 4,
        ingredients: ["1 apple", "1 tbsp peanut butter"],
      },
    }, baseOptions);

    expect(floor).toBe(3);
  });
});
