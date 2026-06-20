import { describe, it, expect } from "vitest";
import {
  rankCandidates,
  matchRecipe,
  assignTier,
  skillFit,
  normalize,
  type CandidateRecipe,
  type InventoryItem,
} from "../../supabase/functions/_shared/cookMatch";

const inv = (name: string, freshness = "good"): InventoryItem => ({
  id: `inv-${name}`,
  item_name: name,
  freshness,
});

const rec = (id: string, title: string, ingredients: any[], extra: Partial<CandidateRecipe> = {}): CandidateRecipe => ({
  id, title, ingredients, prep_time_minutes: 10, cook_time_minutes: 15, ...extra,
});

describe("cookMatch", () => {
  it("make_now when pantry has 100% of ingredients", () => {
    const out = rankCandidates({
      inventory: [inv("eggs"), inv("bread"), inv("butter")],
      recipes: [rec("r1", "Toast", [{ item_name: "Eggs" }, { item_name: "Bread" }, { item_name: "Butter" }])],
      allergyTerms: [], dietForbidden: [], cookingConfidence: "medium",
    });
    expect(out.tiers.make_now.length).toBe(1);
    expect(out.tiers.make_now[0].pantry_match_pct).toBe(100);
    expect(out.tiers.make_now[0].cost_to_complete).toBe(0);
  });

  it("need_1 when 1 ingredient missing", () => {
    const out = rankCandidates({
      inventory: [inv("eggs"), inv("bread"), inv("butter"), inv("milk"), inv("sugar"), inv("vanilla"), inv("flour"), inv("cinnamon"), inv("yeast")],
      recipes: [rec("r2", "French Toast", [
        { item_name: "Eggs" }, { item_name: "Bread" }, { item_name: "Butter" },
        { item_name: "Milk" }, { item_name: "Sugar" }, { item_name: "Vanilla" },
        { item_name: "Flour" }, { item_name: "Cinnamon" }, { item_name: "Yeast" },
        { item_name: "Maple Syrup", estimated_price: 3 },
      ])],
      allergyTerms: [], dietForbidden: [], cookingConfidence: "medium",
    });
    expect(out.tiers.need_1.length).toBe(1);
    expect(out.tiers.need_1[0].pantry_match_pct).toBe(90);
    expect(out.tiers.need_1[0].missing_count).toBe(1);
  });

  it("hard-filters allergy violations", () => {
    const out = rankCandidates({
      inventory: [inv("flour"), inv("sugar"), inv("peanut butter")],
      recipes: [rec("r3", "Peanut Butter Cookies", [{ item_name: "Flour" }, { item_name: "Sugar" }, { item_name: "Peanut Butter" }])],
      allergyTerms: ["peanut", "peanut butter"],
      dietForbidden: [], cookingConfidence: "medium",
    });
    expect(out.matches.length).toBe(0);
  });

  it("hard-filters diet violations (vegan)", () => {
    const out = rankCandidates({
      inventory: [inv("chicken"), inv("rice")],
      recipes: [rec("r4", "Chicken Rice", [{ item_name: "Chicken" }, { item_name: "Rice" }])],
      allergyTerms: [],
      dietForbidden: ["chicken", "beef"],
      cookingConfidence: "medium",
    });
    expect(out.matches.length).toBe(0);
  });

  it("ranks uses_expiring above non-expiring at same match %", () => {
    const out = rankCandidates({
      inventory: [inv("tomato", "expiring_today"), inv("basil"), inv("cheese")],
      recipes: [
        rec("a", "Pasta", [{ item_name: "Basil" }, { item_name: "Cheese" }]),
        rec("b", "Caprese", [{ item_name: "Tomato" }, { item_name: "Basil" }, { item_name: "Cheese" }]),
      ],
      allergyTerms: [], dietForbidden: [], cookingConfidence: "medium",
    });
    expect(out.matches[0].recipe.id).toBe("b");
  });

  it("is deterministic across runs", () => {
    const input = {
      inventory: [inv("egg"), inv("toast")],
      recipes: [
        rec("z", "Z", [{ item_name: "Egg" }, { item_name: "Toast" }]),
        rec("a", "A", [{ item_name: "Egg" }, { item_name: "Toast" }]),
      ],
      allergyTerms: [], dietForbidden: [], cookingConfidence: "medium" as const,
    };
    const a = rankCandidates(input).matches.map((m) => m.recipe.id);
    const b = rankCandidates(input).matches.map((m) => m.recipe.id);
    expect(a).toEqual(b);
    expect(a[0]).toBe("a"); // tie-break by id asc
  });

  it("skillFit excludes long recipes for low confidence", () => {
    expect(skillFit(rec("x", "Stew", [], { prep_time_minutes: 30, cook_time_minutes: 60 }), "low")).toBe(false);
    expect(skillFit(rec("y", "Salad", [], { prep_time_minutes: 5, cook_time_minutes: 0 }), "low")).toBe(true);
  });

  it("matchRecipe treats pantry staples as owned", () => {
    const r = matchRecipe(
      rec("p", "Boiled Egg", [{ item_name: "Egg" }, { item_name: "Salt" }, { item_name: "Water" }]),
      new Set(["egg"]),
      new Set(),
      new Set(),
    );
    expect(r.owned).toBe(3);
    expect(r.missing.length).toBe(0);
  });

  it("assignTier respects caps", () => {
    expect(assignTier(60, 5, 20, { need_2_3_max_cost: 8, need_2_3_max_missing: 3 })).toBe("out_of_scope");
    expect(assignTier(80, 2, 6, { need_2_3_max_cost: 8, need_2_3_max_missing: 3 })).toBe("need_2_3");
  });

  it("returns empty tiers when no recipes match", () => {
    const out = rankCandidates({
      inventory: [], recipes: [],
      allergyTerms: [], dietForbidden: [], cookingConfidence: "medium",
    });
    expect(out.tiers.make_now.length).toBe(0);
    expect(out.tiers.need_1.length).toBe(0);
    expect(out.tiers.need_2_3.length).toBe(0);
  });

  it("normalize collapses whitespace and lowercases", () => {
    expect(normalize("  Olive   OIL ")).toBe("olive oil");
  });

  it("zero-ingredient recipe is out_of_scope (not need_2_3)", () => {
    const out = rankCandidates({
      inventory: [inv("eggs")],
      recipes: [rec("empty", "Empty Recipe", [])],
      allergyTerms: [], dietForbidden: [], cookingConfidence: "medium",
    });
    expect(out.matches.length).toBe(0);
    expect(out.tiers.make_now.length).toBe(0);
    expect(out.tiers.need_1.length).toBe(0);
    expect(out.tiers.need_2_3.length).toBe(0);
  });
});
