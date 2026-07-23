# Vibeprint

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
Corpus: 66 sites (38 ai-built, 28 hand-built)
TP=37  FP=0  FN=1  TN=28
Precision=1.000   Recall=0.974   F1=0.987
```

Builders represented: Lovable (21), Bolt (8), Framer (7), Base44 (1), Replit (1).

The hand-built half deliberately includes the highest-risk false positives — `vercel.com`,
`ui.shadcn.com`, `resend.com`, `supabase.com`, `clerk.com`, `railway.com` — sites with Geist
fonts, shadcn/Radix markup and dark gradient heroes that look exactly like AI-template output.
None are accused.

`ai-built` labels are evidence-backed, not assumed: builder-owned subdomains, or a confirmed
`generator` meta tag. Candidates that appeared in a builder's public gallery but carried no
detectable trace were **dropped from the corpus rather than labelled on faith** — a wrong label
makes the metric lie.

Run it yourself:

```bash
npm run capture   # re-capture live snapshots listed in tools/capture/urls.json
npm run eval      # print per-site verdicts + precision/recall
```

**Shadow DOM: measured, not assumed.** The collector queries the light DOM only. That looks
like a blind spot, so it was measured rather than guessed at
(`node tools/capture/probe-shadow.mjs`): across the 57-site corpus, only 8 sites expose any
open shadow root, and on **zero** of them does a detection signal exist solely inside shadow
DOM. Piercing shadow roots would add traversal cost and complexity for no measurable gain
today. Re-run the probe if builders start shipping shadow-encapsulated components.

**Rule validation coverage** (`npm run eval:coverage`) reports which rules have actually
fired on real data. A rule that never fires is an untested assumption, not a validated one —
surfacing that is the point. It has already paid off twice: it caught that
`platform-hosting-subdomain` never fired despite a corpus full of `*.lovable.app` sites (the
builder-owned domains were simply missing from the list), and that Lovable's original
`cdn.gpteng.co` loader no longer appears on **any** of the 22 real Lovable sites — live
fingerprint rot, caught by measurement rather than by a user reporting a miss.

**Known limits, stated honestly:**
- **v0 is effectively undetectable, by design.** Lovable, Bolt, Framer and Base44 all host
  what they generate, so they leave a runtime script, markup attribute or asset path behind.
  v0 hands you code that you deploy yourself — there is no v0 infrastructure left in the
  output to fingerprint. A v0 badge rule exists for sites that voluntarily keep one, but a v0
  site without a badge will read as `Not enough signal`, and that is the honest answer rather
  than a gap to paper over.
- **Base44 rests on a single captured site** (`giftmybook.com`, from Base44's own case study),
  so it is far less validated than the others. Both its markers are exact-match, so the
  false-positive risk stays low even with thin coverage.
- Create.xyz and Same.new have no rules: no verifiable example sites could be found to build
  them from, and guessing fingerprints without real data is the exact mistake this project
  already paid for once.
- Fingerprints are what a site owner strips first. A polished AI-built site on a custom domain
  with the badge removed and no platform runtime can be genuinely undetectable — `Not enough
  signal` is an expected, correct answer, not a failure.
- `hand-built` ground-truth labels are inferred (site predates the builders, long public git
  history), so eval numbers are directional, not certified.
- Builder internals change. Fingerprints will rot silently; re-run `npm run capture && npm run
  eval` periodically to catch it.

## Publishing

Everything the Chrome Web Store dashboard asks for lives in [`store/`](store/):

- [`store/LISTING.md`](store/LISTING.md) — paste-ready name, descriptions, single-purpose
  statement, permission justifications, and the data-disclosure answers
- [`store/PRIVACY.md`](store/PRIVACY.md) — privacy policy (link it as the policy URL)

```bash
npm run store:shots   # 1280x800 screenshots -> .output/store-shots/
npm run store:zip     # upload package       -> .output/vibeprint-<version>-chrome.zip
```

Screenshots are composited from the **real popup** rendered by the actual extension, not
mockups. Pages are served under realistic hostnames via request interception, so no third
party's real site is displayed as an example of AI-built work.

`test/unit/manifest.test.ts` guards the production manifest: it fails if the e2e signing key,
host permissions, a background worker, or content scripts ever leak into a store build.

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
