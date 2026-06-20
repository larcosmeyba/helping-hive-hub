import { describe, it, expect } from "vitest";
import {
  computeBudgetFix,
  type FixInputs,
  type FixItem,
} from "../../supabase/functions/_shared/budgetFix";

function mk(id: string, name: string, price: number, qty = 1, extra: Partial<FixItem> = {}): FixItem {
  return { id, name, unit_price: price, quantity: qty, ...extra };
}

const base = (overrides: Partial<FixInputs> = {}): FixInputs => ({
  items: [],
  pantry: [],
  weeklyBudget: 100,
  storeBrandName: "Kroger",
  ...overrides,
});

describe("computeBudgetFix", () => {
  it("returns no suggestions when already within budget", () => {
    const r = computeBudgetFix(base({
      items: [mk("a", "Bananas", 2)],
      weeklyBudget: 50,
    }));
    expect(r.fits_budget).toBe(true);
    expect(r.over_by).toBe(0);
  });

  it("store-brand swap saves ~20%", () => {
    const r = computeBudgetFix(base({
      items: [mk("a", "Cereal", 10, 1, { brand: "Cheerios" })],
      weeklyBudget: 5,
    }));
    const sbs = r.suggestions.find((s) => s.type === "store_brand_swap");
    expect(sbs).toBeTruthy();
    expect(sbs!.dollars_saved).toBeCloseTo(2.00, 2);
    expect(sbs!.to_name).toContain("Kroger");
  });

  it("cheaper protein swap fires on chicken breast", () => {
    const r = computeBudgetFix(base({
      items: [mk("a", "Chicken Breast", 10, 2)],
      weeklyBudget: 5,
    }));
    const sub = r.suggestions.find((s) => s.type === "cheaper_protein");
    expect(sub).toBeTruthy();
    expect(sub!.to_name).toBe("Chicken Thighs");
    expect(sub!.dollars_saved).toBeGreaterThan(0);
  });

  it("frozen swap fires on fresh spinach", () => {
    const r = computeBudgetFix(base({
      items: [mk("a", "Fresh Spinach", 4)],
      weeklyBudget: 1,
    }));
    expect(r.suggestions.some((s) => s.type === "frozen_or_canned")).toBe(true);
  });

  it("drop optional removes snacks when over budget", () => {
    const r = computeBudgetFix(base({
      items: [mk("a", "Potato Chips", 6, 1, { category: "Snacks" })],
      weeklyBudget: 1,
    }));
    const drop = r.suggestions.find((s) => s.type === "drop_optional");
    expect(drop).toBeTruthy();
    expect(drop!.drop).toBe(true);
    expect(drop!.dollars_saved).toBe(6);
  });

  it("use_more_pantry fires when an item matches a pantry entry", () => {
    const r = computeBudgetFix(base({
      items: [mk("a", "Olive Oil", 8)],
      pantry: [{ name: "olive oil" }],
      weeklyBudget: 1,
    }));
    const p = r.suggestions.find((s) => s.type === "use_more_pantry");
    expect(p).toBeTruthy();
    expect(p!.new_already_have).toBe(true);
  });

  it("cheaper_recipe targets the highest-cost recipe", () => {
    const r = computeBudgetFix(base({
      items: [
        mk("a", "Steak",       20, 1, { recipe_id: "r1" }),
        mk("b", "Asparagus",    4, 1, { recipe_id: "r1" }),
        mk("c", "Rice",         2, 1, { recipe_id: "r2" }),
      ],
      weeklyBudget: 5,
    }));
    const cr = r.suggestions.find((s) => s.type === "cheaper_recipe");
    expect(cr).toBeTruthy();
    expect(cr!.item_id).toBe("r1");
  });

  it("best_combo greedily applies highest-saving swaps (deterministic)", () => {
    const r = computeBudgetFix(base({
      items: [
        mk("a", "Chicken Breast", 12, 1),
        mk("b", "Fresh Spinach",   6, 1),
        mk("c", "Potato Chips",    5, 1, { category: "Snacks" }),
      ],
      weeklyBudget: 10,
    }));
    expect(r.combo_total_saved).toBeGreaterThan(0);
    expect(r.combo_new_total).toBeLessThan(r.current_total);
    // Greedy: each chosen suggestion targets a unique item, ordered desc by $ saved.
    const ids = r.best_combo.map((s) => s.item_id);
    expect(new Set(ids).size).toBe(ids.length);
    for (let i = 1; i < r.best_combo.length; i++) {
      expect(r.best_combo[i - 1].dollars_saved).toBeGreaterThanOrEqual(r.best_combo[i].dollars_saved);
    }
  });


  it("is deterministic across runs (same input → identical output)", () => {
    const inputs = base({
      items: [
        mk("z", "Ground Beef",  8, 1),
        mk("a", "Chicken Breast", 10, 1),
        mk("m", "Fresh Tomatoes", 4, 1),
      ],
      weeklyBudget: 5,
    });
    const r1 = computeBudgetFix(inputs);
    const r2 = computeBudgetFix(inputs);
    expect(JSON.stringify(r1)).toBe(JSON.stringify(r2));
  });
});
