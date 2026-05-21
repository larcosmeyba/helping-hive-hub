import * as React from "react";
import { Loader2, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Instacart-branded CTA, built to Instacart's Developer Platform brand specs.
 *
 * Specs (per Instacart final review):
 *   Height 46px, pill radius, dynamic width.
 *   Light: bg #FAF1E5, text #003D29, 0.5px #EFE9E1 border.
 *   Dark : bg #003D29, text #FAF1E5, no border.
 *   Logo : 22px full-color Instacart carrot mark (#FF7009 + #0AAD0A).
 *   Padding: 18px horizontal, 16px vertical (effectively contained by 46px height).
 *   Approved copy: "Shop on Instacart" (preferred) or "Shop ingredients".
 *
 * The CTA always opens the Instacart landing page in an external browser
 * (Capacitor's webview defers http(s) `_blank` opens to the system browser
 * on both iOS and Android — never embedded).
 */

export type InstacartCTAVariant = "light" | "dark";

interface InstacartCTAButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: InstacartCTAVariant;
  loading?: boolean;
  showExternalIcon?: boolean;
  label?: "Shop on Instacart" | "Shop ingredients" | string;
  fullWidth?: boolean;
}

function InstacartCarrot({ className }: { className?: string }) {
  // Simplified full-color Instacart carrot mark.
  // Body #FF7009, leaves #0AAD0A. 22px square.
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      aria-hidden="true"
      className={className}
    >
      {/* leaves */}
      <path
        d="M12 5.2c-.9-1.7-2.7-2.7-4.5-2.5.2 1.8 1.4 3.4 3.1 4.1.1.05.2.08.3.1.4-.6.7-1.1 1.1-1.7Z"
        fill="#0AAD0A"
      />
      <path
        d="M12 5.2c.9-1.7 2.7-2.7 4.5-2.5-.2 1.8-1.4 3.4-3.1 4.1-.1.05-.2.08-.3.1-.4-.6-.7-1.1-1.1-1.7Z"
        fill="#0AAD0A"
      />
      {/* carrot body */}
      <path
        d="M12 6.5c-2.6 0-5 1.7-6 4.2-1.3 3.3.4 7.4 3.6 9.4 1.5.9 3.3.9 4.8 0 3.2-2 4.9-6.1 3.6-9.4-1-2.5-3.4-4.2-6-4.2Zm-1.6 4.2a.7.7 0 1 1 0 1.4.7.7 0 0 1 0-1.4Zm3.2 2a.7.7 0 1 1 0 1.4.7.7 0 0 1 0-1.4Zm-2 2.4a.7.7 0 1 1 0 1.4.7.7 0 0 1 0-1.4Z"
        fill="#FF7009"
      />
    </svg>
  );
}

export const InstacartCTAButton = React.forwardRef<
  HTMLButtonElement,
  InstacartCTAButtonProps
>(
  (
    {
      variant = "light",
      loading = false,
      showExternalIcon = false,
      label = "Shop on Instacart",
      fullWidth = false,
      className,
      disabled,
      style,
      ...props
    },
    ref,
  ) => {
    const isDark = variant === "dark";
    const base: React.CSSProperties = {
      height: 46,
      borderRadius: 9999,
      paddingLeft: 18,
      paddingRight: 18,
      backgroundColor: isDark ? "#003D29" : "#FAF1E5",
      color: isDark ? "#FAF1E5" : "#003D29",
      border: isDark ? "none" : "0.5px solid #EFE9E1",
      fontFamily:
        '"SF Pro Text", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontWeight: 600,
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
          <InstacartCarrot />
        )}
        <span>{loading ? "Opening Instacart…" : label}</span>
        {showExternalIcon && !loading && (
          <ExternalLink size={14} strokeWidth={2.25} style={{ opacity: 0.7 }} />
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
