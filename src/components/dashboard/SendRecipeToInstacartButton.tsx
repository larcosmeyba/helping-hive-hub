import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { InstacartCTAButton, type InstacartCTAVariant } from "@/components/instacart/InstacartCTAButton";
import { openInstacartExternal } from "@/lib/openInstacartExternal";
import { parseIngredients } from "@/lib/parseIngredient";

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

const RALPHS_INSTACART_URL = "https://www.instacart.com/store/ralphs/storefront";

export function SendRecipeToInstacartButton({
  title,
  ingredients,
  className,
  variant = "light",
  label = "Shop ingredients",
  fullWidth = false,
  showExternalIcon = false,
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
      openInstacartExternal(RALPHS_INSTACART_URL);
      void trackEvent("instacart_recipe_success", { itemCount: parsed.length });
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
