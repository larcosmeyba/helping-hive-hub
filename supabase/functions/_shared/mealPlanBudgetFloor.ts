export interface MealPlanBudgetFloorMeal {
  meal_type?: string | null;
  recipe?: {
    cost_per_serving?: number | string | null;
    ingredients?: unknown[] | null;
  } | null;
}

export interface MealPlanBudgetFloorOptions {
  servingsMultiplier: number;
  ownedNormalized: Set<string>;
  stapleKeywords: string[];
  snackSlotKeys: string[];
  fallbackPerServing?: number;
  snackFloorPerServing?: number;
}

const DEFAULT_FALLBACK_PER_SERVING = 3.5;
const DEFAULT_SNACK_FLOOR_PER_SERVING = 0.75;

function normalizeIngredientName(name: string): string {
  return (name || "")
    .toLowerCase()
    .replace(/\d+(\.\d+)?/g, "")
    .replace(/\b(cup|cups|tbsp|tsp|oz|lb|lbs|g|kg|ml|l|can|cans|cloves?|inch|inches|pkg|package|small|medium|large|fresh|frozen|chopped|diced|minced|sliced|grated|drained|cooked|raw)\b/g, "")
    .replace(/[(),./]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseIngredient(raw: string): string {
  const display = raw.trim();
  const qtyMatch = display.match(/^([\d/.\s]+\s*(?:cup|cups|tbsp|tsp|oz|lb|lbs|g|kg|ml|l|can|cans|cloves?|inch|inches|pkg|package)?)\s+(.*)$/i);
  const item = qtyMatch ? qtyMatch[2].trim() : display;
  return normalizeIngredientName(item);
}

function ownedHas(normalizedIngredient: string, ownedNormalized: Set<string>): boolean {
  if (!normalizedIngredient) return false;
  for (const owned of ownedNormalized) {
    if (!owned) continue;
    if (normalizedIngredient.includes(owned) || owned.includes(normalizedIngredient)) return true;
  }
  return false;
}

export function computeOwnedAdjustedMealFloor(
  meal: MealPlanBudgetFloorMeal,
  options: MealPlanBudgetFloorOptions,
): number {
  const fallbackPerServing = options.fallbackPerServing ?? DEFAULT_FALLBACK_PER_SERVING;
  const snackFloorPerServing = options.snackFloorPerServing ?? DEFAULT_SNACK_FLOOR_PER_SERVING;
  const cps = Number(meal?.recipe?.cost_per_serving);
  const base = (Number.isFinite(cps) && cps > 0 ? cps : fallbackPerServing) * options.servingsMultiplier;
  const ingredients = Array.isArray(meal?.recipe?.ingredients)
    ? meal.recipe.ingredients.filter((raw): raw is string => typeof raw === "string")
    : [];

  let adjusted = base;
  if (ingredients.length) {
    let unowned = 0;
    for (const raw of ingredients) {
      const normalized = parseIngredient(raw);
      if (!normalized) continue;
      const isStaple = options.stapleKeywords.some((s) => normalized.includes(s));
      if (!isStaple && !ownedHas(normalized, options.ownedNormalized)) unowned++;
    }
    adjusted = base * (unowned / ingredients.length);
  }

  if (options.snackSlotKeys.includes(String(meal?.meal_type ?? ""))) {
    return Math.min(adjusted, snackFloorPerServing * options.servingsMultiplier);
  }
  return adjusted;
}
