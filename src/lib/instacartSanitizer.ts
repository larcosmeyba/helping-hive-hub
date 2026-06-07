// Grocery payload sanitizer — converts recipe ingredient strings into
// purchasable grocery-store product names before they reach Instacart.
//
// Root cause this fixes: Instacart's products_link endpoint was receiving
// recipe-portion strings ("1 tbsp olive oil", "2 cloves garlic") and matching
// them as N full retail units, inflating carts by 3–6×.
//
// Contract:
//   - Recipe display text is NOT mutated. The grocery list UI still shows
//     "1 tbsp olive oil" so cooks know how much the recipe needs.
//   - Only the Instacart payload `{ name, quantity, unit }` is normalized.
//   - Recipe-only units (tbsp, cup, clove, …) are stripped entirely. The
//     shopper buys ONE package of the product; recipe portions come out of it.
//   - Output is deduped across recipes by canonical product name so we don't
//     send "olive oil bottle" twice if 5 recipes use it.
//
// This file is pure (no React, no Supabase) so it's easy to unit test and
// reuse from any client surface.

export interface InstacartLineItemInput {
  /** Original ingredient name as parsed from the recipe / grocery list. */
  name: string;
  /** Raw recipe quantity string e.g. "1 tbsp", "2 cloves", "1/2 cup". */
  rawQuantity?: string;
}

export interface SanitizedInstacartLineItem {
  /** Clean grocery-store search term sent to Instacart. */
  name: string;
  /** Always 1 by default — shoppers buy one product unit unless overridden. */
  quantity: number;
  /** Always "each" — Instacart picks the package size. */
  unit: "each";
  /** Reference back to the source ingredient name (for debug + dedupe). */
  sourceName: string;
}

// Units that have no retail meaning at Instacart — strip and ignore.
const RECIPE_ONLY_UNITS = new Set([
  "tbsp", "tablespoon", "tablespoons", "tbsps", "tbs", "tb",
  "tsp", "teaspoon", "teaspoons", "tsps",
  "cup", "cups", "c",
  "clove", "cloves",
  "pinch", "pinches",
  "dash", "dashes",
  "slice", "slices",
  "sprig", "sprigs",
  "handful", "handfuls",
  "stick", "sticks",
  "leaf", "leaves",
  "head", "heads",
  "bunch", "bunches",
  "inch", "inches",
  "drop", "drops",
  "splash", "splashes",
  "ml", "milliliter", "milliliters",
  "g", "gram", "grams",
  // "oz" is intentionally NOT here — it's ambiguous and sometimes IS the
  // package size (e.g. "16 oz can"). We handle it contextually below.
]);

// Adjective / preparation words to drop when building the search term.
const ADJECTIVES_TO_STRIP = [
  "fresh", "freshly", "frozen", "thawed", "chopped", "diced", "minced",
  "sliced", "shredded", "grated", "crushed", "ground", "whole", "halved",
  "quartered", "peeled", "seeded", "cored", "trimmed", "rinsed", "drained",
  "cooked", "raw", "roasted", "toasted", "softened", "melted",
  "to taste", "for serving", "for garnish", "optional", "divided",
  "boneless", "skinless",
];

