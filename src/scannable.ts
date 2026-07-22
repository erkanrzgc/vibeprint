const SCANNABLE_PROTOCOLS = new Set(['http:', 'https:']);
const BLOCKED_HOSTNAMES = new Set(['chromewebstore.google.com', 'chrome.google.com']);

/**
 * Fast pre-check for pages `chrome.scripting.executeScript` can realistically inject into.
 * This is a best-effort filter, not a guarantee — the actual executeScript call is still
 * wrapped in a try/catch as a defensive backstop for cases this misses.
 */
export function isScannableUrl(url: string | undefined): boolean {
  if (!url) return false;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (!SCANNABLE_PROTOCOLS.has(parsed.protocol)) return false;
  if (BLOCKED_HOSTNAMES.has(parsed.hostname)) return false;

  return true;
}
