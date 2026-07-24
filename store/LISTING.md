# Chrome Web Store listing copy

Paste-ready text for the developer dashboard. Keep the honesty framing intact — the tool makes
a probabilistic estimate, and the listing must not imply certainty.

---

## Name

```
Vibeprint
```

## Short description (132 char max)

```
See if a site was built with an AI tool like Lovable, Bolt, Framer or Base44. Runs locally on click. No data leaves your browser.
```

_(127 characters)_

## Category

`Developer Tools`

## Detailed description

```
Vibeprint tells you whether the page you're on was likely built with an AI coding tool or
no-code AI app builder — Lovable, Bolt.new, Framer, Base44, Replit — and shows you exactly
which signals it found.

Click the toolbar icon. It reads the page, matches it against known builder fingerprints, and
gives you a verdict with the evidence behind it. Nothing runs until you click.

WHAT MAKES IT DIFFERENT

Most of the guesswork in this space is vibes. Vibeprint is calibrated against 66 real websites
captured live, half of them AI-built and half hand-built, with published accuracy numbers:
precision 1.000, recall 0.974. The hand-built half deliberately includes the hardest cases —
sites like vercel.com and ui.shadcn.com that use the exact fonts, components and dark gradient
aesthetic people associate with AI output. None of them are falsely accused.

EVIDENCE, NOT ACCUSATIONS

Every verdict comes with a breakdown, grouped by how much it actually proves:

• Conclusive — identifies a specific builder (a hosted runtime script, a generator tag)
• Suggestive — common in generated code, but not exclusive to it
• Circumstantial — also seen on hand-built sites

A confident verdict requires conclusive evidence. Buzzwords, a default font, and platform
hosting can never add up to an accusation on their own — that rule is enforced in code, not
just intended.

HONEST ABOUT LIMITS

A site can be AI-built and leave no trace. Builders that host what they generate (Lovable,
Bolt, Framer, Base44) leave fingerprints behind; tools like v0 hand you code you deploy
yourself, leaving nothing to detect. When there's no evidence, Vibeprint says "Not enough
signal" instead of guessing. That's a real answer, not a failure.

PRIVACY

• No data collection of any kind
• No network requests — nothing leaves your browser, ever
• No background process, no content scripts, no storage
• No host permissions: it cannot touch a page you haven't asked it to scan
• Fully open source

Permissions used: activeTab (temporary access to the current tab, only when you click) and
scripting (to run the reader on that page).

Source code and accuracy methodology: https://github.com/erkanrzgc/vibeprint
```

## Single purpose statement

```
Vibeprint analyses the page a user is currently viewing, on explicit user action, to estimate
whether it was built using an AI coding tool or no-code AI app builder, and displays the
matching signals.
```

## Permission justifications

**activeTab**

```
Required to read the DOM of the page the user is currently viewing so it can be checked
against known AI-builder fingerprints. Access is granted only at the moment the user clicks
the extension icon and expires on navigation. This is the minimum permission that allows the
extension to function, and is used instead of host permissions specifically so the extension
has no standing access to any site.
```

**scripting**

```
Required to inject the collector script into the active tab via chrome.scripting.executeScript
when the user clicks the icon. The script reads page metadata (title, meta tags, script and
image URLs, data-* attribute names, link text, font-family, and a text sample) and returns it
to the popup for local analysis. It runs in the isolated world and is never injected
automatically.
```

## Data usage disclosures

Tick **nothing**. The extension collects no user data in any category.

Certifications:

- ☑ I do not sell or transfer user data to third parties, outside of approved use cases
- ☑ I do not use or transfer user data for purposes unrelated to my item's single purpose
- ☑ I do not use or transfer user data to determine creditworthiness or for lending purposes

## Privacy policy URL

```
https://github.com/erkanrzgc/vibeprint/blob/main/store/PRIVACY.md
```

## Assets checklist

- [x] Icon 128×128 (`public/icon/128.png`)
- [x] Screenshots 1280×800 (`npm run store:shots` → `.output/store-shots/`)
- [ ] Small promo tile 440×280 — optional, only needed for featuring
