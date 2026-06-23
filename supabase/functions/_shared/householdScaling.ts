// Household serving-size scaling by age cohort.
// Pure / deterministic — no I/O. Safe to import from Deno edge functions
// AND from Vitest (Node) tests via a relative path.
//
// Replaces the crude `ceil(householdSize / 2)` heuristic in
// generate-meal-plan with a weighted cohort model:
//   adults        : 1.0
//   teenagers     : 1.0
//   seniors 65+   : 0.9
//   kids 5–12     : 0.6–0.75 (by age, default 0.7)
//   under 5       : 0.0 (toddlers/babies excluded — never auto-served)
//
// Ingredients stay as plain strings. `scaleIngredientQuantity` parses the
// leading "<qty> <unit>" the same way generate-meal-plan does, multiplies,
// rounds sensibly, and re-emits the string. Staples (salt/pepper/water/oil)
// are returned unchanged.

export interface HouseholdProfile {
  household_size?: number | null;
  children_under_5?: number | null;
  children_5_to_12?: number | null;
  children_ages?: number[] | null;
  teenagers?: number | null;
  seniors_65_plus?: number | null;
}

const KID_5_12_DEFAULT_WEIGHT = 0.7;
const SENIOR_WEIGHT = 0.9;

function kidWeightForAge(age: number): number {
  if (age >= 5 && age <= 7) return 0.6;
  if (age >= 8 && age <= 10) return 0.7;
  if (age >= 11 && age <= 12) return 0.75;
  return KID_5_12_DEFAULT_WEIGHT;
}

/**
 * Sum cohort weights to get the effective "servings" the plan should cook.
 * Always >= 1.0. Deterministic — same input, same output.
 */
export function computeHouseholdServings(profile: HouseholdProfile): number {
  const household = Math.max(0, Number(profile.household_size ?? 0) | 0);
  const under5 = Math.max(0, Number(profile.children_under_5 ?? 0) | 0);
  const kids = Math.max(0, Number(profile.children_5_to_12 ?? 0) | 0);
  const teens = Math.max(0, Number(profile.teenagers ?? 0) | 0);
  const seniors = Math.max(0, Number(profile.seniors_65_plus ?? 0) | 0);

  // Adults are whatever is left after the explicit cohorts. Floor at >=1
  // so a misconfigured profile (e.g. only kids listed) still cooks for 1.
  const adults = Math.max(1, household - under5 - kids - teens - seniors);

  let servings = adults * 1.0 + teens * 1.0 + seniors * SENIOR_WEIGHT;

  // Per-age weights when children_ages is provided, otherwise default each.
  const ages = Array.isArray(profile.children_ages) ? profile.children_ages : [];
  const kidsInRange = ages.filter((a) => Number.isFinite(a) && a >= 5 && a <= 12);
  if (kidsInRange.length >= kids && kids > 0) {
    // Use the first `kids` ages so an over-supplied list doesn't inflate.
    for (let i = 0; i < kids; i++) servings += kidWeightForAge(Number(kidsInRange[i]));
  } else {
    // Mix: weight the ones we know about, default the rest.
    for (let i = 0; i < Math.min(kids, kidsInRange.length); i++) {
      servings += kidWeightForAge(Number(kidsInRange[i]));
    }
    const remaining = kids - Math.min(kids, kidsInRange.length);
    servings += remaining * KID_5_12_DEFAULT_WEIGHT;
  }

  // Under-5s contribute zero — they are not auto-given a full serving.
  return Math.max(1, Math.round(servings * 100) / 100);
}

// Same regex shape generate-meal-plan/parseIngredientString uses.
const QTY_REGEX =
  /^([\d/.\s]+)\s*((?:cup|cups|tbsp|tsp|oz|lb|lbs|g|kg|ml|l|can|cans|cloves?|inch|inches|pkg|package)?)\s+(.*)$/i;

const STAPLE_KEYWORDS = ["salt", "pepper", "olive oil", "water", "oil"];
// Volume units where fractional amounts make sense in cooking. Weight
// units (oz/lb/g/kg) round UP to the next whole unit since that maps
// cleanly to package sizes the user actually buys.
const FRACTIONAL_UNITS = new Set(["cup", "cups", "tbsp", "tsp", "ml", "l"]);

function parseLeadingNumber(s: string): number | null {
  const trimmed = s.trim();
  if (!trimmed) return null;
  // Support simple fractions like "1/2" and mixed numbers "1 1/2".
  const mixed = trimmed.match(/^(\d+)\s+(\d+)\/(\d+)$/);
  if (mixed) return Number(mixed[1]) + Number(mixed[2]) / Number(mixed[3]);
  const frac = trimmed.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

/**
 * Multiply the numeric quantity in an ingredient string by `factor`.
 * - Fractional units (cup, tbsp, oz, lb, g…) keep 1 decimal.
 * - Whole-count items (eggs, onions, "2 chicken breasts") round UP.
 * - Staples and strings without a parseable leading number are returned as-is.
 */
export function scaleIngredientQuantity(ingredient: string, factor: number): string {
  if (typeof ingredient !== "string") return ingredient;
  const raw = ingredient.trim();
  if (!raw) return ingredient;
  if (!Number.isFinite(factor) || factor <= 0) return ingredient;

  const lower = raw.toLowerCase();
  if (STAPLE_KEYWORDS.some((s) => lower.includes(s))) return ingredient;

  const m = raw.match(QTY_REGEX);
  if (!m) return ingredient;

  const qtyStr = m[1];
  const unit = (m[2] || "").trim();
  const rest = m[3] || "";

  const num = parseLeadingNumber(qtyStr);
  if (num === null) return ingredient;

  const scaled = num * factor;
  let out: string;
  if (unit && FRACTIONAL_UNITS.has(unit.toLowerCase())) {
    const rounded = Math.round(scaled * 10) / 10;
    out = `${rounded} ${unit} ${rest}`.replace(/\s+/g, " ").trim();
  } else {
    // Whole-count (eggs, breasts, cloves implicit, etc.) — round up so we
    // actually have enough for the household.
    const rounded = Math.max(1, Math.ceil(scaled));
    out = unit
      ? `${rounded} ${unit} ${rest}`.replace(/\s+/g, " ").trim()
      : `${rounded} ${rest}`.replace(/\s+/g, " ").trim();
  }
  return out;
}
