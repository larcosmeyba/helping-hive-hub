import { TrendingUp, DollarSign, Utensils, TrendingDown, ShoppingCart } from "lucide-react";

const WEEKLY_DATA = [
  { week: "Mar 3", budget: 75, spent: 68 },
  { week: "Mar 10", budget: 75, spent: 72 },
  { week: "Mar 17", budget: 75, spent: 65 },
];

export default function BudgetInsightsPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-6 h-6 text-primary" /> Budget Insights
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Track your grocery spending and savings</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Weekly Budget", value: "$75", icon: DollarSign, color: "text-primary" },
          { label: "Estimated Cost", value: "$72", icon: ShoppingCart, color: "text-accent" },
          { label: "Pantry Savings", value: "$10", icon: TrendingDown, color: "text-green-600" },
          { label: "Cost per Meal", value: "$2.85", icon: Utensils, color: "text-primary" },
        ].map((stat) => (
          <div key={stat.label} className="bg-card rounded-xl border border-border p-5 shadow-card">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
              <span className="text-sm text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-3xl font-bold text-foreground">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Weekly Spending */}
      <div className="bg-card rounded-xl border border-border shadow-card p-5">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">Weekly Spending</h2>
        <div className="space-y-4">
          {WEEKLY_DATA.map((week) => {
            const pct = (week.spent / week.budget) * 100;
            const saved = week.budget - week.spent;
            return (
              <div key={week.week}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground font-medium">{week.week}</span>
                  <span className="text-muted-foreground">
                    ${week.spent} / ${week.budget}
                    <span className="text-green-600 ml-2">(saved ${saved})</span>
                  </span>
                </div>
                <div className="h-3 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-honey rounded-full transition-all"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-3">Spending by Category</h3>
          <div className="space-y-3">
            {[
              { cat: "Meat & Protein", amount: 18.50, pct: 26 },
              { cat: "Produce", amount: 12.30, pct: 17 },
              { cat: "Grains & Pasta", amount: 10.50, pct: 15 },
              { cat: "Dairy", amount: 10.78, pct: 15 },
              { cat: "Canned Goods", amount: 5.80, pct: 8 },
              { cat: "Frozen", amount: 4.00, pct: 6 },
              { cat: "Other", amount: 10.12, pct: 14 },
            ].map((item) => (
              <div key={item.cat}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground">{item.cat}</span>
                  <span className="text-muted-foreground">${item.amount.toFixed(2)}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary/60 rounded-full" style={{ width: `${item.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border shadow-card p-5">
          <h3 className="font-display font-semibold text-foreground mb-3">Monthly Summary</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Budget</span>
              <span className="text-xl font-bold text-foreground">$300</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Spent</span>
              <span className="text-xl font-bold text-foreground">$205</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Total Saved</span>
              <span className="text-xl font-bold text-green-600">$95</span>
            </div>
            <div className="flex justify-between items-center border-t border-border pt-3">
              <span className="text-muted-foreground">Avg Cost/Meal</span>
              <span className="text-xl font-bold text-primary">$2.85</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
