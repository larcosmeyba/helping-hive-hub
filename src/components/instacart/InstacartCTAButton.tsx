import * as React from "react";
import { Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Instacart-branded CTA, built to Instacart's Developer Platform brand specs.
 *
 * Variants (per Instacart final review):
 *   Dark  (default): bg #003D29, text #FAF1E5, no stroke.
 *   Light          : bg #FAF1E5, text #003D29, 0.5px #EFE9E1 stroke.
 *   White          : bg #FFFFFF, text #000000, 0.5px #E8E9EB stroke.
 *
 * All variants:
 *   Height 46px, pill radius, dynamic width.
 *   Padding: 18px horizontal, 16px vertical (contained by 46px height).
 *   22px full-color Instacart carrot mark (#FF7009 body + #0AAD0A leaves).
 *   Optional external-link icon.
 *   Approved copy: "Shop on Instacart" or "Shop Ingredients".
 *
 * The CTA always opens the Instacart landing page in an external browser
 * (Capacitor's webview defers http(s) `_blank` opens to the system browser).
 */

export type InstacartCTAVariant = "dark" | "light" | "white";

interface InstacartCTAButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: InstacartCTAVariant;
  loading?: boolean;
  showExternalIcon?: boolean;
  label?: "Shop on Instacart" | "Shop Ingredients" | string;
  fullWidth?: boolean;
}

function InstacartCarrot({ size = 22 }: { size?: number }) {
  // Instacart full-color carrot mark — #FF7009 body, #0AAD0A leaves.
  return (
    <svg
      viewBox="0 0 32 32"
      width={size}
      height={size}
      aria-hidden="true"
    >
      {/* leaves */}
      <path
        d="M16 10c-1.6-3-4.8-4.6-8-4 .4 3.2 2.8 5.8 5.9 6.6.2.05.4.08.6.1L16 10z"
        fill="#0AAD0A"
      />
      <path
        d="M16 10c1.6-3 4.8-4.6 8-4-.4 3.2-2.8 5.8-5.9 6.6-.2.05-.4.08-.6.1L16 10z"
        fill="#0AAD0A"
      />
      {/* carrot body */}
      <path
        d="M16 11.5c-3.9 0-7.4 2.6-8.8 6.3-1.8 4.8.7 10.7 5.2 13.5 2.2 1.3 4.9 1.3 7.1 0 4.5-2.8 7-8.7 5.2-13.5-1.4-3.7-4.9-6.3-8.8-6.3zm-2.6 5.9a1 1 0 110 2 1 1 0 010-2zm4.7 2.8a1 1 0 110 2 1 1 0 010-2zm-2.9 3.4a1 1 0 110 2 1 1 0 010-2z"
        fill="#FF7009"
      />
    </svg>
  );
}

const VARIANT_STYLES: Record<
  InstacartCTAVariant,
  { bg: string; fg: string; border: string }
> = {
  dark:  { bg: "#003D29", fg: "#FAF1E5", border: "none" },
  light: { bg: "#FAF1E5", fg: "#003D29", border: "0.5px solid #EFE9E1" },
  white: { bg: "#FFFFFF", fg: "#000000", border: "0.5px solid #E8E9EB" },
};

export const InstacartCTAButton = React.forwardRef<
  HTMLButtonElement,
  InstacartCTAButtonProps
>(
  (
    {
      variant = "dark",
      loading = false,
      showExternalIcon = true,
      label = "Shop Ingredients",
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
      paddingLeft: 18,
      paddingRight: 18,
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
        className={cn("instacart-cta", className)}
        style={{ ...base, ...style }}
        {...props}
      >
        {loading ? (
          <Loader2 className="animate-spin" size={18} />
        ) : (
          <InstacartCarrot size={22} />
        )}
        <span>{loading ? "Opening Instacart…" : label}</span>
        {showExternalIcon && !loading && (
          <ExternalLink size={14} strokeWidth={2.5} />
        )}
      </button>
    );
  },
);
InstacartCTAButton.displayName = "InstacartCTAButton";

/** Required affiliate / responsibility disclosure shown near the CTA. */
export function InstacartDisclosure({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "text-[11px] leading-relaxed text-muted-foreground text-center px-2",
        className,
      )}
    >
      Pricing and availability are shown on Instacart at checkout. Help The Hive
      may earn a small affiliate fee that helps keep the app free.
    </p>
  );
}
