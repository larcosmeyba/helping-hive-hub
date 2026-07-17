import { describe, expect, it } from "vitest";
import {
  STARTER_PANTRY_ITEMS,
  buildStarterPantryRows,
  runStarterPantrySeed,
  starterPantrySeedEnabled,
} from "../../supabase/functions/_shared/starterPantrySeed";

describe("starterPantrySeed", () => {
  it("is disabled unless env value is exactly true", () => {
    expect(starterPantrySeedEnabled(undefined)).toBe(false);
    expect(starterPantrySeedEnabled("false")).toBe(false);
    expect(starterPantrySeedEnabled("true")).toBe(true);
    expect(starterPantrySeedEnabled(" TRUE ")).toBe(true);
  });

  it("returns disabled without loading or inserting rows", async () => {
    let loaded = false;
    let inserted = false;
    const result = await runStarterPantrySeed({
      enabled: false,
      userId: "user-1",
      loadExisting: async () => {
        loaded = true;
        return [];
      },
      insertRows: async () => {
        inserted = true;
        return 0;
      },
    });

    expect(result.status).toBe(200);
    expect(result.body).toEqual({ ok: false, added: 0, skipped: 0, disabled: true });
    expect(loaded).toBe(false);
    expect(inserted).toBe(false);
  });

  it("requires an authenticated user when enabled", async () => {
    const result = await runStarterPantrySeed({
      enabled: true,
      userId: null,
      loadExisting: async () => [],
      insertRows: async () => 0,
    });

    expect(result.status).toBe(401);
    expect(result.body.ok).toBe(false);
    expect(result.body.error).toBe("Unauthorized");
  });

  it("builds valid pantry, fridge, and freezer rows", () => {
    const now = new Date("2026-07-17T12:00:00.000Z");
    const { rows, skipped, total } = buildStarterPantryRows("user-1", [], now);

    expect(total).toBe(STARTER_PANTRY_ITEMS.length);
    expect(skipped).toBe(0);
    expect(rows).toHaveLength(STARTER_PANTRY_ITEMS.length);
    expect(new Set(rows.map((r) => r.location))).toEqual(new Set(["pantry", "fridge", "freezer"]));
    expect(rows[0]).toMatchObject({
      user_id: "user-1",
      item_name: "White rice",
      normalized_item_name: "white rice",
      category: "grains",
      location: "pantry",
      purchase_date: "2026-07-17",
      is_low_stock: false,
      freshness_status: "good",
      manually_added: false,
      photo_detected: false,
      receipt_detected: false,
    });
  });

  it("skips existing normalized item names and inserts only missing rows", async () => {
    const existing = [
      { item_name: "Rice", normalized_item_name: "white rice" },
      { item_name: "milk", normalized_item_name: null },
    ];
    const { rows, skipped } = buildStarterPantryRows("user-1", existing, new Date("2026-07-17T12:00:00.000Z"));
    expect(rows.some((r) => r.normalized_item_name === "white rice")).toBe(false);
    expect(rows.some((r) => r.normalized_item_name === "milk")).toBe(false);
    expect(skipped).toBe(2);

    let insertedCount = 0;
    const result = await runStarterPantrySeed({
      enabled: true,
      userId: "user-1",
      loadExisting: async () => existing,
      insertRows: async (insertedRows) => {
        insertedCount = insertedRows.length;
        return insertedRows.length;
      },
      now: new Date("2026-07-17T12:00:00.000Z"),
    });

    expect(result.status).toBe(200);
    expect(result.body.added).toBe(insertedCount);
    expect(result.body.skipped).toBe(2);
    expect(result.body.disabled).toBe(false);
  });
});
