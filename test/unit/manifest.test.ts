import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PROD_MANIFEST = path.join(REPO_ROOT, '.output/chrome-mv3/manifest.json');

/**
 * Guards the production manifest against test-only scaffolding leaking into a store build.
 * A comment saying "e2e only" is not enforcement — this is.
 *
 * Skipped when .output is absent so a fresh clone can run `npm test` before building; CI and
 * the release flow both build first, so it runs where it matters.
 */
describe.skipIf(!existsSync(PROD_MANIFEST))('production manifest', () => {
  const manifest = JSON.parse(readFileSync(PROD_MANIFEST, 'utf-8'));

  it('requests only activeTab and scripting', () => {
    expect(manifest.permissions.sort()).toEqual(['activeTab', 'scripting']);
  });

  it('declares no host permissions', () => {
    // On-demand scanning needs none. Declaring them would also trigger the slower,
    // stricter Chrome Web Store review path.
    expect(manifest.host_permissions).toBeUndefined();
  });

  it('does not ship the e2e signing key', () => {
    // The Chrome Web Store assigns its own extension ID; a bundled `key` invites a conflict.
    expect(manifest.key).toBeUndefined();
  });

  it('has no background service worker', () => {
    expect(manifest.background).toBeUndefined();
  });

  it('has no content scripts registered', () => {
    // Collection happens on demand via scripting.executeScript, never on page load.
    expect(manifest.content_scripts).toBeUndefined();
  });

  it('keeps the default strict MV3 content security policy', () => {
    expect(manifest.content_security_policy).toBeUndefined();
  });
});
