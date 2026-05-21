/**
 * Open an Instacart landing-page URL in the user's external browser.
 *
 * Capacitor's iOS/Android webview routes http(s) `window.open(_, '_blank')`
 * calls to the system browser by default (Safari / Chrome), so the Instacart
 * page never renders inside the Help The Hive shell — required by Instacart's
 * production review.
 *
 * The URL is also logged to the console so it can be copied during the
 * screen-recorded demo submission.
 */
export function openInstacartExternal(url: string) {
  if (!url) return;
  // eslint-disable-next-line no-console
  console.info("[Instacart] Opening external landing page:", url);
  window.open(url, "_blank", "noopener,noreferrer");
}
