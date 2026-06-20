export interface MealPlanMeal {
  type: string;
  name: string;
  calories?: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  estimatedCost: number;
  costPerServing?: number;
  cookTimeMinutes: number;
  ingredients: string[];
  instructions: string[];
  imageUrl?: string;
  /** Snake-case alias emitted by the meal-plan edge function & stored in plan_data. */
  image_url?: string;
  imageVerified?: boolean;
  nutritionVerified?: boolean;
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
  pricingSource?: 'instacart' | 'estimate' | 'internal_estimate' | 'ai_estimate' | 'regional' | 'national';
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
  /** Weekly grocery budget enforced when this plan was generated. */
  weeklyBudget?: number;
  /** Budget − totalEstimatedCost, rounded to 2dp, floored at 0. */
  budgetRemaining?: number;
  /** True if the engine could not bring the plan under budget. */
  budgetExceeded?: boolean;
  /** Human-readable warning shown only when budgetExceeded=true. */
  budgetWarningText?: string | null;
  /** Channel the displayed total represents. Defaults to delivery (Instacart). */
  channel?: "delivery" | "in_store";
  /** Full delivered-cost breakdown — what the user actually pays at Instacart checkout. */
  channelBreakdown?: {
    channel: "delivery" | "in_store";
    store: string;
    in_store_subtotal: number;
    item_markup: number;
    service_fee: number;
    delivery_fee: number;
    bag_fee: number;
    tip: number;
    tax: number;
    delivered_total: number;
    in_store_only_total: number;
    as_of_date: string;
  };
}
