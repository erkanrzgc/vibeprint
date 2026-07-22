import { describe, expect, it } from 'vitest';
import { isScannableUrl } from '../../src/scannable';

describe('isScannableUrl', () => {
  it('allows ordinary http/https pages', () => {
    expect(isScannableUrl('https://example.com')).toBe(true);
    expect(isScannableUrl('http://example.com/path')).toBe(true);
  });

  it('rejects internal browser pages', () => {
    expect(isScannableUrl('chrome://extensions')).toBe(false);
    expect(isScannableUrl('edge://settings')).toBe(false);
    expect(isScannableUrl('about:blank')).toBe(false);
  });

  it('rejects extension pages', () => {
    expect(isScannableUrl('chrome-extension://abcdefgh/popup.html')).toBe(false);
  });

  it('rejects the Chrome Web Store, where content-script injection is blocked', () => {
    expect(isScannableUrl('https://chromewebstore.google.com/detail/foo')).toBe(false);
    expect(isScannableUrl('https://chrome.google.com/webstore/detail/foo')).toBe(false);
  });

  it('rejects file:// URLs by default', () => {
    expect(isScannableUrl('file:///C:/Users/me/page.html')).toBe(false);
  });

  it('rejects an empty or undefined URL', () => {
    expect(isScannableUrl(undefined)).toBe(false);
    expect(isScannableUrl('')).toBe(false);
  });

  it('rejects a malformed URL rather than throwing', () => {
    expect(isScannableUrl('not a url')).toBe(false);
  });
});