// Canonical purchasable-product map. Order matters: more specific keys first.
// Keys are matched against the cleaned ingredient name (lowercased, adjectives
// stripped). Value is the exact string sent to Instacart.
const PRODUCT_MAP: Array<[RegExp, string]> = [
  // Oils & fats
  [/\bolive oil\b/, "olive oil bottle"],
  [/\bavocado oil\b/, "avocado oil bottle"],
  [/\bcanola oil\b/, "canola oil bottle"],
  [/\bvegetable oil\b/, "vegetable oil bottle"],
  [/\bcoconut oil\b/, "coconut oil jar"],
  [/\bsesame oil\b/, "sesame oil bottle"],
  [/\b(unsalted |salted )?butter\b/, "butter sticks"],
  [/\bghee\b/, "ghee jar"],

  // Seasonings & spices
  [/\bsea salt\b/, "sea salt container"],
  [/\bkosher salt\b/, "kosher salt container"],
  [/\bsalt(?: and pepper)?\b/, "salt container"],
  [/\bblack pepper\b/, "black pepper grinder"],
  [/\bwhite pepper\b/, "white pepper jar"],
  [/\bpaprika\b/, "paprika spice jar"],
  [/\bsmoked paprika\b/, "smoked paprika spice jar"],
  [/\bcumin\b/, "cumin spice jar"],
  [/\bchili powder\b/, "chili powder spice jar"],
  [/\bcayenne\b/, "cayenne pepper spice jar"],
  [/\bgarlic powder\b/, "garlic powder spice jar"],
  [/\bonion powder\b/, "onion powder spice jar"],
  [/\bturmeric\b/, "turmeric spice jar"],
  [/\bginger powder\b/, "ginger powder spice jar"],
  [/\bcinnamon\b/, "cinnamon spice jar"],
  [/\bnutmeg\b/, "nutmeg spice jar"],
  [/\boregano\b/, "oregano spice jar"],
  [/\bbasil\b/, "basil spice jar"],
  [/\bthyme\b/, "thyme spice jar"],
  [/\brosemary\b/, "rosemary spice jar"],
  [/\bparsley\b/, "parsley bunch"],
  [/\bcilantro\b/, "cilantro bunch"],
  [/\bbay leaves?\b/, "bay leaves jar"],
  [/\bred pepper flakes\b/, "red pepper flakes jar"],
  [/\bdried herbs?\b/, "dried herbs jar"],

  // Aromatics & produce staples
  [/\bgarlic\b/, "garlic bulb"],
  [/\bginger\b/, "ginger root"],
  [/\bgreen onion(s)?\b|\bscallion(s)?\b/, "green onions bunch"],
  [/\bonion\b/, "onion"],
  [/\bshallot\b/, "shallots"],
  [/\blemon\b/, "lemons"],
  [/\blime\b/, "limes"],

  // Pantry / dry goods
  [/\bwhite rice\b/, "white rice bag"],
  [/\bbrown rice\b/, "brown rice bag"],
  [/\bjasmine rice\b/, "jasmine rice bag"],
  [/\bbasmati rice\b/, "basmati rice bag"],
  [/\brice\b/, "rice bag"],
  [/\bquinoa\b/, "quinoa bag"],
  [/\boats?\b|\brolled oats\b|\boatmeal\b/, "oats container"],
  [/\bpasta\b|\bspaghetti\b|\bpenne\b|\bfusilli\b|\brigatoni\b|\bmacaroni\b|\bnoodles?\b/, "pasta box"],
  [/\bflour\b/, "flour bag"],
  [/\bsugar\b/, "sugar bag"],
  [/\bbrown sugar\b/, "brown sugar bag"],
  [/\bbreadcrumbs?\b/, "breadcrumbs container"],
  [/\bpanko\b/, "panko breadcrumbs container"],
  [/\bbaking (powder|soda)\b/, "baking $1 container"],
  [/\bcornstarch\b/, "cornstarch container"],
  [/\bhoney\b/, "honey jar"],
  [/\bmaple syrup\b/, "maple syrup bottle"],
  [/\bsoy sauce\b/, "soy sauce bottle"],
  [/\btamari\b/, "tamari bottle"],
  [/\bvinegar\b/, "vinegar bottle"],
  [/\bbalsamic\b/, "balsamic vinegar bottle"],
  [/\bworcestershire\b/, "worcestershire sauce bottle"],
  [/\bhot sauce\b|\bsriracha\b/, "hot sauce bottle"],
  [/\bketchup\b/, "ketchup bottle"],
  [/\bmustard\b/, "mustard bottle"],
  [/\bmayonnaise\b|\bmayo\b/, "mayonnaise jar"],
  [/\btahini\b/, "tahini jar"],
  [/\bpeanut butter\b/, "peanut butter jar"],
  [/\balmond butter\b/, "almond butter jar"],
  [/\bjam\b|\bjelly\b|\bpreserves?\b/, "jam jar"],

  // Canned / jarred
  [/\bcoconut milk\b/, "coconut milk can"],
  [/\bchickpeas?\b|\bgarbanzo\b/, "chickpeas can"],
  [/\bblack beans?\b/, "black beans can"],
  [/\bkidney beans?\b/, "kidney beans can"],
  [/\bpinto beans?\b/, "pinto beans can"],
  [/\bcannellini\b|\bwhite beans?\b/, "white beans can"],
  [/\bdiced tomatoes?\b/, "diced tomatoes can"],
  [/\bcrushed tomatoes?\b/, "crushed tomatoes can"],
  [/\btomato sauce\b/, "tomato sauce can"],
  [/\btomato paste\b/, "tomato paste can"],
  [/\btuna\b/, "tuna can"],
  [/\bchicken broth\b|\bchicken stock\b/, "chicken broth carton"],
  [/\bvegetable broth\b|\bvegetable stock\b/, "vegetable broth carton"],
  [/\bbeef broth\b|\bbeef stock\b/, "beef broth carton"],

  // Dairy
  [/\bshredded (cheddar|mozzarella|parmesan|monterey jack|pepper jack)\b/, "shredded $1 cheese bag"],
  [/\bshredded cheese\b/, "shredded cheese bag"],
  [/\bparmesan\b/, "parmesan cheese"],
  [/\bmozzarella\b/, "mozzarella cheese"],
  [/\bcheddar\b/, "cheddar cheese"],
  [/\bfeta\b/, "feta cheese"],
  [/\bcream cheese\b/, "cream cheese"],
  [/\bsour cream\b/, "sour cream"],
  [/\bgreek yogurt\b/, "greek yogurt"],
  [/\byogurt\b/, "yogurt"],
  [/\bheavy cream\b/, "heavy cream"],
  [/\bhalf and half\b|\bhalf-and-half\b/, "half and half"],
  [/\b(whole |skim |2% |1% )?milk\b/, "milk gallon"],
  [/\bbuttermilk\b/, "buttermilk"],
  [/\beggs?\b/, "eggs dozen"],

  // Proteins
  [/\bchicken breasts?\b|\bboneless chicken breasts?\b/, "chicken breast"],
  [/\bchicken thighs?\b/, "chicken thighs"],
  [/\bground (beef|turkey|chicken|pork)\b/, "ground $1"],
  [/\bbeef\b/, "beef"],
  [/\bsalmon (fillets?|filets?)?\b/, "salmon fillets"],
  [/\bshrimp\b/, "shrimp"],
  [/\btofu\b/, "tofu"],
  [/\bbacon\b/, "bacon"],
  [/\bsausage\b/, "sausage"],

  // Bread
  [/\bbread\b/, "bread loaf"],
  [/\btortillas?\b/, "tortillas"],
  [/\bbuns?\b/, "buns"],
];

