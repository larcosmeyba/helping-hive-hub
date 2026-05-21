import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { InstacartCTAButton, type InstacartCTAVariant } from "@/components/instacart/InstacartCTAButton";
import { openInstacartExternal } from "@/lib/openInstacartExternal";

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
  label?: "Shop on Instacart" | "Shop ingredients";
  partnerLinkbackUrl?: string;
  fullWidth?: boolean;
  showExternalIcon?: boolean;
  onLinkGenerated?: (url: string) => void;
}

export function SendToInstacartButton({
  title,
  lineItems,
  imageUrl,
  linkType = "shopping_list",
  instructions,
  className,
  variant = "light",
  label = "Shop on Instacart",
  partnerLinkbackUrl,
  fullWidth = false,
  showExternalIcon = false,
}: Props) {
  const linkback =
    partnerLinkbackUrl ??
    (typeof window !== "undefined"
      ? `${window.location.origin}/dashboard/grocery?from=instacart`
      : "https://helpthehive.com/dashboard/grocery?from=instacart");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClick = async () => {
    if (!lineItems.length) {
      toast({ title: "Nothing to send", description: "Add ingredients first.", variant: "destructive" });
      return;
    }
    setLoading(true);
    void trackEvent("instacart_send_clicked", { itemCount: lineItems.length, linkType });
    try {
      const { data, error } = await supabase.functions.invoke("instacart-create-list", {
        body: {
          title,
          image_url: imageUrl,
          link_type: linkType,
          line_items: lineItems,
          instructions,
          landing_page_configuration: {
            partner_linkback_url: linkback,
            enable_pantry_items: true,
          },
        },
      });
      if (error) throw error;
      const url = (data as { products_link_url?: string })?.products_link_url;
      if (!url) throw new Error("No link returned from Instacart");
      void trackEvent("instacart_send_success", { itemCount: lineItems.length });
      openInstacartExternal(url);
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Failed to create Instacart link";
      const notConfigured = /INSTACART_API_KEY not configured|not configured/i.test(raw);
      void trackEvent("instacart_send_error", { reason: notConfigured ? "not_configured" : "api_error" });
      toast({
        title: notConfigured ? "Instacart checkout coming soon" : "Couldn't open Instacart",
        description: notConfigured
          ? "We're finalizing our Instacart partnership. Your list is saved — you'll be able to shop it in one tap very soon."
          : raw,
        variant: notConfigured ? "default" : "destructive",
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
