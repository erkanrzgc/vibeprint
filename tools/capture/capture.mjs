#!/usr/bin/env node
/**
 * Captures real PageSnapshot JSON from live sites so the detection rules can be calibrated
 * against reality instead of hand-written fixtures.
 *
 * Usage:
 *   node tools/capture/capture.mjs                    # capture every url in urls.json
 *   node tools/capture/capture.mjs --filter lovable   # only urls whose slug/url matches
 *   node tools/capture/capture.mjs --headed           # watch it run
 *
 * Output: test/fixtures/corpus/<slug>.json  ({ url, label, builder, capturedAt, snapshot })
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { build } from 'esbuild';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const ENTRY = path.join(__dirname, 'collectorEntry.ts');
const URLS_FILE = path.join(__dirname, 'urls.json');
const OUT_DIR = path.join(REPO_ROOT, 'test/fixtures/corpus');

// The real extension only ever scans a page the user is already looking at, so the DOM has
// finished hydrating. Mirror that here: load, then let client-rendered content settle.
const SETTLE_MS = 2500;
const NAV_TIMEOUT_MS = 30_000;

const args = process.argv.slice(2);
const filter = args.includes('--filter') ? args[args.indexOf('--filter') + 1] : null;
const headed = args.includes('--headed');

async function bundleCollector() {
  const result = await build({
    entryPoints: [ENTRY],
    bundle: true,
    format: 'iife',
    write: false,
    platform: 'browser',
    target: 'chrome110',
  });
  return result.outputFiles[0].text;
}

async function capturePage(page, collectorSource, entry) {
  await page.goto(entry.url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
  await page.waitForTimeout(SETTLE_MS);
  await page.evaluate(collectorSource);
  return page.evaluate(() => window.__vibecodeCollect());
}

async function main() {
  const entries = JSON.parse(await readFile(URLS_FILE, 'utf-8'));
  const targets = filter
    ? entries.filter((e) => e.slug.includes(filter) || e.url.includes(filter))
    : entries;

  if (targets.length === 0) {
    console.error(`No urls matched filter "${filter}"`);
    process.exit(1);
  }

  console.log(`Bundling collector from ${path.relative(REPO_ROOT, ENTRY)}...`);
  const collectorSource = await bundleCollector();
  await mkdir(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: !headed });
  const context = await browser.newContext({
    bypassCSP: true,
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  });

  const succeeded = [];
  const failed = [];

  for (const entry of targets) {
    const page = await context.newPage();
    try {
      const snapshot = await capturePage(page, collectorSource, entry);
      const record = {
        url: entry.url,
        label: entry.label,
        builder: entry.builder ?? null,
        note: entry.note ?? null,
        capturedAt: new Date().toISOString(),
        snapshot,
      };
      await writeFile(
        path.join(OUT_DIR, `${entry.slug}.json`),
        `${JSON.stringify(record, null, 2)}\n`,
      );
      succeeded.push(entry.slug);
      console.log(`  ok    ${entry.slug.padEnd(28)} ${snapshot.hostname}`);
    } catch (error) {
      failed.push({ slug: entry.slug, message: error.message.split('\n')[0] });
      console.log(`  FAIL  ${entry.slug.padEnd(28)} ${error.message.split('\n')[0]}`);
    } finally {
      await page.close();
    }
  }

  await context.close();
  await browser.close();

  console.log(`\ncaptured ${succeeded.length}/${targets.length} -> ${path.relative(REPO_ROOT, OUT_DIR)}`);
  if (failed.length > 0) {
    console.log(`failed: ${failed.map((f) => f.slug).join(', ')}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
