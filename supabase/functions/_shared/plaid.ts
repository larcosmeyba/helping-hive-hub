// Shared Plaid helpers for Help The Hive food budget feature.
// Plaid Transactions only — no investments, identity, income, etc.

export const FOOD_CATEGORIES = [
  "groceries",
  "restaurants",
  "coffee_drinks",
  "food_delivery",
  "instacart",
  "other_food",
] as const;
export type FoodCategory = (typeof FOOD_CATEGORIES)[number];

export function getPlaidConfig() {
  const clientId = Deno.env.get("PLAID_CLIENT_ID");
  const secret = Deno.env.get("PLAID_SECRET");
  const env = (Deno.env.get("PLAID_ENV") ?? "sandbox").toLowerCase();
  if (!clientId || !secret) {
    return null;
  }
  const host =
    env === "production"
      ? "https://production.plaid.com"
      : env === "development"
      ? "https://development.plaid.com"
      : "https://sandbox.plaid.com";
  return { clientId, secret, env, host };
}

export async function plaidFetch(path: string, body: Record<string, unknown>) {
  const cfg = getPlaidConfig();
  if (!cfg) throw new Error("PLAID_NOT_CONFIGURED");
  const res = await fetch(`${cfg.host}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: cfg.clientId, secret: cfg.secret, ...body }),
  });
  const json = await res.json();
  if (!res.ok) {
    throw new Error(`PLAID_ERROR: ${json.error_code ?? res.status} ${json.error_message ?? ""}`);
  }
  return json;
}

// AES-GCM encryption for Plaid access tokens at rest.
async function getKey(): Promise<CryptoKey> {
  const raw = Deno.env.get("PLAID_ENCRYPTION_KEY");
  if (!raw) throw new Error("PLAID_ENCRYPTION_KEY missing");
  // Derive a 32-byte key from arbitrary-length secret via SHA-256.
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptToken(token: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(token)),
  );
  const combined = new Uint8Array(iv.length + ct.length);
  combined.set(iv, 0);
  combined.set(ct, iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function decryptToken(blob: string): Promise<string> {
  const key = await getKey();
  const combined = Uint8Array.from(atob(blob), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ct = combined.slice(12);
  const pt = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ct);
  return new TextDecoder().decode(pt);
}

// Map a Plaid transaction to one of Help The Hive's food categories, or null
// if it isn't food-related and should be discarded.
export function categorizeFoodTransaction(tx: {
  merchant_name?: string | null;
  name?: string | null;
  personal_finance_category?: { primary?: string; detailed?: string } | null;
  category?: string[] | null;
}): FoodCategory | null {
  const merchant = (tx.merchant_name ?? tx.name ?? "").toLowerCase();
  const pfcPrimary = tx.personal_finance_category?.primary?.toUpperCase() ?? "";
  const pfcDetailed = tx.personal_finance_category?.detailed?.toUpperCase() ?? "";
  const legacy = (tx.category ?? []).map((c) => c.toLowerCase());

  // Instacart always wins.
  if (merchant.includes("instacart")) return "instacart";

  // Food delivery
  const delivery = ["doordash", "uber eats", "ubereats", "grubhub", "postmates", "seamless", "caviar", "deliveroo"];
  if (delivery.some((d) => merchant.includes(d))) return "food_delivery";
  if (pfcDetailed.includes("FOOD_AND_DRINK_FAST_FOOD") && delivery.some((d) => merchant.includes(d))) {
    return "food_delivery";
  }

  // Coffee
  const coffee = ["starbucks", "dunkin", "peet", "blue bottle", "philz", "coffee", "cafe"];
  if (pfcDetailed.includes("COFFEE") || coffee.some((c) => merchant.includes(c))) return "coffee_drinks";

  // Groceries
  if (
    pfcDetailed.includes("GROCERIES") ||
    pfcPrimary === "FOOD_AND_DRINK_GROCERIES" ||
    legacy.includes("supermarkets and groceries") ||
    legacy.includes("groceries")
  ) {
    return "groceries";
  }

  // Restaurants
  if (
    pfcPrimary === "FOOD_AND_DRINK" ||
    pfcDetailed.includes("RESTAURANT") ||
    pfcDetailed.includes("FAST_FOOD") ||
    legacy.includes("restaurants") ||
    legacy.includes("food and drink")
  ) {
    return "restaurants";
  }

  // Other obvious food cues
  if (legacy.some((c) => c.includes("food"))) return "other_food";

  return null;
}
