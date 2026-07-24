# Test fixtures

Two kinds of fixture data, with very different trust levels.

## `corpus/` — real captured snapshots (trust these)

Each file is a `PageSnapshot` captured from a **live site** by `tools/capture/capture.mjs`,
which injects the very same `collectPageSnapshot()` the extension runs in production. If the
collector changes, re-run the capture so the corpus stays faithful:

```bash
npm run capture          # re-capture every url in tools/capture/urls.json
npm run eval             # print precision/recall + per-site verdicts
```

`test/unit/corpus.test.ts` asserts thresholds over this corpus (zero false accusations,

> =80% recall). Those are the tests that actually tell you the detector works.

### Ground-truth labels

- `ai-built` — hosted on a builder-owned subdomain (self-labeling: you cannot be on
  `*.lovable.app` without Lovable having built it), or listed in a builder's own public
  showcase, or self-declared via a `generator` meta tag.
- `hand-built` — predates the AI builders by years and/or has a long public git history.

Neither label is infallible; treat eval numbers as directional, not certified. The
`difficulty: "hard"` entries are the interesting ones: AI-built sites on custom domains with
badges stripped, and hand-built sites that trip the weaker heuristics.

## `snapshots/` — hand-written synthetic fixtures (narrow use only)

These were authored by hand to unit-test individual rules in isolation. They are **not**
evidence about the real world — they only prove a rule matches the shape its author imagined.
Keep them for targeted edge cases (malformed URLs, single-signal combinations); rely on
`corpus/` for anything that claims real-world accuracy.

## What grounding the corpus in reality caught

Building the corpus immediately exposed bugs that 62 green unit tests had hidden:

1. **`data-framer-*` rule never fired.** Real framer.com leaves `<html>`/`<body>` bare and puts
   3300+ `data-framer-*` attributes on descendants; the rule only inspected html/body.
2. **`generator` meta was collected but never read** — despite being the single most explicit
   signal available (`<meta name="generator" content="Framer 92482b8">`).
3. **False accusation on `ui.shadcn.com`** — its "Open in v0" button was read as a builder
   badge. Linking _to_ a builder is the opposite of being built _by_ one; badge matching now
   requires provenance-claiming link text.
4. **`/~flock.js` discovered** — Lovable's hosted runtime, served from the site's own origin,
   so it survives custom-domain deploys that strip every other fingerprint. Present on 8/11
   real ai-built sites and 0/11 hand-built. This single rule took recall from 0.27 to 0.91.
