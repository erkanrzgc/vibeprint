# Hand-written synthetic snapshots

> See `../README.md` for the full picture. **Short version: these are synthetic. For anything
> that claims real-world accuracy, use `../corpus/` instead**, which holds snapshots captured
> from live sites via `npm run capture`.

Each `.json` here is a `PageSnapshot` (see `src/detection/types.ts`) that was **authored by
hand**, not captured. They exist to unit-test individual rules against a controlled shape —
useful for edge cases like malformed URLs or a single isolated signal.

Their limitation is the reason the real corpus exists: a hand-written fixture only proves a
rule matches the markup its author *imagined*. The original Framer fixture, for example,
placed `data-framer-*` keys on `<html>`/`<body>` — real Framer sites leave those bare and put
the attributes on descendants, so the rule passed its tests while never firing on a real page.
