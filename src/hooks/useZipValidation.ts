import { useEffect, useRef, useState } from "react";

export type ZipStatus = "empty" | "incomplete" | "checking" | "valid" | "invalid";

export interface ZipValidationResult {
  status: ZipStatus;
  message: string;
  city?: string;
  state?: string;
  /** True only when status === "valid" — safe to submit. */
  isValid: boolean;
}

// Cache successful lookups for the session
const cache = new Map<string, { city: string; state: string }>();

/**
 * Live ZIP validation against Zippopotam.us (free, no key, all US ZIPs).
 * Debounces 350ms and only hits the network when length === 5.
 */
export function useZipValidation(zip: string): ZipValidationResult {
  const [result, setResult] = useState<ZipValidationResult>({
    status: zip.length === 0 ? "empty" : "incomplete",
    message: "",
    isValid: false,
  });
  const reqId = useRef(0);

  useEffect(() => {
    const trimmed = zip.trim();

    if (trimmed.length === 0) {
      setResult({ status: "empty", message: "", isValid: false });
      return;
    }
    if (!/^\d+$/.test(trimmed)) {
      setResult({ status: "invalid", message: "ZIP must be digits only", isValid: false });
      return;
    }
    if (trimmed.length < 5) {
      setResult({ status: "incomplete", message: `${5 - trimmed.length} more digit${5 - trimmed.length === 1 ? "" : "s"}`, isValid: false });
      return;
    }
    if (trimmed.length > 5) {
      setResult({ status: "invalid", message: "ZIP must be exactly 5 digits", isValid: false });
      return;
    }

    // Cached?
    const cached = cache.get(trimmed);
    if (cached) {
      setResult({
        status: "valid",
        message: `${cached.city}, ${cached.state}`,
        city: cached.city,
        state: cached.state,
        isValid: true,
      });
      return;
    }

    setResult({ status: "checking", message: "Checking…", isValid: false });
    const myId = ++reqId.current;
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`https://api.zippopotam.us/us/${trimmed}`);
        if (myId !== reqId.current) return; // stale
        if (!r.ok) {
          setResult({ status: "invalid", message: "Not a valid US ZIP code", isValid: false });
          return;
        }
        const j = await r.json();
        const place = j?.places?.[0];
        if (!place) {
          setResult({ status: "invalid", message: "Not a valid US ZIP code", isValid: false });
          return;
        }
        const city = place["place name"] as string;
        const state = place["state abbreviation"] as string;
        cache.set(trimmed, { city, state });
        setResult({ status: "valid", message: `${city}, ${state}`, city, state, isValid: true });
      } catch {
        if (myId !== reqId.current) return;
        // Network failure — accept format but warn
        setResult({
          status: "valid",
          message: "Couldn't verify (offline) — saved as entered",
          isValid: true,
        });
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [zip]);

  return result;
}
