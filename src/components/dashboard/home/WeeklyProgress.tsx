interface Props {
  budget: number;
  spent: number;
  mealsCooked: number;
  costPerMeal: number;
}

export function WeeklyProgress({ budget, spent, mealsCooked, costPerMeal }: Props) {
  const pct = budget > 0 ? Math.min(100, Math.round((spent / budget) * 100)) : 0;
  const left = Math.max(0, budget - spent);
  return (
    <div className="bg-card border border-border rounded-2xl p-4" style={{ boxShadow: "0px 4px 12px rgba(0,0,0,0.03)" }}>
      <div className="flex items-baseline justify-between mb-2">
        <h3 className="text-sm font-semibold text-foreground">Weekly Progress</h3>
        <span className="text-xs text-muted-foreground">{pct}% of budget used</span>
      </div>
      <div className="h-2 rounded-full bg-muted overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-700 rounded-full"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="grid grid-cols-4 gap-2 mt-4 text-center">
        <Stat label="Spent" value={`$${spent.toFixed(0)}`} />
        <Stat label="Left" value={`$${left.toFixed(0)}`} />
        <Stat label="Meals" value={`${mealsCooked}`} />
        <Stat label="Per Meal" value={`$${costPerMeal.toFixed(2)}`} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-bold text-foreground">{value}</p>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}
