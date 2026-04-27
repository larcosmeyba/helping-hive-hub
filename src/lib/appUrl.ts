// Centralized app URL helper.
// Used by auth flows (signup confirmation, password reset) so we never trust
// `window.location.origin` blindly. The list mirrors the URLs configured in
// the Supabase Auth → URL Configuration → Additional Redirect URLs.
//
// At runtime we pick the URL that matches the current origin if it's in the
// allowlist, otherwise we fall back to the canonical production URL.

const ALLOWED_ORIGINS = [
  "https://helpthehive.com",
  "https://www.helpthehive.com",
  "https://helping-hive-hub.lovable.app",
  "https://id-preview--bf8fd03f-0e47-4e05-b2a3-0c914e6bd586.lovable.app",
  "http://localhost",
  "http://localhost:3000",
  "http://localhost:5173",
  "http://localhost:8080",
];

const PRIMARY_URL = "https://helpthehive.com";

export function getAppUrl(): string {
  if (typeof window === "undefined") return PRIMARY_URL;
  const origin = window.location.origin;
  // Strict allowlist only — no wildcard *.lovable.app match. Any new preview
  // origin must be added explicitly to ALLOWED_ORIGINS to prevent phishing
  // pages on attacker-controlled lovable.app subdomains from passing CORS/redirect checks.
  if (ALLOWED_ORIGINS.includes(origin)) return origin;
  return PRIMARY_URL;
}

export function getRedirectUrl(path: string = "/"): string {
  const base = getAppUrl();
  return path.startsWith("/") ? `${base}${path}` : `${base}/${path}`;
}
