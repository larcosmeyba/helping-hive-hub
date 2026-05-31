import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { ToastAction } from "@/components/ui/toast";
import { trackEvent } from "@/lib/analytics";
import { InstacartCTAButton, type InstacartCTAVariant } from "@/components/instacart/InstacartCTAButton";
import { openInstacartExternal } from "@/lib/openInstacartExternal";
import { supabase } from "@/integrations/supabase/client";

export interface InstacartLineItem {
  name: string;
  quantity?: number;
  unit?: string;
  display_text?: string;
}

interface Props {
  title: string;
  lineItems: InstacartLineItem[];
  imageUrl?: string;
  linkType?: "shopping_list" | "recipe";
  instructions?: string[];
  className?: string;
  variant?: InstacartCTAVariant;
  /** Approved Instacart CTA copy. */
  label?: "Shop on Instacart" | "Shop Ingredients" | "Send to Instacart";
  partnerLinkbackUrl?: string;
  fullWidth?: boolean;
  showExternalIcon?: boolean;
}

// Fallback storefront if the IDP call fails for any reason.
const RALPHS_INSTACART_URL = "https://www.instacart.com/store/ralphs/storefront";
// Default Instacart landing-page linkback that returns the user to Help The Hive.
const DEFAULT_PARTNER_LINKBACK_URL = "https://helpthehive.com/dashboard/grocery-list";

export function SendToInstacartButton({
  title,
  lineItems,
  imageUrl,
  linkType = "shopping_list",
  instructions,
  className,
  variant = "dark",
  label = "Shop Ingredients",
  partnerLinkbackUrl = DEFAULT_PARTNER_LINKBACK_URL,
  fullWidth = false,
  showExternalIcon = true,
}: Props) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    if (!lineItems.length) {
      toast({ title: "Nothing to send", description: "Add ingredients first.", variant: "destructive" });
      return;
    }
    setLoading(true);
    void trackEvent("instacart_send_clicked", { itemCount: lineItems.length, title });
    try {
      const payload: Record<string, unknown> = {
        title,
        link_type: linkType,
        line_items: lineItems,
      };
      if (imageUrl) payload.image_url = imageUrl;
      if (instructions?.length) payload.instructions = instructions;
      if (partnerLinkbackUrl) {
        payload.landing_page_configuration = { partner_linkback_url: partnerLinkbackUrl };
      }

      const { data, error } = await supabase.functions.invoke("instacart-create-list", {
        body: payload,
      });

      const landingUrl =
        (data as { products_link_url?: string } | null)?.products_link_url ?? null;

      if (error || !landingUrl) {
        console.error("[Instacart] Falling back to storefront:", error);
        openInstacartExternal(RALPHS_INSTACART_URL);
        void trackEvent("instacart_send_fallback", { itemCount: lineItems.length, error: String(error ?? "no_url") });
      } else {
        // Log generated landing URL + payload for Instacart's ingredient-parsing review.
        void trackEvent("instacart_link_generated", {
          products_link_url: landingUrl,
          link_type: linkType,
          title,
          itemCount: lineItems.length,
          line_items: JSON.parse(JSON.stringify(lineItems)),
        });
        // Copyable toast so the URL can be grabbed during the demo / review.
        toast({
          title: "Instacart link ready",
          description: landingUrl,
          duration: 12000,
          action: (
            <ToastAction
              altText="Copy Instacart link"
              onClick={() => {
                navigator.clipboard?.writeText(landingUrl).catch(() => {});
                toast({ title: "Link copied" });
              }}
            >
              Copy
            </ToastAction>
          ),
        });
        openInstacartExternal(landingUrl);
        void trackEvent("instacart_send_success", { itemCount: lineItems.length, products_link_url: landingUrl });
      }
    } catch (err) {
      console.error("[Instacart] Send failed:", err);
      openInstacartExternal(RALPHS_INSTACART_URL);
    } finally {
      setLoading(false);
    }
  };

  return (
    <InstacartCTAButton
      onClick={handleClick}
      disabled={!lineItems.length}
      loading={loading}
      variant={variant}
      label={label}
      fullWidth={fullWidth}
      showExternalIcon={showExternalIcon}
      className={className}
    />
  );
}
