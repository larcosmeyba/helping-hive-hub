import { useEffect, useState } from "react";
import { History, CalendarDays, DollarSign, ChevronDown, ChevronUp, Utensils } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useMealPlan, type MealPlanHistoryEntry } from "@/contexts/MealPlanContext";
import { format, parseISO } from "date-fns";

export function MealPlanHistory() {
  const { history, historyLoading, loadHistory } = useMealPlan();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  if (historyLoading) {
    return (
      <div className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
          <History className="w-5 h-5 text-primary" /> Meal Plan History
        </h2>
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (history.length === 0) return null;

  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg font-semibold text-foreground flex items-center gap-2">
        <History className="w-5 h-5 text-primary" /> Meal Plan History
      </h2>

      <div className="space-y-3">
        {history.map((entry) => {
          const isExpanded = expandedId === entry.id;
          const weekLabel = (() => {
            try {
              return `Week of ${format(parseISO(entry.weekStart), "MMM d, yyyy")}`;
            } catch {
              return entry.weekStart;
            }
          })();
          const totalMeals = entry.plan?.weeklyPlan?.reduce((n, d) => n + d.meals.length, 0) ?? 0;

          return (
            <Card key={entry.id} className="overflow-hidden">
              <button
                className="w-full text-left"
                onClick={() => setExpandedId(isExpanded ? null : entry.id)}
              >
                <CardHeader className="py-4 px-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <CalendarDays className="w-5 h-5 text-primary shrink-0" />
                      <div>
                        <CardTitle className="text-sm font-semibold">{weekLabel}</CardTitle>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {totalMeals} meals
                          {entry.totalEstimatedCost != null && (
                            <> • <DollarSign className="w-3 h-3 inline" />{entry.totalEstimatedCost.toFixed(2)}</>
                          )}
                          {' '}• Generated {(() => { try { return format(parseISO(entry.createdAt), "MMM d"); } catch { return ''; } })()}
                        </p>
                      </div>
                    </div>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                  </div>
                </CardHeader>
              </button>

              {isExpanded && entry.plan?.weeklyPlan && (
                <CardContent className="pt-0 pb-4 px-5">
                  <div className="space-y-3">
                    {entry.plan.weeklyPlan.map((day) => (
                      <div key={day.day}>
                        <p className="text-xs font-bold text-primary mb-1">{day.day}</p>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                          {day.meals.map((meal, i) => (
                            <div key={i} className="bg-muted/50 rounded-lg p-2.5 text-xs">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Utensils className="w-3 h-3 text-primary shrink-0" />
                                <span className="font-medium text-foreground truncate">{meal.name}</span>
                              </div>
                              <div className="flex gap-2 text-muted-foreground">
                                <span>{meal.calories} cal</span>
                                <span>${meal.estimatedCost?.toFixed(2)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
