export interface MealPlanMeal {
  type: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  estimatedCost: number;
  cookTimeMinutes: number;
  ingredients: string[];
  instructions: string[];
}

export interface MealPlanDay {
  day: string;
  meals: MealPlanMeal[];
}

export interface GroceryItem {
  name: string;
  quantity: string;
  estimatedPrice: number;
  section: string;
}

export interface StoreRecommendation {
  store: string;
  estimatedTotal: number;
}

export interface GeneratedMealPlan {
  weeklyPlan: MealPlanDay[];
  groceryList: GroceryItem[];
  storeRecommendations: StoreRecommendation[];
  totalEstimatedCost: number;
  pantrySavings: number;
  costPerMeal: number;
  taxEstimate: number;
}
