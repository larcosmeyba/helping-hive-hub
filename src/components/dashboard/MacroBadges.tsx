import { cn } from "@/lib/utils";

interface Props {
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  size?: "xs" | "sm" | "md";
  className?: string;
}

/**
 * Compact protein/carbs/fats macro badges.
 * Used everywhere meals appear (meal cards, fridge chef cards, recipe details).
 */
export function MacroBadges({ protein, carbs, fats, fiber, size = "sm", className }: Props) {
  const sizing = {
    xs: "text-[8px] px-1 py-0.5 gap-0.5",
    sm: "text-[10px] px-1.5 py-0.5 gap-1",
    md: "text-xs px-2 py-1 gap-1.5",
  }[size];

  const items = [
    { label: "P", value: protein, color: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/30 dark:text-rose-300 dark:border-rose-900" },
    { label: "C", value: carbs, color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-300 dark:border-blue-900" },
    { label: "F", value: fats, color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/30 dark:text-amber-300 dark:border-amber-900" },
  ];
  if (fiber != null && fiber > 0) {
    items.push({ label: "Fb", value: fiber, color: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-300 dark:border-emerald-900" });
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-1", className)}>
      {items.map((m) => (
        <span
          key={m.label}
          className={cn(
            "inline-flex items-center rounded-full border font-semibold leading-none",
            sizing,
            m.color
          )}
          aria-label={`${m.label === "P" ? "Protein" : m.label === "C" ? "Carbs" : m.label === "F" ? "Fats" : "Fiber"} ${m.value} grams`}
        >
          <span className="opacity-70">{m.label}</span>
          <span>{Math.round(m.value)}g</span>
        </span>
      ))}
    </div>
  );
}
