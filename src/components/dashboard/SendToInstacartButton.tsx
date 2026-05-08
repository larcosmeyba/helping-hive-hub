import { useState } from "react";
import { Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";

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
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline";
  label?: string;
  partnerLinkbackUrl?: string;
}

export function SendToInstacartButton({
  title,
  lineItems,
  imageUrl,
  linkType = "shopping_list",
  instructions,
  className,
  size = "default",
  variant = "default",
  label = "Send to Instacart",
  partnerLinkbackUrl,
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
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Failed to create Instacart link";
      const notConfigured = /INSTACART_API_KEY not configured|not configured/i.test(raw);
      void trackEvent("instacart_send_error", { reason: notConfigured ? "not_configured" : "api_error" });
      toast({
        title: notConfigured ? "Instacart checkout coming soon" : "Couldn't send to Instacart",
        description: notConfigured
          ? "We're finalizing our Instacart partnership. Your list is saved — you'll be able to send it in one tap very soon."
          : raw,
        variant: notConfigured ? "default" : "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading || !lineItems.length}
      size={size}
      variant={variant}
      className={className}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <ShoppingBag className="w-4 h-4 mr-2" />
      )}
      {loading ? "Building cart…" : label}
    </Button>
  );
}
