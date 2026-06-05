import { supabase } from "@/integrations/supabase/client";

export type FoodCategory =
  | "groceries"
  | "restaurants"
  | "coffee_drinks"
  | "food_delivery"
  | "instacart"
  | "other_food";

export interface BudgetSummary {
  monthly_food_budget: number;
  spent_total: number;
  remaining_budget: number;
  grocery_spending: number;
  restaurant_spending: number;
  coffee_spending: number;
  food_delivery_spending: number;
  other_food_spending: number;
  budget_health_score: number;
  projected_month_end_spending: number | null;
  potential_savings: number | null;
  month: string;
  isMock?: boolean;
}

export interface FoodTx {
  id: string;
  merchant_name: string | null;
  transaction_name: string | null;
  amount: number;
  date: string;
  normalized_category: FoodCategory;
  pending: boolean;
}

export interface BudgetInsight {
  id: string;
  insight_type: string;
  title: string;
  message: string;
  estimated_savings: number | null;
  related_category: string | null;
}

export const MOCK_SUMMARY: BudgetSummary = {
  monthly_food_budget: 400,
  spent_total: 275,
  remaining_budget: 125,
  grocery_spending: 168,
  restaurant_spending: 62,
  coffee_spending: 24,
  food_delivery_spending: 18,
  other_food_spending: 3,
  budget_health_score: 92,
  projected_month_end_spending: 385,
  potential_savings: 48,
  month: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1)).toISOString().slice(0, 10),
  isMock: true,
};

export const MOCK_TX: FoodTx[] = [
  { id: "m1", merchant_name: "Aldi", transaction_name: "Aldi Groceries", amount: 48.32, date: today(-1), normalized_category: "groceries", pending: false },
  { id: "m2", merchant_name: "Starbucks", transaction_name: "Coffee", amount: 5.75, date: today(-1), normalized_category: "coffee_drinks", pending: false },
  { id: "m3", merchant_name: "Chipotle", transaction_name: "Lunch", amount: 14.2, date: today(-2), normalized_category: "restaurants", pending: false },
  { id: "m4", merchant_name: "Instacart", transaction_name: "Costco delivery", amount: 86.4, date: today(-4), normalized_category: "instacart", pending: false },
  { id: "m5", merchant_name: "DoorDash", transaction_name: "Dinner delivery", amount: 18.0, date: today(-5), normalized_category: "food_delivery", pending: false },
  { id: "m6", merchant_name: "Whole Foods", transaction_name: "Groceries", amount: 62.18, date: today(-7), normalized_category: "groceries", pending: false },
  { id: "m7", merchant_name: "Blue Bottle", transaction_name: "Coffee", amount: 6.25, date: today(-9), normalized_category: "coffee_drinks", pending: false },
  { id: "m8", merchant_name: "Sweetgreen", transaction_name: "Lunch", amount: 16.7, date: today(-10), normalized_category: "restaurants", pending: false },
];

export const MOCK_INSIGHTS: BudgetInsight[] = [
  {
    id: "i1",
    insight_type: "spending_alert",
    title: "Restaurant spending is up 15%",
    message: "Restaurant spending is up 15% compared to last month. Cooking 2 more meals at home this week could save about $82.",
    estimated_savings: 82,
    related_category: "restaurants",
  },
  {
    id: "i2",
    insight_type: "good_news",
    title: "Groceries on track",
    message: "Your grocery spending is within budget this month. Great job using your meal plan.",
    estimated_savings: null,
    related_category: "groceries",
  },
  {
    id: "i3",
    insight_type: "savings_opportunity",
    title: "Brew coffee at home twice a week",
    message: "Swapping two coffee shop visits for at-home brews could save about $24 this month.",
    estimated_savings: 24,
    related_category: "coffee_drinks",
  },
];

function today(offset: number) {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

export async function getPlaidConnectionStatus(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("plaid_connections")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  return !!data;
}

export async function getBudgetSummary(userId: string): Promise<BudgetSummary> {
  const month = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1))
    .toISOString()
    .slice(0, 10);
  const { data } = await supabase
    .from("food_budget_summaries")
    .select("*")
    .eq("user_id", userId)
    .eq("month", month)
    .maybeSingle();
  if (data) return { ...(data as any), isMock: false };
  return MOCK_SUMMARY;
}

export async function getFoodTransactions(userId: string, category?: FoodCategory): Promise<FoodTx[]> {
  let q = supabase
    .from("food_transactions")
    .select("id, merchant_name, transaction_name, amount, date, normalized_category, pending")
    .eq("user_id", userId)
    .order("date", { ascending: false })
    .limit(100);
  if (category) q = q.eq("normalized_category", category);
  const { data } = await q;
  if (data && data.length) return data as FoodTx[];
  const mock = category ? MOCK_TX.filter((t) => t.normalized_category === category) : MOCK_TX;
  return mock;
}

export async function getBudgetInsights(userId: string): Promise<BudgetInsight[]> {
  const { data } = await supabase
    .from("budget_ai_insights")
    .select("id, insight_type, title, message, estimated_savings, related_category")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(10);
  if (data && data.length) return data as BudgetInsight[];
  return MOCK_INSIGHTS;
}

export const CATEGORY_LABELS: Record<FoodCategory, string> = {
  groceries: "Groceries",
  restaurants: "Restaurants",
  coffee_drinks: "Coffee",
  food_delivery: "Food Delivery",
  instacart: "Instacart",
  other_food: "Other Food",
};

export const PRIVACY_COPY =
  "Help The Hive only uses food-related transactions to help you understand grocery and restaurant spending. We do not display income, debt, investments, or unrelated purchases.";
