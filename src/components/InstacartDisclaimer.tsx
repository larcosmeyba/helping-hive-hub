import { Info } from "lucide-react";
import {
  INSTACART_PRICING_DISCLAIMER,
  INSTACART_PARTNERSHIP_EXPLAINER,
} from "@/lib/disclaimers";

type Variant = "pricing" | "why-instacart" | "inline";

interface Props {
  variant?: Variant;
  className?: string;
}

/**
 * Shared disclaimer block for grocery totals, recipe pricing, meal-plan
 * totals, and Instacart checkout buttons. Keeps legal copy consistent.
 */
export function InstacartDisclaimer({ variant = "pricing", className = "" }: Props) {
  if (variant === "inline") {
    return (
      <p className={`text-[11px] text-muted-foreground leading-relaxed ${className}`}>
        {INSTACART_PRICING_DISCLAIMER}
      </p>
    );
  }

  if (variant === "why-instacart") {
    return (
      <div className={`rounded-2xl border border-border bg-muted/30 p-4 flex gap-3 ${className}`}>
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground">Why Instacart?</p>
          <p>{INSTACART_PARTNERSHIP_EXPLAINER}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-xl bg-muted/40 border border-border px-3 py-2 flex gap-2 ${className}`}>
      <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {INSTACART_PRICING_DISCLAIMER}
      </p>
    </div>
  );
}
