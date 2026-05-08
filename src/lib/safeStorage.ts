/**
 * Safe localStorage wrapper. iOS WKWebView in private mode and some Android
 * variants throw on access. Always returns gracefully.
 */
export function safeGetItem(key: string, fallback: string | null = null): string | null {
  try {
    return localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function safeSetItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // ignore (private mode / quota exceeded)
  }
}

export function safeRemoveItem(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}
