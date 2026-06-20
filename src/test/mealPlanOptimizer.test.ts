import { describe, it, expect } from "vitest";
import {
  runOptimizer,
  type OptimizerInputs,
  type OptimizerCandidate,
} from "../../supabase/functions/_shared/mealPlanOptimizer";

function recipeContainsAny(r: OptimizerCandidate, terms: string[]): boolean {
  const hay = (
    String(r.title ?? "") +
    " " +
    (Array.isArray(r.ingredients) ? r.ingredients.map((i: any) => (typeof i === "string" ? i : i?.item_name ?? "")).join(" ") : "")
  ).toLowerCase();
  return terms.some((t) => t && hay.includes(t.toLowerCase()));
}

const slots7 = (() => {
  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const out: Array<{ day_name: string; meal_type: "breakfast" | "lunch" | "dinner" }> = [];
  for (const d of days) for (const m of ["breakfast", "lunch", "dinner"] as const) out.push({ day_name: d, meal_type: m });
  return out;
})();

function mkRecipe(id: string, meal_type: string, opts: Partial<OptimizerCandidate> = {}): OptimizerCandidate {
  return {
    id,
    title: opts.title ?? `Recipe ${id}`,
    meal_type,
    cost_per_serving: 3,
    ingredients: [],
    tags: [],
    kid_friendly: false,
    ...opts,
  };
}

function baseInputs(overrides: Partial<OptimizerInputs> = {}): OptimizerInputs {
  const make = (mt: string, n: number) =>
    Array.from({ length: n }, (_, i) => mkRecipe(`${mt}-${i}`, mt, { cost_per_serving: 3 + i * 0.1 }));
  return {
    candidates: { breakfast: make("breakfast", 10), lunch: make("lunch", 10), dinner: make("dinner", 10) },
    pantryItems: [],
    expiringSoon: [],
    profile: { household_size: 2, weekly_budget: 200, allergies: [], dietary_preferences: [] },
    recentRecipeIds: [],
    slots: slots7,
    recipeContainsAny,
    allergyTerms: [],
    dietForbidden: [],
    dislikedTerms: [],
    ...overrides,
  };
}

