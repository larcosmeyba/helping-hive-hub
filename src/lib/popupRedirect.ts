/**
 * Safari/iOS popup-blocker workaround: open a blank window SYNCHRONOUSLY in
 * the user-gesture handler, then redirect it once the async URL is ready.
 *
 * Usage:
 *   const w = openPendingWindow();
 *   try {
 *     const url = await fetchUrl();
 *     redirectPendingWindow(w, url);
 *   } catch (e) {
 *     w?.close();
 *     throw e;
 *   }
 */
export type PendingWindow = Window | null;

export function openPendingWindow(): PendingWindow {
  try {
    // Do NOT pass `noopener` here. Browsers intentionally return `null` for
    // noopener windows, which means the async Instacart URL cannot be assigned
    // later and users are left on about:blank. We null the opener immediately
    // after opening instead, keeping the handle long enough to redirect.
    const pending = window.open("about:blank", "_blank");
    if (pending) {
      try {
        pending.opener = null;
      } catch {
        // Some browsers may block this assignment; redirect still matters more
        // than leaving the shopper stranded on a blank popup.
      }
    }
    return pending;
  } catch {
    return null;
  }
}

export function redirectPendingWindow(w: PendingWindow, url: string): void {
  if (w && !w.closed) {
    try {
      w.location.replace(url);
      return;
    } catch {
      // fallthrough
    }
  }
  // Fallback: programmatic anchor click (works in most browsers when
  // window.open returned null because the gesture chain was broken).
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  document.body.appendChild(a);
  a.click();
  a.remove();
}
