import { Capacitor } from "@capacitor/core";

/**
 * Synchronously open a blank window during a click handler so a later
 * async navigation is still treated as user-initiated by popup blockers.
 * Returns null on native or if the browser blocked the popup.
 *
 * IMPORTANT: do NOT pass "noopener" here — that causes window.open to
 * return null, so we can't redirect the tab later.
 */
export function preopenExternalWindow(): Window | null {
  try {
    if (Capacitor.isNativePlatform()) return null;
    const w = window.open("about:blank", "_blank");
    if (w) {
      try {
        w.document.write(
          '<!doctype html><title>Opening Instacart…</title>' +
            '<style>body{font-family:system-ui;padding:32px;color:#333;text-align:center}</style>' +
            '<p>Opening Instacart…</p>',
        );
      } catch {
        /* cross-origin write may fail, fine */
      }
    } else {
      console.warn("[Instacart] preopenExternalWindow: popup blocked (window.open returned null)");
    }
    return w;
  } catch (err) {
    console.warn("[Instacart] preopenExternalWindow error:", err);
    return null;
  }
}

/**
 * Open an Instacart landing-page URL externally.
 *
 * Web: redirects the pre-opened window (from preopenExternalWindow) to the
 * generated URL. Falls back to a synthesized anchor click, then to a
 * same-tab redirect if nothing else worked.
 *
 * Native (Capacitor): top-level navigation routes through the OS — opens
 * the Instacart app if installed, otherwise the system browser.
 */
export function openInstacartExternal(url: string, preopened?: Window | null) {
  if (!url) {
    console.warn("[Instacart] openInstacartExternal called with empty url");
    return;
  }
  console.info("[Instacart] Redirecting to landing page:", url);

  // Native: top-level navigation — webview hands off to OS.
  try {
    if (Capacitor.isNativePlatform()) {
      if (preopened && !preopened.closed) {
        try { preopened.close(); } catch { /* noop */ }
      }
      window.location.href = url;
      return;
    }
  } catch {
    /* fall through */
  }

  // Preferred path: redirect the window opened synchronously on click.
  if (preopened && !preopened.closed) {
    try {
      preopened.location.href = url;
      try { preopened.focus?.(); } catch { /* noop */ }
      console.info("[Instacart] Redirected pre-opened tab to URL");
      return;
    } catch (err) {
      console.error("[Instacart] Failed to set preopened.location.href:", err);
      try { preopened.close(); } catch { /* noop */ }
    }
  }

  // Fallback 1: synthesized anchor click in a NEW tab so Help The Hive
  // stays open in the original tab (required for the review demo's
  // "back to Help The Hive" return path).
  try {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener,noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
    console.info("[Instacart] Fallback: synthesized anchor click (new tab)");
    return;
  } catch (err) {
    console.error("[Instacart] Anchor click fallback failed:", err);
  }

  // Fallback 2: window.open in a new tab. If the browser blocks it we
  // deliberately do NOT redirect the current tab — Help The Hive must stay
  // open so the user can return to it. The caller's toast covers the
  // (rare) blocked case.
  try {
    const opened = window.open(url, "_blank", "noopener,noreferrer");
    if (!opened) {
      console.warn(
        "[Instacart] window.open blocked — keeping Help The Hive tab intact (no same-tab redirect).",
      );
    }
  } catch (err) {
    console.error("[Instacart] window.open fallback failed:", err);
  }
}
