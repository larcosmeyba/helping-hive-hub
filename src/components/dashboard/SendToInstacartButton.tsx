import { useState } from "react";
import { Loader2, ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
    try {
      const { data, error } = await supabase.functions.invoke("instacart-create-list", {
        body: {
          title,
          image_url: imageUrl,
          link_type: linkType,
          line_items: lineItems,
          instructions,
          landing_page_configuration: {
            partner_linkback_url: partnerLinkbackUrl,
            enable_pantry_items: true,
          },
        },
      });
      if (error) throw error;
      const url = (data as { products_link_url?: string })?.products_link_url;
      if (!url) throw new Error("No link returned from Instacart");
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create Instacart link";
      toast({ title: "Couldn't send to Instacart", description: msg, variant: "destructive" });
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