const FRACTION_CHARS: Record<string, string> = {
  "½": "1/2", "⅓": "1/3", "⅔": "2/3", "¼": "1/4", "¾": "3/4",
  "⅕": "1/5", "⅖": "2/5", "⅗": "3/5", "⅘": "4/5",
  "⅙": "1/6", "⅚": "5/6", "⅛": "1/8", "⅜": "3/8", "⅝": "5/8", "⅞": "7/8",
};

/**
 * Strip leading quantity, recipe-only units, parentheticals, and prep
 * adjectives from an ingredient name. Returns the cleaned core ingredient
 * suitable for matching against PRODUCT_MAP.
 */
export function cleanIngredientName(raw: string): string {
  let s = (raw || "").toLowerCase().trim();

  // Replace fraction glyphs with ASCII fractions
  for (const [glyph, asc] of Object.entries(FRACTION_CHARS)) {
    s = s.split(glyph).join(asc);
  }

  // Remove parentheticals e.g. "(150g)", "(about 2 cups)"
  s = s.replace(/\([^)]*\)/g, " ");

  // Strip leading quantity + optional unit
  // matches: "1 ", "1.5 ", "1/2 ", "1 1/2 ", "1-2 "
  s = s.replace(/^\s*\d+(?:[./]\d+)?(?:\s*-\s*\d+(?:[./]\d+)?)?(?:\s+\d+\/\d+)?\s*/, "");

  // Drop a leading recipe unit word if present
  const firstWord = s.split(/\s+/)[0]?.replace(/[.,]/g, "");
  if (firstWord && RECIPE_ONLY_UNITS.has(firstWord)) {
    s = s.slice(firstWord.length).trim();
    // and drop a possible "of"
    s = s.replace(/^of\s+/, "");
  }

  // Drop adjectives anywhere (word-bounded)
  for (const adj of ADJECTIVES_TO_STRIP) {
    s = s.replace(new RegExp(`\\b${adj}\\b`, "g"), " ");
  }

  // Strip trailing notes after commas / semicolons (e.g. "onion, diced & chopped")
  s = s.split(/[,;:]/)[0];

  // Collapse whitespace
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

