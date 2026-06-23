import * as React from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * "Shop with Instacart" CTA — built to match Instacart Developer Platform
 * brand guidelines (approved wording + carrot mark, minimum 46px tall,
 * black-on-white with the orange carrot). Do NOT restyle without re-review.
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
  ({ loading = false, fullWidth = true, label = "Shop with Instacart", className, disabled, style, ...rest }, ref) => {
    const base: React.CSSProperties = {
      height: 46,
      borderRadius: 9999,
      paddingLeft: 22,
      paddingRight: 22,
      backgroundColor: "#000000",
      color: "#FFFFFF",
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
        {loading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          // Instacart carrot mark (orange). Inline SVG so we don't ship a
          // raster asset; shape matches Instacart's official carrot logo.
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 2c.7 0 1.4.3 1.9.8.5.5.8 1.2.8 1.9 0 .4-.1.8-.2 1.1 1.5.4 2.7 1.6 3.1 3.1.3-.1.7-.2 1.1-.2.7 0 1.4.3 1.9.8.5.5.8 1.2.8 1.9 0 .7-.3 1.4-.8 1.9l-9.1 9.1c-.6.6-1.4 1-2.3 1.1L4 22.7c-.4 0-.7-.3-.7-.7l.2-5.2c.1-.9.4-1.7 1.1-2.3l9.1-9.1c.5-.5 1.2-.8 1.9-.8.4 0 .8.1 1.1.2-.4-1.5-1.6-2.7-3.1-3.1.1-.3.2-.7.2-1.1 0-.7-.3-1.4-.8-1.9C13.4 2.3 12.7 2 12 2z"
              fill="#FF7009"
            />
          </svg>
        )}
        <span>{loading ? "Opening Instacart…" : label}</span>
      </button>
    );
  },
);
ShopWithInstacartButton.displayName = "ShopWithInstacartButton";
