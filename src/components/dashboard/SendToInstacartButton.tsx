import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

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

// Default Instacart landing-page linkback that returns the user to Help The Hive
// after they finish on Instacart (per Instacart's partner-linkback spec).
const DEFAULT_PARTNER_LINKBACK_URL = "https://helpthehive.com/dashboard/grocery-list?from=instacart";

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
        environment: "development",
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
        console.error("[Instacart] No products_link_url returned:", error);
        toast({
          title: "Couldn't reach Instacart",
          description: "Please try again in a moment.",
          variant: "destructive",
        });
        void trackEvent("instacart_send_error", { itemCount: lineItems.length, error: String(error ?? "no_url") });
      } else {
        // Log generated landing URL + payload for Instacart's ingredient-parsing review.
        void trackEvent("instacart_link_generated", {
          products_link_url: landingUrl,
          link_type: linkType,
          title,
          itemCount: lineItems.length,
          line_items: JSON.parse(JSON.stringify(lineItems)),
        });
        // Open the generated Instacart URL externally immediately — no
        // intermediate toast/status. Required for Instacart's review demo.
        openInstacartExternal(landingUrl);
        toast({
          title: "Opening Instacart…",
          description: "Your cart is loading in Instacart.",
          duration: 4000,
        });
        void trackEvent("instacart_send_success", { itemCount: lineItems.length, products_link_url: landingUrl });
      }
    } catch (err) {
      console.error("[Instacart] Send failed:", err);
      toast({
        title: "Couldn't reach Instacart",
        description: "Please try again in a moment.",
        variant: "destructive",
      });
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
