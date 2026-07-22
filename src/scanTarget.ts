export interface MinimalTab {
  id?: number;
  url?: string;
  active?: boolean;
}

/**
 * Picks the tab to scan out of the current window's tabs, excluding the extension's own
 * popup URL and any tab with no visible `url` (Chrome strips `url`/`title` from tabs the
 * extension lacks permission to see into, which in some environments includes its own
 * popup tab). A real browser-action popup never appears in `tabs.query` results at all (it
 * floats above the window rather than occupying a tab), but Playwright's e2e test has no
 * way to open a true floating popup — it opens popup.html as a regular tab, which would
 * otherwise be mistaken for "the page to scan". Filtering it out here keeps this correct in
 * both real usage and the test.
 */
export function selectScanTargetTab(
  tabs: MinimalTab[],
  extensionPopupUrl: string,
): MinimalTab | undefined {
  const candidates = tabs.filter((tab) => tab.url && tab.url !== extensionPopupUrl);
  return candidates.find((tab) => tab.active) ?? candidates[0];
}
