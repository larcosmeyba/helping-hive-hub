import { useState } from "react";
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
  label?: "Shop on Instacart" | "Shop ingredients" | "Send to Instacart";
  partnerLinkbackUrl?: string;
  fullWidth?: boolean;
  showExternalIcon?: boolean;
}

const RALPHS_INSTACART_URL = "https://www.instacart.com/store/ralphs/storefront";

export function SendToInstacartButton({
  title,
  lineItems,
  className,
  variant = "light",
  label = "Shop on Instacart",
  fullWidth = false,
  showExternalIcon = false,
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
      openInstacartExternal(RALPHS_INSTACART_URL);
      void trackEvent("instacart_send_success", { itemCount: lineItems.length });
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
