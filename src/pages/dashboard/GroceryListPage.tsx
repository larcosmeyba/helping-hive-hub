import { useState } from "react";
import { ShoppingCart, Printer, Download, Store, Sparkles, Loader2, MapPin, Tag, Package, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useMealPlan } from "@/contexts/MealPlanContext";
import type { GroceryItem } from "@/types/mealPlan";

const STORE_BRAND_BY_RETAILER: Record<string, string> = {
  walmart: "Great Value",
  target: "Good & Gather",
  aldi: "Simply Nature",
  kroger: "Kroger",
  ralph: "Kroger",
  safeway: "Signature Select",
  vons: "Signature Select",
  albertsons: "Signature Select",
  "whole foods": "365 by Whole Foods Market",
  "trader joe": "Trader Joe's",
  publix: "Publix",
  "h-e-b": "HEB",
  heb: "HEB",
};

function getDefaultStoreBrand(storeName: string): string | undefined {
  const lower = storeName.toLowerCase();
  for (const [key, brand] of Object.entries(STORE_BRAND_BY_RETAILER)) {
    if (lower.includes(key)) return brand;
  }
  return undefined;
}

// Comprehensive product image map — covers all common grocery categories
const PRODUCT_IMAGES: Record<string, string> = {
  // Proteins
  chicken: "https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=80&h=80&fit=crop",
  turkey: "https://images.unsplash.com/photo-1574672280600-4accfa404c94?w=80&h=80&fit=crop",
  beef: "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=80&h=80&fit=crop",
  "ground beef": "https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=80&h=80&fit=crop",
  "ground turkey": "https://images.unsplash.com/photo-1574672280600-4accfa404c94?w=80&h=80&fit=crop",
  pork: "https://images.unsplash.com/photo-1602470520998-f4a52199a3d6?w=80&h=80&fit=crop",
  sausage: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=80&h=80&fit=crop",
  bacon: "https://images.unsplash.com/photo-1606851094291-6efae152bb87?w=80&h=80&fit=crop",
  fish: "https://images.unsplash.com/photo-1510130387422-82bed34b37e9?w=80&h=80&fit=crop",
  salmon: "https://images.unsplash.com/photo-1574781330855-d0db8cc6a79c?w=80&h=80&fit=crop",
  tuna: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=80&h=80&fit=crop",
  shrimp: "https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?w=80&h=80&fit=crop",
  tofu: "https://images.unsplash.com/photo-1628689469838-524a4a973b8e?w=80&h=80&fit=crop",

  // Dairy & Eggs
  egg: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=80&h=80&fit=crop",
  eggs: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?w=80&h=80&fit=crop",
  milk: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=80&h=80&fit=crop",
  cheese: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=80&h=80&fit=crop",
  cheddar: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=80&h=80&fit=crop",
  mozzarella: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=80&h=80&fit=crop",
  parmesan: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?w=80&h=80&fit=crop",
  butter: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc0d?w=80&h=80&fit=crop",
  yogurt: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=80&h=80&fit=crop",
  "sour cream": "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=80&h=80&fit=crop",
  cream: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=80&h=80&fit=crop",

  // Grains & Bread
  rice: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=80&h=80&fit=crop",
  pasta: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=80&h=80&fit=crop",
  spaghetti: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=80&h=80&fit=crop",
  noodle: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?w=80&h=80&fit=crop",
  bread: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=80&h=80&fit=crop",
  tortilla: "https://images.unsplash.com/photo-1612966809541-abf549ad90f1?w=80&h=80&fit=crop",
  flour: "https://images.unsplash.com/photo-1627484986972-e544190b3726?w=80&h=80&fit=crop",
  oat: "https://images.unsplash.com/photo-1614961233913-a5113e3cee2f?w=80&h=80&fit=crop",
  cereal: "https://images.unsplash.com/photo-1521483451569-e33803c0330c?w=80&h=80&fit=crop",
  granola: "https://images.unsplash.com/photo-1517093728432-a0440f8d45af?w=80&h=80&fit=crop",

  // Vegetables
  tomato: "https://images.unsplash.com/photo-1546470427-0d4db154ceb8?w=80&h=80&fit=crop",
  onion: "https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=80&h=80&fit=crop",
  potato: "https://images.unsplash.com/photo-1518977676601-b53f82ber33?w=80&h=80&fit=crop",
  garlic: "https://images.unsplash.com/photo-1540148426945-6cf22a6b2571?w=80&h=80&fit=crop",
  pepper: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=80&h=80&fit=crop",
  "bell pepper": "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?w=80&h=80&fit=crop",
  broccoli: "https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=80&h=80&fit=crop",
  carrot: "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?w=80&h=80&fit=crop",
  celery: "https://images.unsplash.com/photo-1580391564590-aeca65c5e2d3?w=80&h=80&fit=crop",
  spinach: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=80&h=80&fit=crop",
  lettuce: "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?w=80&h=80&fit=crop",
  cucumber: "https://images.unsplash.com/photo-1449300079323-02e209d9d3a6?w=80&h=80&fit=crop",
  corn: "https://images.unsplash.com/photo-1551754655-cd27e38d2076?w=80&h=80&fit=crop",
  mushroom: "https://images.unsplash.com/photo-1504545102780-26774c1bb073?w=80&h=80&fit=crop",
  avocado: "https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=80&h=80&fit=crop",
  zucchini: "https://images.unsplash.com/photo-1563252722-6434563a2c3b?w=80&h=80&fit=crop",
  cabbage: "https://images.unsplash.com/photo-1594282486756-56b0dd1a6aa8?w=80&h=80&fit=crop",
  "green bean": "https://images.unsplash.com/photo-1567375698348-5d9d5ae10c8b?w=80&h=80&fit=crop",
  pea: "https://images.unsplash.com/photo-1587735243615-c03f25aaff15?w=80&h=80&fit=crop",
  "sweet potato": "https://images.unsplash.com/photo-1596097635121-14b63a7fba98?w=80&h=80&fit=crop",
  "frozen veg": "https://images.unsplash.com/photo-1580910365203-91ea9115a319?w=80&h=80&fit=crop",

  // Fruits
  banana: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=80&h=80&fit=crop",
  apple: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=80&h=80&fit=crop",
  orange: "https://images.unsplash.com/photo-1547514701-42782101795e?w=80&h=80&fit=crop",
  lemon: "https://images.unsplash.com/photo-1590502593747-42a996133562?w=80&h=80&fit=crop",
  lime: "https://images.unsplash.com/photo-1590502593747-42a996133562?w=80&h=80&fit=crop",
  berry: "https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=80&h=80&fit=crop",
  strawberry: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?w=80&h=80&fit=crop",
  blueberry: "https://images.unsplash.com/photo-1498557850523-fd3d118b962e?w=80&h=80&fit=crop",
  grape: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?w=80&h=80&fit=crop",

  // Canned & Pantry
  bean: "https://images.unsplash.com/photo-1511690743698-d9d18f7e20f1?w=80&h=80&fit=crop",
  "black bean": "https://images.unsplash.com/photo-1511690743698-d9d18f7e20f1?w=80&h=80&fit=crop",
  "kidney bean": "https://images.unsplash.com/photo-1511690743698-d9d18f7e20f1?w=80&h=80&fit=crop",
  chickpea: "https://images.unsplash.com/photo-1515543904806-615355432eb7?w=80&h=80&fit=crop",
  lentil: "https://images.unsplash.com/photo-1515543904806-615355432eb7?w=80&h=80&fit=crop",
  "canned tomato": "https://images.unsplash.com/photo-1534483509719-8b56c7b6f7fc?w=80&h=80&fit=crop",
  "tomato sauce": "https://images.unsplash.com/photo-1534483509719-8b56c7b6f7fc?w=80&h=80&fit=crop",
  "tomato paste": "https://images.unsplash.com/photo-1534483509719-8b56c7b6f7fc?w=80&h=80&fit=crop",
  salsa: "https://images.unsplash.com/photo-1600626333564-83e6e2e13ee3?w=80&h=80&fit=crop",
  soup: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=80&h=80&fit=crop",
  broth: "https://images.unsplash.com/photo-1547592166-23ac45744acd?w=80&h=80&fit=crop",
  "peanut butter": "https://images.unsplash.com/photo-1601493700631-2b16ec4b4716?w=80&h=80&fit=crop",

  // Oils & Condiments
  oil: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=80&h=80&fit=crop",
  "olive oil": "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=80&h=80&fit=crop",
  vinegar: "https://images.unsplash.com/photo-1604180188640-3bc0b25fdf46?w=80&h=80&fit=crop",
  "soy sauce": "https://images.unsplash.com/photo-1585672840563-f2af2ced55c9?w=80&h=80&fit=crop",
  ketchup: "https://images.unsplash.com/photo-1615478503562-ec2d8aa0a7d6?w=80&h=80&fit=crop",
  mustard: "https://images.unsplash.com/photo-1528750997573-59b89d56f4f7?w=80&h=80&fit=crop",
  mayo: "https://images.unsplash.com/photo-1587881299356-37b1d0e8ae60?w=80&h=80&fit=crop",
  honey: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=80&h=80&fit=crop",

  // Baking & Spices
  sugar: "https://images.unsplash.com/photo-1598343175882-595a1f4d4e37?w=80&h=80&fit=crop",
  salt: "https://images.unsplash.com/photo-1518110925495-5fe2c8e2ab21?w=80&h=80&fit=crop",
  spice: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=80&h=80&fit=crop",
  seasoning: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=80&h=80&fit=crop",
  cinnamon: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=80&h=80&fit=crop",
  cumin: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=80&h=80&fit=crop",
  paprika: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=80&h=80&fit=crop",
  oregano: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=80&h=80&fit=crop",

  // Beverages
  juice: "https://images.unsplash.com/photo-1621506289937-a8e4df240d0b?w=80&h=80&fit=crop",
  coffee: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=80&h=80&fit=crop",
  tea: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=80&h=80&fit=crop",

  // Snacks
  chip: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=80&h=80&fit=crop",
  cracker: "https://images.unsplash.com/photo-1558961363-fa8fdf82db35?w=80&h=80&fit=crop",
  nut: "https://images.unsplash.com/photo-1536591375248-0e81f3e29dbd?w=80&h=80&fit=crop",
  almond: "https://images.unsplash.com/photo-1536591375248-0e81f3e29dbd?w=80&h=80&fit=crop",
};

