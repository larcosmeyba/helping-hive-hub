import { TrendingUp, DollarSign, Utensils, TrendingDown, ShoppingCart, PiggyBank, Target, BarChart3 } from "lucide-react";
import { useMealPlan } from "@/contexts/MealPlanContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

const COLORS = ["hsl(40, 92%, 49%)", "hsl(80, 61%, 35%)", "hsl(0, 0%, 45%)", "hsl(43, 100%, 72%)", "hsl(0, 84%, 60%)", "hsl(200, 60%, 50%)", "hsl(280, 60%, 50%)"];

export default function BudgetInsightsPage() {
  const { user } = useAuth();
  const { mealPlan } = useMealPlan();

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const budget = profile?.weekly_budget ?? 75;
  const spent = mealPlan?.totalEstimatedCost ?? 0;
  const pantrySavings = mealPlan?.pantrySavings ?? 0;
  const costPerMeal = mealPlan?.costPerMeal ?? 0;
  const saved = budget - spent;
  const monthlyBudget = budget * 4;
  const monthlySpent = spent * 4;
  const monthlySaved = saved * 4;

  // Category breakdown from grocery list
  const categoryData = (() => {
    if (!mealPlan?.groceryList?.length) return [];
    const cats: Record<string, number> = {};
    mealPlan.groceryList.forEach((item) => {
      const section = item.section || "Other";
      cats[section] = (cats[section] || 0) + (item.estimatedPrice || 0);
    });
    return Object.entries(cats)
      .map(([name, value]) => ({ name, value: Number(value.toFixed(2)) }))
      .sort((a, b) => b.value - a.value);
  })();

  // Weekly trend data (mock for now, would be from historical data)
  const weeklyTrend = [
    { week: "Week 1", budget, spent: spent * 0.95, saved: budget - spent * 0.95 },
    { week: "Week 2", budget, spent: spent * 1.02, saved: budget - spent * 1.02 },
    { week: "Week 3", budget, spent: spent * 0.88, saved: budget - spent * 0.88 },
    { week: "This Week", budget, spent, saved },
  ];

  // Daily cost breakdown
  const dailyCosts = mealPlan?.weeklyPlan?.map((day) => ({
    day: day.day.substring(0, 3),
    cost: day.meals.reduce((sum, m) => sum + (m.estimatedCost || 0), 0),
    meals: day.meals.length,
  })) || [];

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" /> Budget Insights
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Your spending, savings, and optimization at a glance</p>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Weekly Budget", value: `$${budget}`, sub: "Your target", icon: Target, gradient: "from-primary/20 to-primary/5" },
          { label: "This Week", value: `$${spent.toFixed(0)}`, sub: `${((spent / budget) * 100).toFixed(0)}% of budget`, icon: ShoppingCart, gradient: "from-accent/20 to-accent/5" },
          { label: "You Saved", value: `$${saved.toFixed(0)}`, sub: pantrySavings > 0 ? `incl. $${pantrySavings.toFixed(0)} pantry` : "This week", icon: PiggyBank, gradient: "from-accent/20 to-accent/5" },
          { label: "Cost/Meal", value: `$${costPerMeal.toFixed(2)}`, sub: `${mealPlan?.weeklyPlan?.reduce((n, d) => n + d.meals.length, 0) || 0} meals`, icon: Utensils, gradient: "from-primary/20 to-primary/5" },
        ].map((stat) => (
          <div key={stat.label} className={`bg-gradient-to-br ${stat.gradient} rounded-2xl border border-border p-5 shadow-card`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-card rounded-lg p-1.5">
                <stat.icon className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
          </div>
        ))}
      </div>

      {/* Budget Progress */}
      <div className="bg-card rounded-2xl border border-border shadow-card p-6">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" /> Budget Usage
        </h2>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-foreground font-medium">${spent.toFixed(2)} spent</span>
            <span className="text-muted-foreground">${budget} budget</span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-honey rounded-full transition-all duration-500"
              style={{ width: `${Math.min((spent / budget) * 100, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{((spent / budget) * 100).toFixed(0)}% used</span>
            <span>${saved.toFixed(2)} remaining</span>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Spending */}
        {dailyCosts.length > 0 && (
          <div className="bg-card rounded-2xl border border-border shadow-card p-6">
            <h3 className="font-display font-semibold text-foreground mb-4">Daily Meal Costs</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dailyCosts}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(40, 30%, 88%)" />
                <XAxis dataKey="day" tick={{ fontSize: 12, fill: "hsl(0, 0%, 45%)" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(0, 0%, 45%)" }} tickFormatter={(v) => `$${v}`} />
                <Tooltip
                  contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(40, 30%, 88%)", borderRadius: "12px", fontSize: "12px" }}
                  formatter={(value: number) => [`$${value.toFixed(2)}`, "Cost"]}
                />
                <Bar dataKey="cost" fill="hsl(40, 92%, 49%)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Spending by Category */}
        {categoryData.length > 0 && (
          <div className="bg-card rounded-2xl border border-border shadow-card p-6">
            <h3 className="font-display font-semibold text-foreground mb-4">Spending by Category</h3>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, "Amount"]} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Weekly Trend */}
      <div className="bg-card rounded-2xl border border-border shadow-card p-6">
        <h3 className="font-display font-semibold text-foreground mb-4">Weekly Spending Trend</h3>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={weeklyTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(40, 30%, 88%)" />
            <XAxis dataKey="week" tick={{ fontSize: 12, fill: "hsl(0, 0%, 45%)" }} />
            <YAxis tick={{ fontSize: 12, fill: "hsl(0, 0%, 45%)" }} tickFormatter={(v) => `$${v}`} />
            <Tooltip contentStyle={{ background: "hsl(0, 0%, 100%)", border: "1px solid hsl(40, 30%, 88%)", borderRadius: "12px", fontSize: "12px" }} formatter={(value: number) => [`$${value.toFixed(2)}`]} />
            <Legend />
            <Line type="monotone" dataKey="budget" stroke="hsl(0, 0%, 75%)" strokeDasharray="5 5" strokeWidth={2} name="Budget" dot={false} />
            <Line type="monotone" dataKey="spent" stroke="hsl(40, 92%, 49%)" strokeWidth={3} name="Spent" />
            <Line type="monotone" dataKey="saved" stroke="hsl(80, 61%, 35%)" strokeWidth={2} name="Saved" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl border border-border p-6 shadow-card">
          <DollarSign className="w-6 h-6 text-primary mb-2" />
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Monthly Budget</p>
          <p className="text-3xl font-bold text-foreground mt-1">${monthlyBudget}</p>
        </div>
        <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl border border-border p-6 shadow-card">
          <ShoppingCart className="w-6 h-6 text-accent mb-2" />
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Est. Monthly Spend</p>
          <p className="text-3xl font-bold text-foreground mt-1">${monthlySpent.toFixed(0)}</p>
        </div>
        <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-2xl border border-border p-6 shadow-card">
          <PiggyBank className="w-6 h-6 text-accent mb-2" />
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Est. Monthly Savings</p>
          <p className="text-3xl font-bold text-accent mt-1">${monthlySaved.toFixed(0)}</p>
        </div>
      </div>

      {/* Optimization Tips */}
      <div className="bg-card rounded-2xl border border-border shadow-card p-6">
        <h3 className="font-display font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingDown className="w-5 h-5 text-accent" /> Where You're Saving
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-accent/5 rounded-xl p-4 border border-accent/10">
            <p className="font-semibold text-foreground text-sm">Pantry Optimization</p>
            <p className="text-2xl font-bold text-accent mt-1">${pantrySavings.toFixed(2)}/week</p>
            <p className="text-xs text-muted-foreground mt-1">Saved by using items you already have</p>
          </div>
          <div className="bg-primary/5 rounded-xl p-4 border border-primary/10">
            <p className="font-semibold text-foreground text-sm">Budget Discipline</p>
            <p className="text-2xl font-bold text-primary mt-1">{saved > 0 ? `$${saved.toFixed(2)}` : "$0"}/week</p>
            <p className="text-xs text-muted-foreground mt-1">{saved > 0 ? "Under budget — great job!" : "On target with your budget"}</p>
          </div>
          <div className="bg-muted rounded-xl p-4 border border-border">
            <p className="font-semibold text-foreground text-sm">Smart Store Selection</p>
            <p className="text-xs text-muted-foreground mt-1">
              {mealPlan?.storeRecommendations?.length ? (
                <>Shopping at <span className="text-primary font-medium">{mealPlan.storeRecommendations[0].store}</span> saves you the most</>
              ) : "Generate a meal plan to see store comparisons"}
            </p>
          </div>
          <div className="bg-muted rounded-xl p-4 border border-border">
            <p className="font-semibold text-foreground text-sm">Regional Pricing</p>
            <p className="text-xs text-muted-foreground mt-1">
              {mealPlan?.regionLabel ? (
                <>Prices adjusted for <span className="text-primary font-medium">{mealPlan.regionLabel}</span> ({mealPlan.costOfLivingMultiplier}x)</>
              ) : "Set your ZIP code for accurate regional pricing"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
