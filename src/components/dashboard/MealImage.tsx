import { useState } from "react";
import { ChefHat } from "lucide-react";
import { getVerifiedMealImage } from "@/utils/mealImages";
import type { MealPlanMeal } from "@/types/mealPlan";

interface Props {
  meal: Pick<MealPlanMeal, "name" | "imageUrl" | "imageVerified">;
  className?: string;
  imgClassName?: string;
}

/**
 * Renders a verified meal photo when available. Otherwise renders a flat
 * honey-cream tile with a ChefHat icon — never a random food photo.
 */
export function MealImage({ meal, className = "", imgClassName = "" }: Props) {
  const initialSrc = getVerifiedMealImage(meal);
  const [src, setSrc] = useState<string | null>(initialSrc);

  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-[hsl(43_100%_96%)] ${className}`}
        aria-label={meal.name}
      >
        <ChefHat className="w-1/3 h-1/3 max-w-12 max-h-12 text-primary/60" strokeWidth={1.5} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={meal.name}
      className={imgClassName || className}
      loading="lazy"
      onError={() => setSrc(null)}
    />
  );
}
