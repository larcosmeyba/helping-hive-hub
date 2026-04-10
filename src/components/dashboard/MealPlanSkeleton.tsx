import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Loader2, ChefHat, ShoppingCart, CheckCircle2 } from "lucide-react";

const STAGE_CONFIG = {
  idle: { label: "", progress: 0, icon: null },
  preparing: { label: "Reading your preferences…", progress: 15, icon: Loader2 },
  generating: { label: "AI is crafting your meals…", progress: 55, icon: ChefHat },
  saving: { label: "Saving your plan…", progress: 90, icon: ShoppingCart },
  done: { label: "Done!", progress: 100, icon: CheckCircle2 },
} as const;

export function MealPlanSkeleton({ stage = "idle" }: { stage?: keyof typeof STAGE_CONFIG }) {
  const cfg = STAGE_CONFIG[stage] || STAGE_CONFIG.idle;
  const Icon = cfg.icon;
  const isActive = stage !== "idle";

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {isActive && (
        <div className="flex flex-col items-center gap-3 py-8">
          {Icon && (
            <Icon className={`h-8 w-8 text-primary ${stage === "done" ? "" : "animate-pulse"}`} />
          )}
          <p className="text-sm font-medium text-foreground">{cfg.label}</p>
          <div className="w-full max-w-xs">
            <Progress value={cfg.progress} className="h-2" />
          </div>
        </div>
      )}
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
