import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { InstacartCTAButton, type InstacartCTAVariant } from "@/components/instacart/InstacartCTAButton";

/**
 * Per-recipe action button. Originally sent ingredients to Instacart; now
 * copies the recipe's ingredient list to the clipboard so the user can paste
 * it into their preferred grocery flow. Prop shape preserved.
 */

interface Props {
  title: string;
  ingredients: string[];
  instructions?: string[];
  imageUrl?: string;
  className?: string;
  variant?: InstacartCTAVariant;
  label?: string;
  fullWidth?: boolean;
  showExternalIcon?: boolean;
  partnerLinkbackUrl?: string;
}

export function SendRecipeToInstacartButton({
  title,
  ingredients,
  className,
  variant = "dark",
  label = "Copy Ingredients",
  fullWidth = false,
  showExternalIcon = false,
}: Props) {
  const { toast } = useToast();

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!ingredients.length) {
      toast({
        title: "No ingredients",
        description: "This recipe has no ingredients to copy.",
        variant: "destructive",
      });
      return;
    }
    const text = `${title}\n\nIngredients:\n${ingredients.map((i) => `• ${i}`).join("\n")}`;
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Ingredients copied",
        description: `${ingredients.length} ingredient${ingredients.length === 1 ? "" : "s"} on the clipboard.`,
      });
      void trackEvent("recipe_ingredients_copied", { itemCount: ingredients.length, title });
    } catch {
      toast({
        title: "Couldn't copy",
        description: "Your browser blocked clipboard access.",
        variant: "destructive",
      });
    }
  };

  return (
    <InstacartCTAButton
      onClick={handleClick}
      disabled={!ingredients.length}
      variant={variant}
      label={label}
      fullWidth={fullWidth}
      showExternalIcon={showExternalIcon}
      className={className}
    />
  );
}
