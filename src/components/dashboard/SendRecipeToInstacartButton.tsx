import { useState } from "react";
import { Loader2, ChefHat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { parseIngredients } from "@/lib/parseIngredient";

interface Props {
  title: string;
  ingredients: string[];
  instructions: string[];
  imageUrl?: string;
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline";
  label?: string;
  partnerLinkbackUrl?: string;
}

/**
 * Sends a recipe to Instacart's dedicated /products/recipe endpoint, which
 * returns a full recipe page on Instacart Marketplace (image, instructions,
 * store selection, pantry items). Different from SendToInstacartButton which
 * builds a flat shopping list.
 */
export function SendRecipeToInstacartButton({
  title,
  ingredients,
  instructions,
  imageUrl,
  className,
  size = "default",
  variant = "default",
  label = "Shop this recipe on Instacart",
  partnerLinkbackUrl,
}: Props) {
  const linkback =
    partnerLinkbackUrl ??
    (typeof window !== "undefined"
      ? `${window.location.origin}/dashboard/grocery?from=instacart`
      : "https://helpthehive.com/dashboard/grocery?from=instacart");
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
    void trackEvent("instacart_recipe_clicked", { itemCount: parsed.length });
    try {
      const { data, error } = await supabase.functions.invoke("instacart-create-list", {
        body: {
          title,
          image_url: imageUrl,
          link_type: "recipe",
          ingredients: parsed,
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
      void trackEvent("instacart_recipe_success", { itemCount: parsed.length });
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      const raw = err instanceof Error ? err.message : "Failed to create Instacart recipe link";
      const notConfigured = /INSTACART_API_KEY not configured|not configured/i.test(raw);
      void trackEvent("instacart_recipe_error", {
        reason: notConfigured ? "not_configured" : "api_error",
      });
      toast({
        title: notConfigured ? "Instacart checkout coming soon" : "Couldn't open recipe on Instacart",
        description: notConfigured
          ? "We're finalizing our Instacart partnership. Your recipe is saved — you'll be able to shop it in one tap very soon."
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
      disabled={loading || !ingredients.length}
      size={size}
      variant={variant}
      className={className}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
      ) : (
        <ChefHat className="w-4 h-4 mr-2" />
      )}
      {loading ? "Opening recipe…" : label}
    </Button>
  );
}
