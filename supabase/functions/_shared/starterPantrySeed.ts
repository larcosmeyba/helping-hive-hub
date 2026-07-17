import { calcFreshness, normalize } from "./pantry.ts";

export type StarterPantryLocation = "pantry" | "fridge" | "freezer";

export interface StarterPantryItem {
  item_name: string;
  quantity: string;
  unit: string | null;
  category: string;
  location: StarterPantryLocation;
  shelf_life_days: number | null;
}

export interface ExistingPantryItem {
  item_name?: string | null;
  normalized_item_name?: string | null;
}

export interface StarterPantryRow {
  user_id: string;
  item_name: string;
  normalized_item_name: string;
  quantity: string;
  unit: string | null;
  category: string;
  location: StarterPantryLocation;
  purchase_date: string;
  expiration_date: string | null;
  is_low_stock: boolean;
  freshness_status: ReturnType<typeof calcFreshness>;
  manually_added: boolean;
  photo_detected: boolean;
  receipt_detected: boolean;
}

export interface StarterPantrySeedResult {
  status: number;
  body: {
    ok: boolean;
    added: number;
    skipped: number;
    disabled: boolean;
    error?: string;
  };
}

export interface RunStarterPantrySeedDeps {
  enabled: boolean;
  userId: string | null;
  loadExisting: (userId: string) => Promise<ExistingPantryItem[]>;
  insertRows: (rows: StarterPantryRow[]) => Promise<number>;
  now?: Date;
}

export const STARTER_PANTRY_ITEMS: StarterPantryItem[] = [
  { item_name: "White rice", quantity: "5", unit: "lb", category: "grains", location: "pantry", shelf_life_days: 365 },
  { item_name: "Pasta", quantity: "2", unit: "boxes", category: "grains", location: "pantry", shelf_life_days: 365 },
  { item_name: "Rolled oats", quantity: "1", unit: "container", category: "grains", location: "pantry", shelf_life_days: 180 },
  { item_name: "All-purpose flour", quantity: "5", unit: "lb", category: "pantry_staples", location: "pantry", shelf_life_days: 180 },
  { item_name: "Sugar", quantity: "4", unit: "lb", category: "pantry_staples", location: "pantry", shelf_life_days: 365 },
  { item_name: "Peanut butter", quantity: "1", unit: "jar", category: "pantry_staples", location: "pantry", shelf_life_days: 180 },
  { item_name: "Olive oil", quantity: "1", unit: "bottle", category: "pantry_staples", location: "pantry", shelf_life_days: 365 },
  { item_name: "Salt", quantity: "1", unit: "container", category: "pantry_staples", location: "pantry", shelf_life_days: 730 },
  { item_name: "Black pepper", quantity: "1", unit: "container", category: "pantry_staples", location: "pantry", shelf_life_days: 730 },
  { item_name: "Garlic powder", quantity: "1", unit: "container", category: "pantry_staples", location: "pantry", shelf_life_days: 730 },
  { item_name: "Onion powder", quantity: "1", unit: "container", category: "pantry_staples", location: "pantry", shelf_life_days: 730 },
  { item_name: "Canned black beans", quantity: "4", unit: "cans", category: "pantry_staples", location: "pantry", shelf_life_days: 730 },
  { item_name: "Canned tomatoes", quantity: "2", unit: "cans", category: "pantry_staples", location: "pantry", shelf_life_days: 730 },
  { item_name: "Chicken broth", quantity: "2", unit: "cartons", category: "pantry_staples", location: "pantry", shelf_life_days: 365 },
  { item_name: "Tortillas", quantity: "1", unit: "pack", category: "grains", location: "pantry", shelf_life_days: 21 },
  { item_name: "Canned tuna", quantity: "4", unit: "cans", category: "protein", location: "pantry", shelf_life_days: 730 },
  { item_name: "Eggs", quantity: "1", unit: "dozen", category: "dairy", location: "fridge", shelf_life_days: 28 },
  { item_name: "Milk", quantity: "1", unit: "gallon", category: "dairy", location: "fridge", shelf_life_days: 10 },
  { item_name: "Plain Greek yogurt", quantity: "1", unit: "tub", category: "dairy", location: "fridge", shelf_life_days: 14 },
  { item_name: "Cheddar cheese", quantity: "1", unit: "block", category: "dairy", location: "fridge", shelf_life_days: 30 },
  { item_name: "Butter", quantity: "1", unit: "box", category: "dairy", location: "fridge", shelf_life_days: 60 },
  { item_name: "Carrots", quantity: "1", unit: "bag", category: "produce", location: "fridge", shelf_life_days: 21 },
  { item_name: "Apples", quantity: "1", unit: "bag", category: "produce", location: "fridge", shelf_life_days: 21 },
  { item_name: "Spinach", quantity: "1", unit: "bag", category: "produce", location: "fridge", shelf_life_days: 5 },
  { item_name: "Frozen mixed vegetables", quantity: "2", unit: "bags", category: "frozen", location: "freezer", shelf_life_days: 180 },
  { item_name: "Frozen berries", quantity: "1", unit: "bag", category: "frozen", location: "freezer", shelf_life_days: 180 },
  { item_name: "Frozen chicken thighs", quantity: "3", unit: "lb", category: "protein", location: "freezer", shelf_life_days: 180 },
];