/**
 * Map a cleaned ingredient string to a purchasable product name.
 * Falls back to the cleaned name itself when no rule matches.
 */
export function toPurchasableProduct(cleanedName: string): string {
  if (!cleanedName) return "";
  for (const [pattern, product] of PRODUCT_MAP) {
    const m = cleanedName.match(pattern);
    if (m) {
      // Support $1 backreferences in the replacement
      return product.replace(/\$(\d)/g, (_, idx) => m[Number(idx)] ?? "");
    }
  }
  return cleanedName;
}

/**
 * Decide whether the original recipe quantity should pass through as the
 * Instacart quantity. Only safe when the unit is a retail package size.
 */
const RETAIL_PASSTHROUGH_UNITS = new Set([
  "lb", "lbs", "pound", "pounds",
  "gallon", "gallons",
  "quart", "quarts",
  "pint", "pints",
  "dozen",
  "package", "packages", "pkg",
  "can", "cans",
  "bottle", "bottles",
  "bag", "bags",
  "jar", "jars",
  "box", "boxes",
  "loaf", "loaves",
  "carton", "cartons",
]);

function parseRetailQuantity(rawQty?: string): number {
  if (!rawQty) return 1;
  const lower = rawQty.toLowerCase();
  const unitMatch = lower.match(/[a-z]+/);
  if (!unitMatch) return 1;
  const unit = unitMatch[0];
  if (!RETAIL_PASSTHROUGH_UNITS.has(unit)) return 1;
  const numMatch = lower.match(/\d+(?:\.\d+)?/);
  return numMatch ? Math.max(1, Math.round(Number(numMatch[0]))) : 1;
}

/**
 * Main entry point. Takes the raw grocery list items (with their recipe-portion
 * quantity strings) and returns the deduplicated Instacart payload.
 */
export function sanitizeForInstacart(
  items: InstacartLineItemInput[],
): SanitizedInstacartLineItem[] {
  const merged = new Map<string, SanitizedInstacartLineItem>();

  for (const item of items) {
    if (!item?.name) continue;
    const cleaned = cleanIngredientName(item.name);
    const product = toPurchasableProduct(cleaned);
    if (!product) continue;
    const qty = parseRetailQuantity(item.rawQuantity);

    const key = product.toLowerCase();
    const existing = merged.get(key);
    if (existing) {
      // Same product appears in multiple recipes — keep quantity = max
      // (we still only need ONE package per shopping trip in most cases).
      existing.quantity = Math.max(existing.quantity, qty);
    } else {
      merged.set(key, {
        name: product,
        quantity: qty,
        unit: "each",
        sourceName: item.name,
      });
    }
  }

  return Array.from(merged.values());
}

// ---------------------------------------------------------------------------
// Display-side helpers — used by the grocery list & review UI so users see
// the SAME purchasable products that get sent to Instacart, not raw recipe
// strings like "garlic clove, crushed" or "salmon marinade:".
// ---------------------------------------------------------------------------

