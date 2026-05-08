// Image policy: only show a photo when the meal has a server-verified image.
// No keyword-matching, no random Unsplash photos, no fruit-bowl placeholder.
// Unverified meals render the <MealImage> component with a lucide icon tile.

import type { MealPlanMeal } from "@/types/mealPlan";

/**
 * Returns a verified image URL or null. A meal must explicitly carry
 * `imageVerified: true` AND a non-empty `imageUrl` for a photo to render.
 */
export function getVerifiedMealImage(
  meal: Pick<MealPlanMeal, "imageUrl" | "imageVerified">
): string | null {
  if (meal.imageVerified && meal.imageUrl && meal.imageUrl.trim().length > 0) {
    return meal.imageUrl;
  }
  return null;
}
