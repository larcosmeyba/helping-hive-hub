import { CheckCircle2, Info } from "lucide-react";

interface Props {
  mode: "kroger" | "estimated" | null | undefined;
  className?: string;
}

/**
 * Read-only badge that surfaces whether the displayed pricing came from a
 * live Kroger match (`pricingMode === "kroger"`) or fell back to the
 * regional/USDA estimate. Does NOT recompute — reads the value already
 * returned by generate-meal-plan.
 */
export function PricingModeBadge({ mode, className = "" }: Props) {
  if (!mode) return null;
  const isLive = mode === "kroger";
  const Icon = isLive ? CheckCircle2 : Info;
  const label = isLive ? "Pricing" : "Estimated pricing";
  const tone = isLive
    ? "bg-[#E6F4EA] text-[#1F5A3D] border-[#BFE0CB]"
    : "bg-[#FFF6E1] text-[#5a4a1a] border-[#F2D78A]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tone} ${className}`}
      title={
        isLive
          ? "Prices were matched to real Kroger products at your home store."
          : "Kroger pricing wasn't available, so we used a regional estimate. Final price confirmed at checkout."
      }
    >
      <Icon className="w-3 h-3" strokeWidth={2.5} />
      {label}
    </span>
  );
}