// Words that mark a line as a recipe sub-section header or prep instruction
// rather than a real grocery item. If a line is dominated by these and does
// NOT map cleanly to a purchasable product, it gets dropped from the UI.
const RECIPE_HEADER_WORDS = [
  "marinade", "dressing", "topping", "garnish", "glaze", "rub",
  "for serving", "for garnish", "for the", "to taste", "optional",
];

// Whitelist of "sauce"-style products that are real grocery items even
// though they could look like recipe sub-sections.
const SAUCE_PRODUCT_WHITELIST = [
  "hot sauce", "soy sauce", "tomato sauce", "fish sauce", "bbq sauce",
  "pasta sauce", "tartar sauce", "worcestershire", "tamari",
];

/**
 * Returns false for lines that are clearly recipe headers, sub-recipe labels,
 * or pure preparation instructions and should NEVER appear as a grocery item.
 */
export function isValidGroceryLine(rawName: string): boolean {
  if (!rawName) return false;
  const trimmed = rawName.trim();
  if (!trimmed) return false;
  // Recipe section headers always end with a colon ("salmon marinade:")
  if (trimmed.endsWith(":")) return false;
  const lower = trimmed.toLowerCase();

  // Real sauce products bypass the header word check
  if (SAUCE_PRODUCT_WHITELIST.some((w) => lower.includes(w))) return true;

  // Lines that mention prep-section header words and don't map to a product
  if (RECIPE_HEADER_WORDS.some((w) => lower.includes(w))) {
    const product = toPurchasableProduct(cleanIngredientName(trimmed));
    if (!product || product === cleanIngredientName(trimmed)) {
      // Couldn't normalize to a purchasable product — treat as instruction.
      return false;
    }
  }
  return true;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

const DISPLAY_UNIT_HINTS = [
  "bottle", "jar", "bag", "can", "carton", "container", "loaf", "dozen",
  "bunch", "bulb", "stick", "sticks", "grinder", "gallon", "box",
];

/**
 * Convert a raw recipe ingredient into the display pair `{ displayName,
 * displayQuantity }` that should appear on the grocery list. Returns null
 * when the line should be filtered out entirely (e.g. recipe headers).
 *
 * Output mirrors what `sanitizeForInstacart` sends to Instacart so the two
 * stay in sync — user sees exactly what gets shopped for.
 */
export function toDisplayProduct(item: InstacartLineItemInput): {
  displayName: string;
  displayQuantity: string;
} | null {
  if (!isValidGroceryLine(item.name)) return null;
  const cleaned = cleanIngredientName(item.name);
  if (!cleaned) return null;
  const product = toPurchasableProduct(cleaned);
  if (!product || product.length < 2) return null;

  const qty = parseRetailQuantity(item.rawQuantity);
  const lowerProduct = product.toLowerCase();
  const unitHint = DISPLAY_UNIT_HINTS.find((u) =>
    new RegExp(`\\b${u}\\b`).test(lowerProduct),
  );
  const displayUnit = unitHint ?? "each";

  return {
    displayName: titleCase(product),
    displayQuantity: `${qty} ${displayUnit}`,
  };
}

/**
 * Diagnostic helper used by the debug screen. Returns the full
 * raw → cleaned → product → payload pipeline for a single ingredient.
 */
export function diagnoseSanitization(
  item: InstacartLineItemInput,
): {
  raw: string;
  rawQuantity: string;
  cleaned: string;
  product: string;
  payload: { name: string; quantity: number; unit: "each" };
  unitStripped: boolean;
} {
  const cleaned = cleanIngredientName(item.name);
  const product = toPurchasableProduct(cleaned);
  const qty = parseRetailQuantity(item.rawQuantity);
  const lowerRaw = (item.rawQuantity || "").toLowerCase();
  const unitWord = lowerRaw.match(/[a-z]+/)?.[0] ?? "";
  return {
    raw: item.name,
    rawQuantity: item.rawQuantity || "",
    cleaned,
    product,
    payload: { name: product, quantity: qty, unit: "each" },
    unitStripped: RECIPE_ONLY_UNITS.has(unitWord),
  };
}
