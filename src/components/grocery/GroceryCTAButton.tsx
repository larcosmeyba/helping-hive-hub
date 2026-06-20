import * as React from "react";
import { Loader2, ExternalLink, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Generic primary grocery CTA. Originally an Instacart-branded button; now a
 * neutral Help The Hive primary CTA (honey gold) used for actions like
 * "Shop at Kroger", "Copy Grocery List", etc.
 *
 * The component name and export shape are preserved so all callers continue
 * to compile without per-file edits.
 */

export type InstacartCTAVariant = "dark" | "light" | "white";

interface InstacartCTAButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: InstacartCTAVariant;
  loading?: boolean;
  showExternalIcon?: boolean;
  label?: string;
  fullWidth?: boolean;
}

const VARIANT_STYLES: Record<
  InstacartCTAVariant,
  { bg: string; fg: string; border: string }
> = {
  // Dark — used as the primary CTA. Honey gold on near-black for contrast.
  dark:  { bg: "#1A1A1A", fg: "#F2B233", border: "none" },
  // Light — honey cream.
  light: { bg: "#F2B233", fg: "#1A1A1A", border: "0.5px solid #E0A52A" },
  // White — outlined.
  white: { bg: "#FFFFFF", fg: "#1A1A1A", border: "0.5px solid #E8E9EB" },
};

export const InstacartCTAButton = React.forwardRef<
  HTMLButtonElement,
  InstacartCTAButtonProps
>(
  (
    {
      variant = "dark",
      loading = false,
      showExternalIcon = false,
      label = "Shop at Kroger",
      fullWidth = false,
      className,
      disabled,
      style,
      ...props
    },
    ref,
  ) => {
    const v = VARIANT_STYLES[variant];
    const base: React.CSSProperties = {
      height: 46,
      borderRadius: 9999,
      paddingLeft: 22,
      paddingRight: 22,
      backgroundColor: v.bg,
      color: v.fg,
      border: v.border,
      fontFamily:
        '"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontWeight: 700,
      fontSize: 15,
      lineHeight: 1,
      letterSpacing: "-0.01em",
      display: "inline-flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      transition: "opacity 150ms ease, transform 150ms ease",
      cursor: disabled || loading ? "not-allowed" : "pointer",
      opacity: disabled || loading ? 0.7 : 1,
      width: fullWidth ? "100%" : "auto",
    };

    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        aria-label={label}
        className={cn("hive-grocery-cta", className)}
        style={{ ...base, ...style }}
        {...props}
      >
        {loading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <ShoppingCart size={18} strokeWidth={2.4} />
        )}
        <span>{loading ? "Working…" : label}</span>
        {showExternalIcon && !loading && (
          <ExternalLink size={14} strokeWidth={2.5} />
        )}
      </button>
    );
  },
);
InstacartCTAButton.displayName = "InstacartCTAButton";

/**
 * Legacy disclosure component. Kept for backwards compatibility; the
 * Instacart-specific affiliate copy was removed.
 */
export function InstacartDisclosure({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "text-[11px] leading-relaxed text-muted-foreground text-center px-2",
        className,
      )}
    >
      Prices are planning estimates. Final pricing and availability are
      confirmed at your store at checkout.
    </p>
  );
}
