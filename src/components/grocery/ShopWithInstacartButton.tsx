import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Shop with Instacart" CTA — built to match Instacart Developer Platform
 * brand guidelines (approved wording + carrot mark, minimum 46px tall,
 * dark green #003D29 background). Do NOT restyle without re-review.
 *
 * The CTA is purely a handoff — pricing is the Kroger estimate shown above;
 * final price is confirmed inside the Instacart landing page at checkout.
 */
interface Props
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  loading?: boolean;
  fullWidth?: boolean;
  label?: string;
}

export const ShopWithInstacartButton = React.forwardRef<HTMLButtonElement, Props>(
  ({ loading = false, fullWidth = true, label = "Shop ingredients", className, disabled, style, ...rest }, ref) => {
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
      gap: 10,
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
        aria-label={label}
        className={cn("instacart-cta", className)}
        style={{ ...base, ...style }}
        {...rest}
      >
        {loading ? <Loader2 className="animate-spin" size={18} /> : null}
        <span>
          {loading ? "Opening Instacart…" : label} with Instacart<sup style={{ fontSize: 9 }}>®</sup>
        </span>
      </button>
    );
  },
);
ShopWithInstacartButton.displayName = "ShopWithInstacartButton";
