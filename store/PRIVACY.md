# Privacy Policy — Vibeprint

_Last updated: 2026-07-23_

## Short version

Vibeprint collects nothing, stores nothing, and sends nothing anywhere. There is no server,
no analytics, no account, and no tracking. Everything happens inside your browser, only when
you ask for it.

## What the extension does

When you click the Vibeprint toolbar icon, it reads the page you are currently looking at and
checks it against a fixed list of known AI-builder fingerprints. It shows the result in the
popup. When you close the popup, the result is gone.

## What it reads

Only when you click the icon, and only from the tab you are on:

- the page title, hostname, and `generator` meta tag
- the list of `<script src>` and `<img src>` URLs
- `data-*` attribute names used by known site builders
- link text and destinations, used to spot "Made with X" badges
- the page's font-family and a sample of visible text, used to count marketing buzzwords

Email addresses are stripped from the text sample before it is used, and `mailto:`/`tel:`
links are never read at all.

## What it does not do

- **No data leaves your browser.** The extension makes no network requests of any kind — no
  API calls, no analytics, no error reporting, no remote configuration.
- **No storage.** Nothing is written to disk, `localStorage`, cookies, or sync storage. Results
  exist only while the popup is open.
- **No background activity.** The extension has no background service worker and no content
  scripts. It runs only in response to your click, and stops as soon as it is done.
- **No browsing history access.** It cannot see other tabs, your history, bookmarks, or
  passwords. It has no permission to.
- **No tracking or profiling.** No identifiers, no fingerprinting of you, no cross-site data.

## Permissions and why

| Permission  | Why it is needed                                                                                                                          |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `activeTab` | Grants temporary access to the page you are on, and **only** at the moment you click the icon. The access expires when you navigate away. |
| `scripting` | Lets the extension run its reader script on that page to collect the signals above.                                                       |

The extension deliberately requests **no host permissions**, so it has no standing access to
any website. It cannot run on a page you have not explicitly asked it to scan.

## Data sharing

There is nothing to share. No data is collected, so no data is sold, transferred, or disclosed
to anyone, for any purpose.

## Third-party services

None. The extension bundles all of its detection rules at build time and never contacts a
remote service.

## Verifying these claims

The extension is open source. You can read every line, including the collector that decides
what is read: https://github.com/erkanrzgc/vibeprint

The absence of network calls is straightforward to confirm yourself: open DevTools on the
extension's popup, run a scan, and watch the Network tab stay empty.

## Contact

Questions or concerns: open an issue at https://github.com/erkanrzgc/vibeprint/issues
