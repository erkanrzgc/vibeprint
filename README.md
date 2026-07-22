# Vibecode Detector

A Chrome extension (Manifest V3) that scans the page you're on, on demand, for evidence it was
built with an AI coding tool or no-code AI app builder — Lovable, Bolt.new, v0, Replit, Framer —
and reports a **probabilistic** verdict with the specific signals that fired.

It is deliberately cautious about what it claims. Verdicts are `Likely AI-built`,
`Possibly AI-assisted`, `Likely hand-crafted`, or `Not enough signal` — never a flat accusation.

## Install (unpacked)

```bash
npm install
npm run build
```

Then `chrome://extensions` → enable Developer mode → **Load unpacked** → select
`.output/chrome-mv3`. Click the toolbar icon on any page to scan it.

## How it works

A scan runs only when you click the icon. The popup injects a collector
(`src/detection/snapshot.ts`) into the active tab via `chrome.scripting.executeScript`, which
reads DOM-visible signals into a plain `PageSnapshot` and messages it back. Pure rule modules
score that snapshot and the popup renders the breakdown.

**Permissions: `activeTab` + `scripting` only.** No broad host permissions, no background
service worker, no telemetry, no remote code — detection rules ship bundled in the extension.
Injection is isolated-world only; the page's own JS context is never touched.

### Signal tiers

| Tier | Examples | Weight |
|---|---|---|
| **Strong** | Lovable's `/~flock.js` runtime & `cdn.gpteng.co` loader, `/lovable-uploads/` asset paths, Replit's banner script, `generator` meta naming a builder, Framer/Webflow markup attributes, genuine "Made with X" badge links | 65 |
| **Medium** | shadcn `data-slot` + Radix primitives together, un-customized scaffold title/favicon | 25 |
| **Weak** | builder-subdomain hosting, builder-default-only fonts, buzzword density, stock avatar services | 10 |

A `Likely AI-built` verdict requires **both** a high score **and** at least one strong-tier
signal. Weak and medium signals alone can never reach it — a hand-built SaaS page with a purple
gradient and marketing copy is the most likely false positive, so that path is closed by
construction (`src/detection/score.ts`).

## Accuracy

Measured against snapshots captured from **real live sites** (`test/fixtures/corpus`):

```
Corpus: 22 sites (11 ai-built, 11 hand-built)
TP=10  FP=0  FN=1  TN=11
Precision=1.000   Recall=0.909   F1=0.952
```

Run it yourself:

```bash
npm run capture   # re-capture live snapshots listed in tools/capture/urls.json
npm run eval      # print per-site verdicts + precision/recall
```

**Known limits, stated honestly:**
- Fingerprints are what a site owner strips first. A polished AI-built site on a custom domain
  with the badge removed and no platform runtime can be genuinely undetectable — `Not enough
  signal` is an expected, correct answer, not a failure.
- `hand-built` ground-truth labels are inferred (site predates the builders, long public git
  history), so eval numbers are directional, not certified.
- Builder internals change. Fingerprints will rot silently; re-run `npm run capture && npm run
  eval` periodically to catch it.

## Development

```bash
npm run dev        # WXT dev server with HMR
npm test           # unit tests (Vitest)
npm run test:e2e   # Playwright test against the real built extension
npm run compile    # typecheck
```

Rule modules are pure functions over `PageSnapshot`, so they unit-test in plain Node with no
browser. `test/unit/corpus.test.ts` asserts thresholds over the real-site corpus (zero false
accusations, ≥80% recall) — those are the tests that actually prove the detector works; see
`test/fixtures/README.md` for why the hand-written fixtures alone were not enough.
