import { Capacitor } from "@capacitor/core";

/**
 * Open an Instacart landing-page URL in the user's external browser / Instacart app.
 *
 * Per Instacart's production review, the generated `products_link_url` must
 * open OUTSIDE the Help The Hive shell (system browser or Instacart app) —
 * never inside the in-app webview.
 *
 * Strategy:
 *  - Native (Capacitor iOS/Android): assign `window.location.href`, which the
 *    Capacitor webview routes to the system handler (Instacart app deep link
 *    if installed, otherwise Safari / Chrome).
 *  - Web: synthesize a real `<a target="_blank" rel="noopener">` click so
 *    browsers treat it as a user-initiated navigation (avoids popup blockers).
 */
export function openInstacartExternal(url: string) {
  if (!url) return;
  // eslint-disable-next-line no-console
  console.info("[Instacart] Opening external landing page:", url);

  try {
    if (Capacitor.isNativePlatform()) {
      // Capacitor routes top-level navigations to http(s) URLs to the OS,
      // which opens the Instacart app (if installed) or the system browser.
      window.location.href = url;
      return;
    }
  } catch {
    // fall through to web behavior
  }

  // Web: trigger a real anchor click in the same tick as the user gesture.
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener,noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Fallback in case the synthesized click was blocked.
  setTimeout(() => {
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      /* noop */
    }
  }, 50);
}
