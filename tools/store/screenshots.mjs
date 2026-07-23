#!/usr/bin/env node
/**
 * Renders Chrome Web Store screenshots (1280x800, the size the dashboard expects) showing the
 * popup against a representative page for each verdict state.
 *
 * The popup is only 348px wide, so a raw capture would be mostly empty canvas. Instead each
 * shot composites the real popup — rendered by the actual extension, not a mockup — onto a
 * captioned backdrop, so what a reviewer sees is what the extension actually produces.
 *
 * Usage: npm run store:shots   (requires `npm run build:e2e` first)
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '../..');
const EXTENSION_PATH = path.join(REPO_ROOT, '.output/chrome-mv3-e2e');
const OUT_DIR = path.join(REPO_ROOT, '.output/store-shots');
const EXTENSION_ID = 'dnlbkgiimhnnechipakfobidildedmoe';

const SHOT_WIDTH = 1280;
const SHOT_HEIGHT = 800;
const SETTLE_MS = 1500;

/** Each scene: a page the extension will scan, plus the caption shown beside the popup. */
const SCENES = [
  {
    slug: '1-conclusive',
    heading: 'Know what built the page',
    sub: 'Conclusive fingerprints name the builder outright.',
    // Served under a realistic hostname via request interception rather than localhost, so
    // the shot reflects real use. The content is ours — no third party's real site is put on
    // display as an example of AI-built work.
    url: 'https://petcare-tracker.lovable.app/',
    html: `<!doctype html><html><head><title>PetCare Tracker</title>
      <script src="/~flock.js"></script></head><body>
      <h1>PetCare Tracker</h1>
      <a href="https://lovable.dev">Made with Lovable</a>
      <img src="/lovable-uploads/hero.png">
      <p>Revolutionize your workflow with a seamless, cutting-edge platform.</p>
      </body></html>`,
  },
  {
    slug: '2-evidence',
    heading: 'Evidence, not accusations',
    sub: 'Signals are grouped by how much they actually prove.',
    url: 'https://taskflow-app.vercel.app/',
    html: `<!doctype html><html><head><title>TaskFlow</title></head><body>
      <div data-slot="button" data-state="open">Start</div>
      <p>Supercharge productivity with seamless, cutting-edge workflow. Unlock the power.</p>
      <img src="https://i.pravatar.cc/150?u=a">
      </body></html>`,
  },
  {
    slug: '3-honest',
    heading: 'Honest when there is nothing to find',
    sub: 'A site can be AI-built and leave no trace. It says so.',
    url: 'https://oakridgejoinery.co.uk/',
    html: `<!doctype html><html><head><title>Oakridge Joinery</title></head><body>
      <h1>Oakridge Joinery</h1>
      <p>Three generations of joiners serving the valley since 1987.</p>
      </body></html>`,
  },
];

function backdrop(scene) {
  // Mirrors the popup's own visual language so the composite reads as one product.
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{width:${SHOT_WIDTH}px;height:${SHOT_HEIGHT}px;display:flex;align-items:center;
      gap:72px;padding:0 88px;background:#0e0f13;
      background-image:radial-gradient(90% 70% at 78% 30%, #1b1f28 0%, #0e0f13 62%);
      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',system-ui,sans-serif;color:#e8e9ee}
    .copy{flex:1;max-width:520px}
    .brand{font-size:12px;font-weight:600;letter-spacing:.18em;text-transform:uppercase;
      color:#626775;margin-bottom:26px}
    h1{font-size:44px;line-height:1.12;letter-spacing:-.025em;font-weight:640;margin-bottom:18px}
    p{font-size:17px;line-height:1.5;color:#9498a6}
    .shot{flex:none;border-radius:12px;overflow:hidden;
      box-shadow:0 32px 70px rgba(0,0,0,.6),0 0 0 1px #262a34}
    img{display:block}
  </style></head><body>
    <div class="copy">
      <div class="brand">Vibeprint</div>
      <h1>${scene.heading}</h1>
      <p>${scene.sub}</p>
    </div>
    <div class="shot"><img src="data:image/png;base64,${scene.popupPng}"></div>
  </body></html>`;
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const context = await chromium.launchPersistentContext('', {
    channel: 'chromium',
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`,
    ],
  });

  for (const scene of SCENES) {
    // Fulfil the request locally: the browser believes it is on scene.url, but no request
    // ever leaves the machine and no real site is contacted.
    await context.route(scene.url, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: scene.html }),
    );

    const target = await context.newPage();
    await target.goto(scene.url);

    const popup = await context.newPage();
    await popup.setViewportSize({ width: 348, height: 640 });
    await popup.goto(`chrome-extension://${EXTENSION_ID}/popup.html`);
    await popup.waitForTimeout(SETTLE_MS);

    // Capture just the rendered popup, at its natural height.
    const buffer = await popup.locator('.popup').screenshot();
    scene.popupPng = buffer.toString('base64');
    await popup.close();
    await target.close();
    await context.unroute(scene.url);

    const composer = await context.newPage();
    await composer.setViewportSize({ width: SHOT_WIDTH, height: SHOT_HEIGHT });
    await composer.setContent(backdrop(scene));
    await composer.waitForTimeout(250);
    const outPath = path.join(OUT_DIR, `${scene.slug}.png`);
    await composer.screenshot({ path: outPath });
    await composer.close();

    console.log(`  ${scene.slug}.png`);
  }

  await context.close();
  console.log(`\n${SCENES.length} screenshots -> ${path.relative(REPO_ROOT, OUT_DIR)}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
