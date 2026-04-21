export interface MealPlanMeal {
  type: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  estimatedCost: number;
  costPerServing?: number;
  cookTimeMinutes: number;
  ingredients: string[];
  instructions: string[];
}

export interface MealPlanDay {
  day: string;
  meals: MealPlanMeal[];
}

export interface StoreSpecificProduct {
  brand?: string;
  productDescription?: string;
}

export interface GroceryItem {
  name: string;
  quantity: string;
  estimatedPrice: number;
  section: string;
  brand?: string;
  productDescription?: string;
  storePrices?: Record<string, number>;
  storeProducts?: Record<string, StoreSpecificProduct>;
  pricingSource?: 'live' | 'cached' | 'internal_estimate' | 'ai_estimate' | 'open_prices' | 'google_shopping' | 'walmart' | 'regional' | 'national';
  pricingConfidence?: 'high' | 'medium' | 'low';
}

export interface StoreRecommendation {
  store: string;
  estimatedTotal: number;
}

export interface PricingConfidenceSummary {
  exactPricedCount: number;
  cachedPricedCount: number;
  estimatedCount: number;
  totalItems: number;
  confidencePercent: number;
}

export interface SavingsSummary {
  actualGroceryCost: number;
  regionalAverageCost: number;
  estimatedSavings: number;
  savingsPercent: number;
  confidenceScore: number;
}

export interface GeneratedMealPlan {
  weeklyPlan: MealPlanDay[];
  groceryList: GroceryItem[];
  storeRecommendations: StoreRecommendation[];
  totalEstimatedCost: number;
  pantrySavings: number;
  costPerMeal: number;
  taxEstimate: number;
  regionLabel?: string;
  costOfLivingMultiplier?: number;
  pricingConfidence?: PricingConfidenceSummary;
  savingsSummary?: SavingsSummary;
}
