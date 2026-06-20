import { Info } from "lucide-react";
import { GROCERY_PRICING_DISCLAIMER } from "@/lib/disclaimers";

type Variant = "pricing" | "why-instacart" | "inline";

interface Props {
  variant?: Variant;
  className?: string;
}

/**
 * Generic pricing disclaimer. Originally Instacart-specific; now a neutral
 * "estimates only" note. Variant prop preserved so existing callers compile.
 */
export function PricingDisclaimer({ variant = "pricing", className = "" }: Props) {
  if (variant === "inline" || variant === "why-instacart") {
    return (
      <p className={`text-[11px] text-muted-foreground leading-relaxed ${className}`}>
        {GROCERY_PRICING_DISCLAIMER}
      </p>
    );
  }

  return (
    <div className={`rounded-xl bg-muted/40 border border-border px-3 py-2 flex gap-2 ${className}`}>
      <Info className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <p className="text-[11px] text-muted-foreground leading-relaxed">
        {GROCERY_PRICING_DISCLAIMER}
      </p>
    </div>
  );
}
