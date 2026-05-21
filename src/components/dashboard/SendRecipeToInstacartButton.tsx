import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { InstacartCTAButton, type InstacartCTAVariant } from "@/components/instacart/InstacartCTAButton";
import { openInstacartExternal } from "@/lib/openInstacartExternal";
import { parseIngredients } from "@/lib/parseIngredient";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  title: string;
  ingredients: string[];
  instructions: string[];
  imageUrl?: string;
  className?: string;
  variant?: InstacartCTAVariant;
  label?: "Shop on Instacart" | "Shop ingredients";
  fullWidth?: boolean;
  showExternalIcon?: boolean;
  partnerLinkbackUrl?: string;
}

// Fallback storefront if the IDP call fails for any reason.
const RALPHS_INSTACART_URL = "https://www.instacart.com/store/ralphs/storefront";

export function SendRecipeToInstacartButton({
  title,
  ingredients,
  instructions,
  imageUrl,
  className,
  variant = "light",
  label = "Shop ingredients",
  fullWidth = false,
  showExternalIcon = false,
  partnerLinkbackUrl,
}: Props) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const parsed = parseIngredients(ingredients);
    if (!parsed.length) {
      toast({
        title: "No ingredients",
        description: "This recipe has no ingredients to send.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    void trackEvent("instacart_recipe_clicked", { itemCount: parsed.length, title });
    try {
      const payload: Record<string, unknown> = {
        title,
        link_type: "recipe",
        ingredients: parsed.map((p) => ({
          name: p.name,
          display_text: p.display_text,
          measurements: p.quantity && p.unit ? [{ quantity: p.quantity, unit: p.unit }] : undefined,
        })),
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
        console.error("[Instacart] Recipe fallback to storefront:", error);
        openInstacartExternal(RALPHS_INSTACART_URL);
        void trackEvent("instacart_recipe_fallback", { itemCount: parsed.length });
      } else {
        openInstacartExternal(landingUrl);
        void trackEvent("instacart_recipe_success", { itemCount: parsed.length });
      }
    } catch (err) {
      console.error("[Instacart] Recipe send failed:", err);
      openInstacartExternal(RALPHS_INSTACART_URL);
    } finally {
      setLoading(false);
    }
  };

  return (
    <InstacartCTAButton
      onClick={handleClick}
      disabled={!ingredients.length}
      loading={loading}
      variant={variant}
      label={label}
      fullWidth={fullWidth}
      showExternalIcon={showExternalIcon}
      className={className}
    />
  );
}