describe("mealPlanOptimizer", () => {
  it("respects allergy hard constraints", () => {
    const candidates = {
      breakfast: [
        mkRecipe("b1", "breakfast", { ingredients: ["peanut butter", "bread"] }),
        mkRecipe("b2", "breakfast", { ingredients: ["oats", "milk"] }),
      ],
      lunch: [mkRecipe("l1", "lunch", { ingredients: ["chicken"] })],
      dinner: [mkRecipe("d1", "dinner", { ingredients: ["rice", "beans"] })],
    };
    const res = runOptimizer(baseInputs({
      candidates,
      allergyTerms: ["peanut"],
      slots: [{ day_name: "Monday", meal_type: "breakfast" }],
    }));
    expect(res.selections.find((s) => s.meal_type === "breakfast")?.recipe_id).toBe("b2");
  });

  it("prefers pantry + expiring-soon items", () => {
    const candidates = {
      breakfast: [
        mkRecipe("plain", "breakfast", { ingredients: ["bread"], cost_per_serving: 2 }),
        mkRecipe("uses-pantry", "breakfast", { ingredients: ["spinach", "eggs"], cost_per_serving: 2.5 }),
      ],
      lunch: [mkRecipe("l1", "lunch")],
      dinner: [mkRecipe("d1", "dinner")],
    };
    const res = runOptimizer(baseInputs({
      candidates,
      pantryItems: [{ normalized_name: "spinach" }, { normalized_name: "eggs" }],
      expiringSoon: [{ normalized_name: "spinach" }],
      slots: [{ day_name: "Monday", meal_type: "breakfast" }],
    }));
    expect(res.selections[0].recipe_id).toBe("uses-pantry");
    expect(res.debug.expiring_items_used).toBeGreaterThan(0);
  });

  it("budget-repair brings subtotal under weekly_budget when feasible", () => {
    // Lots of cheap alternatives, but rank initially favors expensive (via expiring) — then repair swaps down.
    const candidates = {
      breakfast: [
        mkRecipe("b-cheap", "breakfast", { cost_per_serving: 1 }),
        mkRecipe("b-mid", "breakfast", { cost_per_serving: 2 }),
        mkRecipe("b-exp", "breakfast", { cost_per_serving: 50 }),
      ],
      lunch: [mkRecipe("l-cheap", "lunch", { cost_per_serving: 1 })],
      dinner: [mkRecipe("d-cheap", "dinner", { cost_per_serving: 1 })],
    };
    const res = runOptimizer(baseInputs({
      candidates,
      profile: { household_size: 2, weekly_budget: 10, allergies: [], dietary_preferences: [] },
      slots: [
        { day_name: "Monday", meal_type: "breakfast" },
        { day_name: "Monday", meal_type: "lunch" },
        { day_name: "Monday", meal_type: "dinner" },
      ],
    }));
    expect(res.debug.budget_subtotal).toBeLessThanOrEqual(10);
  });

  it("variety penalty avoids duplicate protein within the week", () => {
    const make = (id: string) => mkRecipe(id, "dinner", { ingredients: ["chicken", "rice"], cost_per_serving: 3 });
    const beef = mkRecipe("beef", "dinner", { ingredients: ["beef", "rice"], cost_per_serving: 3 });
    const candidates = {
      breakfast: [mkRecipe("bx", "breakfast")],
      lunch: [mkRecipe("lx", "lunch")],
      dinner: [make("c1"), make("c2"), make("c3"), beef],
    };
    const res = runOptimizer(baseInputs({
      candidates,
      slots: [
        { day_name: "Monday", meal_type: "dinner" },
        { day_name: "Tuesday", meal_type: "dinner" },
      ],
    }));
    const ids = res.selections.filter((s) => s.meal_type === "dinner").map((s) => s.recipe_id);
    expect(ids).toContain("beef"); // variety pushed beef in as second
  });

  it("de-prioritizes recentRecipeIds", () => {
    const candidates = {
      breakfast: [
        mkRecipe("recent", "breakfast", { cost_per_serving: 2 }),
        mkRecipe("fresh", "breakfast", { cost_per_serving: 2.5 }),
      ],
      lunch: [mkRecipe("l1", "lunch")],
      dinner: [mkRecipe("d1", "dinner")],
    };
    const res = runOptimizer(baseInputs({
      candidates,
      recentRecipeIds: ["recent"],
      slots: [{ day_name: "Monday", meal_type: "breakfast" }],
    }));
    expect(res.selections[0].recipe_id).toBe("fresh");
  });

  it("is deterministic — same inputs produce the same plan", () => {
    const a = runOptimizer(baseInputs());
    const b = runOptimizer(baseInputs());
    expect(a.selections.map((s) => s.recipe_id)).toEqual(b.selections.map((s) => s.recipe_id));
  });

  it("kid-friendly repair brings >=3 kid-friendly meals when children 5–12 present", () => {
    // Plain pool has zero kid_friendly; add kid-friendly alternatives that
    // can be swapped in for each slot.
    const candidates = {
      breakfast: [
        mkRecipe("b-plain-1", "breakfast", { cost_per_serving: 2 }),
        mkRecipe("b-kf-1", "breakfast", { cost_per_serving: 2.5, kid_friendly: true }),
      ],
      lunch: [
        mkRecipe("l-plain-1", "lunch", { cost_per_serving: 2 }),
        mkRecipe("l-kf-1", "lunch", { cost_per_serving: 2.5, family_friendly: true }),
      ],
      dinner: [
        mkRecipe("d-plain-1", "dinner", { cost_per_serving: 2 }),
        mkRecipe("d-kf-1", "dinner", { cost_per_serving: 2.5, kid_friendly: true }),
      ],
    };
    const res = runOptimizer(baseInputs({
      candidates,
      profile: { household_size: 4, weekly_budget: 500, allergies: [], dietary_preferences: [], children_5_to_12: 2 },
      slots: [
        { day_name: "Monday", meal_type: "breakfast" },
        { day_name: "Monday", meal_type: "lunch" },
        { day_name: "Monday", meal_type: "dinner" },
      ],
    }));
    const kfIds = ["b-kf-1", "l-kf-1", "d-kf-1"];
    const kfPicked = res.selections.filter((s) => kfIds.includes(s.recipe_id)).length;
    expect(kfPicked).toBeGreaterThanOrEqual(3);
  });

  it("excludes dietForbidden recipes via hard filter", () => {
    const candidates = {
      breakfast: [
        mkRecipe("bad", "breakfast", { ingredients: ["bacon", "eggs"] }),
        mkRecipe("good", "breakfast", { ingredients: ["oats"] }),
      ],
      lunch: [mkRecipe("l1", "lunch")],
      dinner: [mkRecipe("d1", "dinner")],
    };
    const res = runOptimizer(baseInputs({
      candidates,
      dietForbidden: ["bacon", "pork"],
      slots: [{ day_name: "Monday", meal_type: "breakfast" }],
    }));
    expect(res.selections[0].recipe_id).toBe("good");
  });

  it("excludes disliked-foods recipes via hard filter", () => {
    const candidates = {
      breakfast: [
        mkRecipe("mushroom", "breakfast", { ingredients: ["mushrooms", "eggs"], cost_per_serving: 2 }),
        mkRecipe("ok", "breakfast", { ingredients: ["oats"], cost_per_serving: 3 }),
      ],
      lunch: [mkRecipe("l1", "lunch")],
      dinner: [mkRecipe("d1", "dinner")],
    };
    const res = runOptimizer(baseInputs({
      candidates,
      dislikedTerms: ["mushroom"],
      slots: [{ day_name: "Monday", meal_type: "breakfast" }],
    }));
    expect(res.selections[0].recipe_id).toBe("ok");
  });

  // ===== Phase A coverage =====

  it("excludes recipes above the user's cooking_confidence cap (skill hard filter)", () => {
    const candidates = {
      breakfast: [
        // Above beginner cap (>30 min, >8 ingredients).
        mkRecipe("hard", "breakfast", {
          ingredients: ["a", "b", "c", "d", "e", "f", "g", "h", "i"],
          prep_time_minutes: 30,
          cook_time_minutes: 30,
        }),
        // Well within beginner cap.
        mkRecipe("easy", "breakfast", {
          ingredients: ["oats", "milk"],
          prep_time_minutes: 5,
          cook_time_minutes: 5,
        }),
      ],
      lunch: [mkRecipe("l1", "lunch")],
      dinner: [mkRecipe("d1", "dinner")],
    };
    const res = runOptimizer(baseInputs({
      candidates,
      profile: { household_size: 2, weekly_budget: 200, allergies: [], dietary_preferences: [], cooking_confidence: "beginner" },
      slots: [{ day_name: "Monday", meal_type: "breakfast" }],
    }));
    expect(res.selections[0].recipe_id).toBe("easy");
    expect(res.debug.skill_filtered_out).toBeGreaterThan(0);
  });

  it("excludes toddler choking-hazard recipes when has_toddler is true (hard filter)", () => {
    const candidates = {
      breakfast: [
        mkRecipe("hazard", "breakfast", { ingredients: ["whole grapes", "yogurt"] }),
        mkRecipe("safe", "breakfast", { ingredients: ["oats", "milk"] }),
      ],
      lunch: [mkRecipe("l1", "lunch")],
      dinner: [mkRecipe("d1", "dinner")],
    };
    const res = runOptimizer(baseInputs({
      candidates,
      profile: { household_size: 3, weekly_budget: 200, allergies: [], dietary_preferences: [], has_toddler: true },
      toddlerHazards: ["whole grapes", "popcorn"],
      slots: [{ day_name: "Monday", meal_type: "breakfast" }],
    }));
    expect(res.selections[0].recipe_id).toBe("safe");
    expect(res.debug.toddler_filtered_out).toBeGreaterThan(0);
  });

  it("places snack slots when a snack pool is provided", () => {
    const candidates = {
      breakfast: [mkRecipe("b1", "breakfast")],
      lunch: [mkRecipe("l1", "lunch")],
      dinner: [mkRecipe("d1", "dinner")],
      snack: [mkRecipe("s1", "snack", { cost_per_serving: 0.75 })],
    };
    const res = runOptimizer(baseInputs({
      candidates,
      slots: [
        { day_name: "Monday", meal_type: "breakfast" },
        { day_name: "Monday", meal_type: "snack" },
      ],
    }));
    const snackPick = res.selections.find((s) => s.meal_type === "snack");
    expect(snackPick?.recipe_id).toBe("s1");
  });

  it("favorite_bonus picks a favorited recipe over a slightly-better-scoring alternative", () => {
    const candidates = {
      breakfast: [
        mkRecipe("normal", "breakfast", { cost_per_serving: 2 }),
        mkRecipe("fav", "breakfast", { cost_per_serving: 2.5 }),
      ],
      lunch: [mkRecipe("l1", "lunch")],
      dinner: [mkRecipe("d1", "dinner")],
    };
    const res = runOptimizer(baseInputs({
      candidates,
      favoriteRecipeIds: ["fav"],
      slots: [{ day_name: "Monday", meal_type: "breakfast" }],
    }));
    expect(res.selections[0].recipe_id).toBe("fav");
  });

  it("reports pantry_utilization_pct based on owned items consumed", () => {
    const candidates = {
      breakfast: [
        mkRecipe("uses-pantry", "breakfast", { ingredients: ["spinach", "eggs", "salt"] }),
      ],
      lunch: [mkRecipe("l1", "lunch")],
      dinner: [mkRecipe("d1", "dinner")],
    };
    const res = runOptimizer(baseInputs({
      candidates,
      pantryItems: [{ normalized_name: "spinach" }, { normalized_name: "eggs" }],
      slots: [{ day_name: "Monday", meal_type: "breakfast" }],
    }));
    expect(res.debug.pantry_utilization_pct).toBeGreaterThan(0);
  });
});
