import { describe, expect, it } from 'vitest';
import { selectScanTargetTab } from '../../src/scanTarget';

describe('selectScanTargetTab', () => {
  it("picks the active tab when it is not the extension's own popup", () => {
    const tabs = [
      { id: 1, url: 'https://example.com', active: false },
      { id: 2, url: 'https://other.com', active: true },
    ];

    expect(selectScanTargetTab(tabs, 'chrome-extension://abc/popup.html')).toEqual(tabs[1]);
  });

  it("excludes the extension's own popup url even if it is marked active", () => {
    // This is the case that matters when a popup is opened as a real tab (as Playwright's
    // e2e test must do, since it can't simulate a true floating action-popup) — the popup
    // tab itself would otherwise be mistaken for "the page to scan".
    const tabs = [
      { id: 1, url: 'https://example.com', active: false },
      { id: 2, url: 'chrome-extension://abc/popup.html', active: true },
    ];

    expect(selectScanTargetTab(tabs, 'chrome-extension://abc/popup.html')).toEqual(tabs[0]);
  });

  it('returns undefined when no non-popup tab exists', () => {
    const tabs = [{ id: 2, url: 'chrome-extension://abc/popup.html', active: true }];

    expect(selectScanTargetTab(tabs, 'chrome-extension://abc/popup.html')).toBeUndefined();
  });

  it('excludes tabs with no visible url, even if marked active', () => {
    // Without a matching host permission, Chrome strips `url` from tabs the extension can't
    // see into - including, in some environments, the extension's own popup tab. An
    // undefined url is exactly as unusable as the popup's own url, so both must be excluded.
    const tabs = [
      { id: 1, url: 'https://example.com', active: false },
      { id: 2, url: undefined, active: true },
    ];

    expect(selectScanTargetTab(tabs, 'chrome-extension://abc/popup.html')).toEqual(tabs[0]);
  });

  it('falls back to the first non-popup tab when none is marked active', () => {
    const tabs = [
      { id: 1, url: 'https://example.com', active: false },
      { id: 2, url: 'https://other.com', active: false },
    ];

    expect(selectScanTargetTab(tabs, 'chrome-extension://abc/popup.html')).toEqual(tabs[0]);
  });
});