const DEFAULT_PRODUCT_IMG = "https://images.unsplash.com/photo-1542838132-92c53300491e?w=80&h=80&fit=crop";

function getProductImage(name: string): string {
  const lower = name.toLowerCase();
  for (const [keyword, url] of Object.entries(PRODUCT_IMAGES)) {
    if (lower.includes(keyword)) return url;
  }
  return DEFAULT_PRODUCT_IMG;
}

function getStoreSpecificProduct(item: GroceryItem, activeStore: string) {
  const storeSpecific = activeStore ? item.storeProducts?.[activeStore] : undefined;
  if (storeSpecific?.productDescription || storeSpecific?.brand) {
    return {
      productDescription: storeSpecific.productDescription || item.productDescription || item.name,
      brand: storeSpecific.brand || item.brand,
    };
  }

  const fallbackBrand = activeStore ? getDefaultStoreBrand(activeStore) : undefined;
  if (fallbackBrand) {
    const quantitySuffix = item.quantity ? `, ${item.quantity}` : "";
    return {
      productDescription: `${fallbackBrand} ${item.name}${quantitySuffix}`.trim(),
      brand: fallbackBrand,
    };
  }

  return {
    productDescription: item.productDescription || item.name,
    brand: item.brand,
  };
}

export default function GroceryListPage() {
  const { mealPlan, generating, generate } = useMealPlan();
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [selectedStore, setSelectedStore] = useState("");

  if (!mealPlan || !mealPlan.groceryList?.length) {
    return (
      <div className="max-w-4xl mx-auto text-center py-20">
        <ShoppingCart className="w-12 h-12 text-primary mx-auto mb-4" />
        <h1 className="font-display text-2xl font-bold text-foreground mb-2">No Grocery List Yet</h1>
        <p className="text-muted-foreground mb-6">Generate a meal plan first to get your grocery list</p>
        <Button onClick={generate} disabled={generating} className="bg-gradient-honey text-primary-foreground hover:opacity-90">
          {generating ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating...</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Meal Plan</>}
        </Button>
      </div>
    );
  }

  const groceryItems = mealPlan.groceryList;
  const stores = mealPlan.storeRecommendations || [];
  const activeStore = selectedStore || stores[0]?.store || "";

  const toggle = (name: string) => {
    const next = new Set(checked);
    next.has(name) ? next.delete(name) : next.add(name);
    setChecked(next);
  };

  const sections = Array.from(new Set(groceryItems.map((i) => i.section || "Other")));

  // Get store-specific price for an item
  const getItemPrice = (item: typeof groceryItems[0]) => {
    if (item.storePrices && activeStore && item.storePrices[activeStore]) {
      return item.storePrices[activeStore];
    }
    return item.estimatedPrice || 0;
  };

  const subtotal = groceryItems.reduce((sum, i) => sum + getItemPrice(i), 0);
  const taxRate = mealPlan.taxEstimate ? mealPlan.taxEstimate / mealPlan.totalEstimatedCost : 0.03;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;
  const checkedCount = checked.size;

  return (
    <div className="max-w-4xl mx-auto space-y-3 md:space-y-6 px-1 md:px-0">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-sm md:text-2xl font-bold text-foreground flex items-center gap-1 md:gap-2">
            <ShoppingCart className="w-3.5 h-3.5 md:w-6 md:h-6 text-primary" /> Grocery List
          </h1>
          <p className="text-[8px] md:text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
            {groceryItems.length} items • {checkedCount} checked
            {mealPlan.regionLabel && (
              <span className="flex items-center gap-0.5 text-primary font-medium">
                <MapPin className="w-2 h-2 md:w-3 md:h-3" /> {mealPlan.regionLabel}
              </span>
            )}
          </p>
        </div>
        <div className="flex gap-1 md:gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()} className="h-6 text-[8px] px-1.5 md:h-9 md:text-sm md:px-3">
            <Printer className="w-2.5 h-2.5 mr-0.5 md:w-4 md:h-4 md:mr-2" /> Print
          </Button>
          <Button variant="outline" size="sm" className="h-6 text-[8px] px-1.5 md:h-9 md:text-sm md:px-3">
            <Download className="w-2.5 h-2.5 mr-0.5 md:w-4 md:h-4 md:mr-2" /> Save
          </Button>
        </div>
      </div>

      {/* Store Comparison — horizontal scroll */}
      {stores.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2 md:mb-3">
            <Store className="w-4 h-4 md:w-5 md:h-5 text-primary" />
            <h2 className="font-display text-sm md:text-lg font-semibold text-foreground">Compare Stores</h2>
          </div>
          <div
            className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-1 -mx-1 px-1 md:grid md:grid-cols-3 md:gap-4 md:overflow-visible md:pb-0 md:mx-0 md:px-0"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {stores.slice(0, 6).map((store) => {
              const isActive = activeStore === store.store;
              const isCheapest = stores.every((s) => store.estimatedTotal <= s.estimatedTotal);
              return (
                <button
                  key={store.store}
                  onClick={() => setSelectedStore(store.store)}
                  className={`snap-start shrink-0 w-[130px] md:w-auto relative p-3 md:p-4 rounded-2xl border text-left transition-all ${
                    isActive
                      ? "border-primary bg-primary/5 shadow-card"
                      : "border-border hover:border-primary/30"
                  }`}
                >
                  {isCheapest && (
                    <span className="absolute -top-1.5 right-2 bg-accent text-accent-foreground text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      Best
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 mb-1">
                    <Store className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary shrink-0" />
                    <p className="font-semibold text-xs md:text-sm text-foreground truncate">{store.store}</p>
                  </div>
                  <p className="text-lg md:text-xl font-bold text-primary">${store.estimatedTotal?.toFixed(2)}</p>
                  <p className="text-[10px] md:text-xs text-muted-foreground">Est. + tax</p>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Grocery Items by Section */}
      {sections.map((section) => (
        <div key={section} className="bg-card rounded-2xl border border-border shadow-card overflow-hidden">
          <div className="bg-muted/50 px-5 py-3 border-b border-border flex items-center gap-2">
            <Tag className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-foreground text-sm">{section}</h3>
            <span className="text-xs text-muted-foreground ml-auto">
              {groceryItems.filter((i) => (i.section || "Other") === section).length} items
            </span>
          </div>
          <div className="divide-y divide-border">
            {groceryItems.filter((i) => (i.section || "Other") === section).map((item) => {
              const price = getItemPrice(item);
              const isChecked = checked.has(item.name);
              const displayProduct = getStoreSpecificProduct(item, activeStore);
              return (
                <label
                  key={item.name}
                  className="flex items-center gap-4 px-5 py-3.5 hover:bg-muted/20 cursor-pointer transition-colors"
                >
                  <Checkbox checked={isChecked} onCheckedChange={() => toggle(item.name)} />
                  <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted shrink-0 border border-border">
                    <img
                      src={getProductImage(item.name)}
                      alt={displayProduct.productDescription}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium text-sm leading-tight ${isChecked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {displayProduct.productDescription}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {displayProduct.brand && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                          <Package className="w-2.5 h-2.5" /> Maker: {displayProduct.brand}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">{item.quantity}</span>
                    </div>
                    {/* Per-store price breakdown */}
                    {item.storePrices && Object.keys(item.storePrices).length > 1 && (
                      <div className="flex gap-2 mt-1 flex-wrap">
                        {Object.entries(item.storePrices).map(([store, storePrice]) => (
                          <span
                            key={store}
                            className={`text-[10px] px-1.5 py-0.5 rounded ${
                              store === activeStore
                                ? "bg-primary/15 text-primary font-semibold"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {store}: ${(storePrice as number).toFixed(2)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-sm font-bold text-foreground">${price.toFixed(2)}</span>
                    {activeStore && (
                      <p className="text-[10px] text-muted-foreground">at {activeStore}</p>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      ))}

      {/* Totals */}
      <div className="bg-card rounded-2xl border border-border shadow-card p-6">
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal ({activeStore || "Average"})</span>
            <span className="text-foreground font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Estimated Tax ({(taxRate * 100).toFixed(1)}%)</span>
            <span className="text-foreground">${tax.toFixed(2)}</span>
          </div>
          {mealPlan.pantrySavings > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pantry Savings</span>
              <span className="text-accent font-semibold">−${mealPlan.pantrySavings.toFixed(2)}</span>
            </div>
          )}
          <div className="border-t border-border pt-3 flex justify-between">
            <span className="font-semibold text-foreground text-base">Total</span>
            <span className="font-bold text-2xl text-primary">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
