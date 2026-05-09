// Image policy: render the meal's imageUrl when present. If the generator
// did not supply a photo, render a flat honey-cream tile with a lucide
// ChefHat icon (handled by <MealImage>). Never keyword-match stock photos.

import type { MealPlanMeal } from "@/types/mealPlan";

/**
 * Returns an image URL when the meal has one, otherwise null.
 * Verified images are preferred but unverified URLs from the generator
 * are still rendered so users see real food photography on their cards.
 */
export function getVerifiedMealImage(
  meal: Pick<MealPlanMeal, "imageUrl" | "imageVerified">
): string | null {
  if (meal.imageUrl && meal.imageUrl.trim().length > 0) {
    return meal.imageUrl;
  }
  return null;
}