export function starterPantrySeedEnabled(value: string | null | undefined): boolean {
  return String(value ?? "").trim().toLowerCase() === "true";
}

export function isoDateDaysFrom(baseDate: Date, days: number): string {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function existingStarterNames(items: ExistingPantryItem[]): Set<string> {
  return new Set(
    items
      .map((item) => item.normalized_item_name || normalize(item.item_name ?? ""))
      .map((name) => normalize(name))
      .filter(Boolean),
  );
}

export function buildStarterPantryRows(
  userId: string,
  existingItems: ExistingPantryItem[],
  now = new Date(),
): { rows: StarterPantryRow[]; skipped: number; total: number } {
  const existing = existingStarterNames(existingItems);
  const purchaseDate = now.toISOString().slice(0, 10);
  const rows: StarterPantryRow[] = [];

  for (const item of STARTER_PANTRY_ITEMS) {
    const normalized = normalize(item.item_name);
    if (!normalized || existing.has(normalized)) continue;
    existing.add(normalized);
    const expirationDate = item.shelf_life_days == null
      ? null
      : isoDateDaysFrom(now, item.shelf_life_days);
    rows.push({
      user_id: userId,
      item_name: item.item_name,
      normalized_item_name: normalized,
      quantity: item.quantity,
      unit: item.unit,
      category: item.category,
      location: item.location,
      purchase_date: purchaseDate,
      expiration_date: expirationDate,
      is_low_stock: false,
      freshness_status: calcFreshness(expirationDate, false),
      manually_added: false,
      photo_detected: false,
      receipt_detected: false,
    });
  }

  return {
    rows,
    skipped: STARTER_PANTRY_ITEMS.length - rows.length,
    total: STARTER_PANTRY_ITEMS.length,
  };
}

export async function runStarterPantrySeed(
  deps: RunStarterPantrySeedDeps,
): Promise<StarterPantrySeedResult> {
  if (!deps.enabled) {
    return { status: 200, body: { ok: false, added: 0, skipped: 0, disabled: true } };
  }
  if (!deps.userId) {
    return { status: 401, body: { ok: false, added: 0, skipped: 0, disabled: false, error: "Unauthorized" } };
  }

  const existing = await deps.loadExisting(deps.userId);
  const { rows, skipped } = buildStarterPantryRows(deps.userId, existing, deps.now);
  if (!rows.length) {
    return { status: 200, body: { ok: true, added: 0, skipped, disabled: false } };
  }

  const added = await deps.insertRows(rows);
  return { status: 200, body: { ok: true, added, skipped, disabled: false } };
}
