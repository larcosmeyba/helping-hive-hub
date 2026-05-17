// Parse free-form ingredient strings like "1/2 cup whole milk" or "2 large eggs"
// into Instacart recipe-endpoint shape { name, display_text, measurements }.
//
// Designed to be forgiving: if quantity/unit can't be parsed, we still return
// a usable ingredient with measurements omitted so Instacart can resolve it.

export interface ParsedIngredient {
  name: string;
  display_text: string;
  measurements?: Array<{ quantity: number; unit: string }>;
}

const UNIT_WORDS = new Set([
  "cup", "cups",
  "tbsp", "tablespoon", "tablespoons",
  "tsp", "teaspoon", "teaspoons",
  "oz", "ounce", "ounces",
  "lb", "lbs", "pound", "pounds",
  "g", "gram", "grams",
  "kg", "kilogram", "kilograms",
  "ml", "milliliter", "milliliters",
  "l", "liter", "liters",
  "clove", "cloves",
  "slice", "slices",
  "can", "cans",
  "package", "packages", "pkg",
  "bottle", "bottles",
  "bunch", "bunches",
  "head", "heads",
  "stick", "sticks",
  "pinch", "pinches",
  "dash", "dashes",
  "large", "medium", "small",
  "piece", "pieces",
]);

function parseQuantity(raw: string): number | null {
  const s = raw.trim();
  if (!s) return null;
  // Mixed fraction e.g. "1 1/2"
  const mixed = s.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) {
    const whole = Number(mixed[1]);
    const num = Number(mixed[2]);
    const den = Number(mixed[3]);
    if (den) return whole + num / den;
  }
  // Plain fraction "1/2"
  const frac = s.match(/^(\d+)\/(\d+)$/);
  if (frac) {
    const num = Number(frac[1]);
    const den = Number(frac[2]);
    if (den) return num / den;
  }
  // Range e.g. "1-2" → use first number
  const range = s.match(/^(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)$/);
  if (range) return Number(range[1]);
  const num = Number(s);
  return Number.isFinite(num) ? num : null;
}

export function parseIngredient(raw: string): ParsedIngredient {
  const display = raw.trim().replace(/\s+/g, " ");
  if (!display) return { name: "", display_text: "" };

  // Match leading quantity (mixed fraction, fraction, or decimal/int)
  const qtyMatch = display.match(
    /^((?:\d+\s+\d+\/\d+)|(?:\d+\/\d+)|(?:\d+(?:\.\d+)?(?:\s*-\s*\d+(?:\.\d+)?)?))\s+(.+)$/,
  );

  if (!qtyMatch) {
    return { name: display.toLowerCase(), display_text: display };
  }

  const qty = parseQuantity(qtyMatch[1]);
  const rest = qtyMatch[2];

  // Try to extract unit (first word if it's a known unit word)
  const [maybeUnit, ...restWords] = rest.split(/\s+/);
  const unitKey = maybeUnit.toLowerCase().replace(/[.,]$/, "");

  if (UNIT_WORDS.has(unitKey) && restWords.length) {
    const name = restWords.join(" ");
    return {
      name: name.toLowerCase(),
      display_text: display,
      measurements:
        qty != null ? [{ quantity: qty, unit: unitKey }] : undefined,
    };
  }

  // No recognized unit — treat the whole tail as the name, qty as "each".
  return {
    name: rest.toLowerCase(),
    display_text: display,
    measurements: qty != null ? [{ quantity: qty, unit: "each" }] : undefined,
  };
}

export function parseIngredients(raw: string[]): ParsedIngredient[] {
  return raw
    .map((r) => parseIngredient(r))
    .filter((i) => i.name.length > 0);
}
