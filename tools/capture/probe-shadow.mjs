#!/usr/bin/env node
/**
 * One-off measurement: does ignoring shadow DOM actually cost us any detection signal?
 *
 * snapshot.ts only queries the light DOM. That is a known blind spot, but its real-world
 * impact was never measured - so this walks every open shadow root on the corpus sites and
 * reports which detection signals live ONLY inside shadow DOM (i.e. what we currently miss).
 *
 * Usage: node tools/capture/probe-shadow.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const URLS_FILE = path.join(__dirname, 'urls.json');
const SETTLE_MS = 2500;
const NAV_TIMEOUT_MS = 30_000;
const CONCURRENCY = 6;

const PROBE = () => {
  const SELECTORS = {
    shadcnRadix: '[data-slot],[data-state],[data-orientation],[data-side],[data-align]',
    framer: '[data-framer-name],[data-framer-appear-id],[data-framer-component-type]',
    webflow: '[data-wf-page],[data-wf-site],[data-wf-domain]',
  };

  const roots = [];
  const walk = (node) => {
    const els = node.querySelectorAll('*');
    for (const el of els) {
      if (el.shadowRoot) {
        roots.push(el.shadowRoot);
        walk(el.shadowRoot);
      }
    }
  };
  walk(document);

  const count = (scope, sel) => {
    try {
      return scope.querySelectorAll(sel).length;
    } catch {
      return 0;
    }
  };

  const result = { shadowRoots: roots.length, light: {}, shadowOnly: {} };
  for (const [name, sel] of Object.entries(SELECTORS)) {
    const light = count(document, sel);
    let shadow = 0;
    for (const r of roots) shadow += count(r, sel);
    result.light[name] = light;
    // Signal that exists in shadow DOM but nowhere in the light DOM = what we currently miss.
    result.shadowOnly[name] = light === 0 && shadow > 0 ? shadow : 0;
  }
  return result;
};

async function probeOne(context, entry) {
  const page = await context.newPage();
  try {
    await page.goto(entry.url, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT_MS });
    await page.waitForTimeout(SETTLE_MS);
    const r = await page.evaluate(PROBE);
    return { slug: entry.slug, label: entry.label, ...r };
  } catch (error) {
    return { slug: entry.slug, label: entry.label, error: error.message.split('\n')[0] };
  } finally {
    await page.close();
  }
}

async function main() {
  const entries = JSON.parse(await readFile(URLS_FILE, 'utf-8'));
  const browser = await chromium.launch();
  const context = await browser.newContext({ bypassCSP: true });

  const results = [];
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const batch = entries.slice(i, i + CONCURRENCY);
    results.push(...(await Promise.all(batch.map((e) => probeOne(context, e)))));
    process.stdout.write(`\rprobed ${Math.min(i + CONCURRENCY, entries.length)}/${entries.length}`);
  }
  console.log('');

  await context.close();
  await browser.close();

  const ok = results.filter((r) => !r.error);
  const withShadow = ok.filter((r) => r.shadowRoots > 0);
  const missed = ok.filter((r) => Object.values(r.shadowOnly).some((v) => v > 0));

  console.log(`\nprobed ok: ${ok.length}/${results.length}`);
  console.log(`sites with any open shadow root: ${withShadow.length}`);
  console.log(`\nsites where a detection signal exists ONLY in shadow DOM: ${missed.length}`);
  if (missed.length === 0) {
    console.log('  -> ignoring shadow DOM currently costs zero detection signal on this corpus.');
  } else {
    for (const m of missed) {
      const which = Object.entries(m.shadowOnly)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => `${k}=${v}`)
        .join(', ');
      console.log(`  ${m.label.padEnd(11)} ${m.slug.padEnd(34)} ${which}`);
    }
  }

  const topShadow = withShadow.sort((a, b) => b.shadowRoots - a.shadowRoots).slice(0, 8);
  if (topShadow.length) {
    console.log('\nmost shadow roots (for context):');
    topShadow.forEach((r) => console.log(`  ${String(r.shadowRoots).padStart(4)}  ${r.slug}`));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
