// Image policy: render the meal's imageUrl when present. If the generator
// did not supply a photo, render a flat honey-cream tile with a lucide
// ChefHat icon (handled by <MealImage>). Never keyword-match stock photos.

import type { MealPlanMeal } from "@/types/mealPlan";

/**
 * Returns an image URL when the meal has one, otherwise null.
 * Accepts both camelCase (`imageUrl`) and snake_case (`image_url`)
 * because the meal-plan edge function and stored `plan_data` JSON
 * still emit snake_case keys.
 */
export function getVerifiedMealImage(
  meal: Pick<MealPlanMeal, "imageUrl" | "image_url" | "imageVerified">
): string | null {
  const url = meal.imageUrl ?? meal.image_url;
  if (url && typeof url === "string" && url.trim().length > 0) {
    return url;
  }
  return null;
}
