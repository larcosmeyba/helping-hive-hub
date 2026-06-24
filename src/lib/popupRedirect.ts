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
    return window.open("about:blank", "_blank", "noopener,noreferrer");
  } catch {
    return null;
  }
}

export function redirectPendingWindow(w: PendingWindow, url: string): void {
  if (w && !w.closed) {
    try {
      w.location.href = url;
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
