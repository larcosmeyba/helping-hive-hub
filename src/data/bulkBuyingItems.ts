export interface BulkBuyingItem {
  slug: string;
  name: string;
  emoji: string;
  shelfLife: string;
  why: string;
  instacartName: string;
  instacartQty: number;
  instacartUnit: string;
}

export const BULK_BUYING_ITEMS: BulkBuyingItem[] = [
  { slug: "rice", name: "Rice", emoji: "🍚", shelfLife: "2+ years", why: "Versatile base for dozens of meals. Ultra-low cost per serving.", instacartName: "Long grain white rice", instacartQty: 5, instacartUnit: "lb" },
  { slug: "beans", name: "Dried Beans", emoji: "🫘", shelfLife: "2+ years", why: "Affordable plant protein. Stretch any meal.", instacartName: "Dried black beans", instacartQty: 2, instacartUnit: "lb" },
  { slug: "oats", name: "Oats", emoji: "🥣", shelfLife: "Up to 2 years", why: "Fills the family for breakfast at pennies per bowl.", instacartName: "Old fashioned rolled oats", instacartQty: 42, instacartUnit: "oz" },
  { slug: "pasta", name: "Pasta", emoji: "🍝", shelfLife: "2+ years", why: "Quick, filling and easy to cook with anything.", instacartName: "Spaghetti pasta", instacartQty: 3, instacartUnit: "lb" },
  { slug: "peanut-butter", name: "Peanut Butter", emoji: "🥜", shelfLife: "1–2 years", why: "High in protein. Great for kids and quick lunches.", instacartName: "Creamy peanut butter", instacartQty: 40, instacartUnit: "oz" },
  { slug: "canned-goods", name: "Canned Goods", emoji: "🥫", shelfLife: "2–5 years", why: "Tomatoes, corn, and beans for stretching any meal.", instacartName: "Diced tomatoes can", instacartQty: 6, instacartUnit: "ct" },
  { slug: "lentils", name: "Lentils", emoji: "🟤", shelfLife: "1–2 years", why: "Cooks fast, no soaking. Big protein at a tiny price.", instacartName: "Dried lentils", instacartQty: 2, instacartUnit: "lb" },
  { slug: "flour", name: "Flour", emoji: "🌾", shelfLife: "Up to 1 year", why: "Bake bread, pancakes, tortillas — major savings vs. store-bought.", instacartName: "All purpose flour", instacartQty: 5, instacartUnit: "lb" },
  { slug: "frozen-vegetables", name: "Frozen Vegetables", emoji: "🥦", shelfLife: "8–12 months", why: "Same nutrition as fresh, never goes bad in the freezer.", instacartName: "Frozen mixed vegetables", instacartQty: 3, instacartUnit: "lb" },
  { slug: "tuna", name: "Canned Tuna", emoji: "🐟", shelfLife: "3–5 years", why: "Lean protein for sandwiches, salads, pastas.", instacartName: "Chunk light tuna in water", instacartQty: 6, instacartUnit: "ct" },
  { slug: "soup", name: "Canned Soup", emoji: "🍲", shelfLife: "2+ years", why: "Easy meals for sick days or quick weeknight dinners.", instacartName: "Vegetable soup can", instacartQty: 6, instacartUnit: "ct" },
  { slug: "shelf-stable-milk", name: "Shelf-Stable Milk", emoji: "🥛", shelfLife: "6–12 months", why: "No refrigeration needed until opened. Great backup.", instacartName: "Shelf stable whole milk", instacartQty: 6, instacartUnit: "ct" },
];
