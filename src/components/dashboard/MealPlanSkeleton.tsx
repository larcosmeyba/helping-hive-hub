import { Skeleton } from "@/components/ui/skeleton";

export function MealPlanSkeleton() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-36" />
        </div>
        <Skeleton className="h-9 w-36" />
      </div>
      {Array.from({ length: 3 }).map((_, dayIdx) => (
        <div key={dayIdx} className="space-y-3">
          <Skeleton className="h-7 w-28 rounded-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, mealIdx) => (
              <div key={mealIdx} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <Skeleton className="h-32 w-full rounded-lg" />
                <Skeleton className="h-5 w-3/4" />
                <div className="flex gap-2">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-16" />
                </div>
                <div className="flex gap-2 mt-2">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
