import { Capacitor } from "@capacitor/core";

/**
 * Open an Instacart landing-page URL externally.
 *
 * Web: callers should `preopenExternalWindow()` synchronously inside the
 * click handler and pass the returned handle here, so the navigation is
 * still attributed to the user gesture (avoids popup blockers when the
 * URL only arrives after an async edge-function call).
 *
 * Native (Capacitor): top-level navigation to an http(s) URL is routed
 * by the webview to the OS — opens the Instacart app if installed,
 * otherwise the system browser.
 */
export function openInstacartExternal(url: string, preopened?: Window | null) {
  if (!url) return;
  // eslint-disable-next-line no-console
  console.info("[Instacart] Opening external landing page:", url);

  try {
    if (Capacitor.isNativePlatform()) {
      if (preopened) {
        try { preopened.close(); } catch { /* noop */ }
      }
      window.location.href = url;
      return;
    }
  } catch {
    /* fall through */
  }

  // Web: reuse the pre-opened window from the click gesture if available.
  if (preopened && !preopened.closed) {
    try {
      preopened.location.href = url;
      preopened.focus?.();
      return;
    } catch {
      /* fall through to fallback strategies */
    }
  }

  // Fallback 1: synthesized anchor click.
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener,noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Fallback 2: same-tab redirect — guarantees the user reaches Instacart
  // even if popups are blocked.
  setTimeout(() => {
    try {
      const opened = window.open(url, "_blank", "noopener,noreferrer");
      if (!opened) window.location.href = url;
    } catch {
      window.location.href = url;
    }
  }, 100);
}

/**
 * Synchronously open a blank window during a click handler so a later
 * async navigation is still treated as user-initiated by popup blockers.
 * Returns null on native or if the browser blocked the popup.
 */
export function preopenExternalWindow(): Window | null {
  try {
    if (Capacitor.isNativePlatform()) return null;
    const w = window.open("about:blank", "_blank", "noopener,noreferrer");
    if (w) {
      try {
        w.document.write(
          '<!doctype html><title>Opening Instacart…</title>' +
            '<style>body{font-family:system-ui;padding:32px;color:#333;text-align:center}</style>' +
            '<p>Opening Instacart…</p>',
        );
      } catch { /* cross-origin write may fail, fine */ }
    }
    return w;
  } catch {
    return null;
  }
}
