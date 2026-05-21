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
  { slug: "cornmeal", name: "Cornmeal", emoji: "🌽", shelfLife: "6–12 months", why: "Cornbread, polenta, breading — pennies per serving.", instacartName: "Yellow cornmeal", instacartQty: 2, instacartUnit: "lb" },
  { slug: "pinto-beans", name: "Dried Pinto Beans", emoji: "🫘", shelfLife: "2+ years", why: "Classic Tex-Mex protein. Cheaper than canned by far.", instacartName: "Dried pinto beans", instacartQty: 2, instacartUnit: "lb" },
  { slug: "chickpeas", name: "Dried Chickpeas", emoji: "🌰", shelfLife: "2+ years", why: "Hummus, curries, salads — high-protein staple.", instacartName: "Dried chickpeas", instacartQty: 2, instacartUnit: "lb" },
  { slug: "canned-corn", name: "Canned Corn", emoji: "🌽", shelfLife: "2–5 years", why: "Quick side dish or salad add-in for any meal.", instacartName: "Whole kernel corn can", instacartQty: 6, instacartUnit: "ct" },
  { slug: "canned-green-beans", name: "Canned Green Beans", emoji: "🥬", shelfLife: "2–5 years", why: "Easy vegetable side that lasts years on the shelf.", instacartName: "Cut green beans can", instacartQty: 6, instacartUnit: "ct" },
  { slug: "cooking-oil", name: "Cooking Oil", emoji: "🫒", shelfLife: "1–2 years", why: "Essential for almost every recipe. Buy big to save.", instacartName: "Vegetable cooking oil", instacartQty: 48, instacartUnit: "oz" },
  { slug: "salt", name: "Salt", emoji: "🧂", shelfLife: "Indefinite", why: "Never goes bad. Always have a big container on hand.", instacartName: "Iodized table salt", instacartQty: 26, instacartUnit: "oz" },
  { slug: "sugar", name: "Sugar", emoji: "🍬", shelfLife: "Indefinite", why: "Baking, coffee, sauces — never expires when sealed.", instacartName: "Granulated white sugar", instacartQty: 4, instacartUnit: "lb" },
  { slug: "honey", name: "Honey", emoji: "🍯", shelfLife: "Indefinite", why: "Natural sweetener that literally never spoils.", instacartName: "Pure honey", instacartQty: 32, instacartUnit: "oz" },
  { slug: "soy-sauce", name: "Soy Sauce", emoji: "🍶", shelfLife: "2–3 years", why: "Transforms rice, noodles, stir-fries instantly.", instacartName: "Soy sauce", instacartQty: 10, instacartUnit: "oz" },
  { slug: "powdered-milk", name: "Powdered Milk", emoji: "🥛", shelfLife: "1–2 years", why: "Backup dairy for baking and emergencies.", instacartName: "Nonfat dry milk powder", instacartQty: 1, instacartUnit: "box" },
];
