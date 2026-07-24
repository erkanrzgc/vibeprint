import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer, type Server } from 'node:http';
import { readFile } from 'node:fs/promises';
import { chromium, test as base, expect, type BrowserContext } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const EXTENSION_PATH = path.resolve(__dirname, '../../.output/chrome-mv3-e2e');
const FIXTURE_PAGE_PATH = path.resolve(__dirname, '../fixtures/pages/lovable-example.html');

// Pinned via the `key` field in wxt.config.ts so we don't have to scrape the ID out of
// chrome://extensions (there's no background service worker to grab it from either, since
// this extension is popup-only by design).
const EXTENSION_ID = 'dnlbkgiimhnnechipakfobidildedmoe';

const test = base.extend<{ context: BrowserContext; fixtureUrl: string }>({
  context: async ({}, use) => {
    const context = await chromium.launchPersistentContext('', {
      channel: 'chromium',
      args: [`--disable-extensions-except=${EXTENSION_PATH}`, `--load-extension=${EXTENSION_PATH}`],
    });
    await use(context);
    await context.close();
  },
  // isScannableUrl() only allows http(s), matching real-world browsing - file:// is
  // deliberately excluded (see src/scannable.ts) - so the fixture must be served over http.
  fixtureUrl: async ({}, use) => {
    const html = await readFile(FIXTURE_PAGE_PATH, 'utf-8');
    const server: Server = createServer((_req, res) => {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 0;

    await use(`http://localhost:${port}/`);

    await new Promise<void>((resolve) => {
      server.close(() => resolve());
      // The browser can still hold an idle keep-alive socket at teardown (fixtureUrl and
      // context are independent fixtures, so this may run before the browser closes), and
      // server.close() alone waits on it until the test times out.
      server.closeAllConnections();
    });
  },
});

test('scanning a page with Lovable fingerprints renders a "Likely AI-built" verdict', async ({
  context,
  fixtureUrl,
}) => {
  const page = await context.newPage();
  await page.goto(fixtureUrl);

  const popup = await context.newPage();
  await popup.goto(`chrome-extension://${EXTENSION_ID}/popup.html`);

  await expect(popup.getByText('Likely AI-built')).toBeVisible({ timeout: 10_000 });
  await expect(popup.getByText('Lovable loader script')).toBeVisible();
  // The popup should name the builder, not just show rule labels.
  await expect(popup.getByText('Fingerprint matches')).toBeVisible();
  await expect(popup.locator('.result__builder strong')).toHaveText('Lovable');
  // Evidence is grouped by how much it actually proves.
  await expect(popup.getByText('Conclusive')).toBeVisible();
});
