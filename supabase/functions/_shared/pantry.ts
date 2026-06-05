// Shared helpers for pantry-related edge functions.
export type Freshness = "good" | "use_soon" | "expiring_today" | "expired" | "low_stock";

export function calcFreshness(expirationDate: string | null, isLowStock?: boolean): Freshness {
  if (expirationDate) {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const exp = new Date(expirationDate); exp.setHours(0, 0, 0, 0);
    const days = Math.floor((exp.getTime() - today.getTime()) / 86400000);
    if (days < 0) return "expired";
    if (days === 0) return "expiring_today";
    if (days <= 3) return "use_soon";
  }
  if (isLowStock) return "low_stock";
  return "good";
}

export function normalize(name: string): string {
  return (name || "").toLowerCase().trim().replace(/\s+/g, " ");
}
