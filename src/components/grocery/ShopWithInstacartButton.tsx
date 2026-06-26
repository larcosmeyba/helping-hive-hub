import * as React from "react";
import { Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Instacart CTA — built EXACTLY to the Instacart Developer Platform
 * brand spec (do not restyle without re-review):
 *
 *  - Height: 46px
 *  - Padding: 16px vertical, 18px horizontal
 *  - Background: #003D29
 *  - Foreground text: #FAF1E5
 *  - Approved copy: "Shop ingredients" or "Shop on Instacart" (A/B tested)
 *  - Trailing external-link glyph (22px)
 *  - Fully rounded pill, no stroke
 */
interface Props
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  loading?: boolean;
  fullWidth?: boolean;
  /** Approved copy only: "Shop ingredients" (default) or "Shop on Instacart". */
  label?: "Shop ingredients" | "Shop on Instacart";
}

export const ShopWithInstacartButton = React.forwardRef<HTMLButtonElement, Props>(
  ({ loading = false, fullWidth = false, label = "Shop ingredients", className, disabled, style, ...rest }, ref) => {
    const base: React.CSSProperties = {
      height: 46,
      borderRadius: 9999,
      paddingLeft: 18,
      paddingRight: 18,
      paddingTop: 16,
      paddingBottom: 16,
      backgroundColor: "#003D29",
      color: "#FAF1E5",
      border: "none",
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
      transition: "opacity 150ms ease",
      cursor: disabled || loading ? "not-allowed" : "pointer",
      opacity: disabled || loading ? 0.7 : 1,
      width: fullWidth ? "100%" : "auto",
    };
    return (
      <button
        ref={ref}
        type="button"
        disabled={disabled || loading}
        aria-label={`${label} on Instacart (opens in a new tab)`}
        className={cn("instacart-cta", className)}
        style={{ ...base, ...style }}
        {...rest}
      >
        <span>{loading ? "Opening Instacart…" : label}</span>
        {loading ? (
          <Loader2 className="animate-spin" size={16} aria-hidden="true" />
        ) : (
          <ExternalLink size={16} strokeWidth={2.25} aria-hidden="true" />
        )}
      </button>
    );
  },
);
ShopWithInstacartButton.displayName = "ShopWithInstacartButton";


