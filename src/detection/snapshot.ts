import type { BadgeLink, PageSnapshot } from './types';

const COMPONENT_DATASET_CANDIDATES = ['slot', 'state', 'orientation', 'side', 'align', 'disabled'];

/**
 * Document-wide markers for builder-generated markup, as concrete selectors so the lookup
 * stays a fast native querySelector rather than a full attribute walk.
 */
const BUILDER_MARKUP_SELECTORS: Readonly<Record<string, string>> = {
  framer:
    '[data-framer-name],[data-framer-appear-id],[data-framer-component-type],[data-framer-cursor]',
  webflow: '[data-wf-page],[data-wf-site],[data-wf-domain]',
};
const MAX_BADGE_LINKS = 50;
const MAX_IMAGE_SRCS = 50;
/**
 * Generous — no real page in the 66-site corpus comes near it — but bounded, so a
 * pathological page can't balloon the snapshot that travels over runtime.sendMessage.
 * Document order is kept, and builder runtimes load early, so a fingerprint past this
 * cutoff is not a realistic loss.
 */
const MAX_SCRIPT_SRCS = 200;
const BADGE_LINK_TEXT_MAX_LENGTH = 60;
const BODY_TEXT_SAMPLE_MAX_LENGTH = 2000;

/**
 * The body text sample feeds buzzword counting only, so email addresses contribute nothing
 * to detection - but they are personal contact details belonging to third parties, and this
 * snapshot gets messaged around and committed to the test corpus. Strip them at the source.
 */
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const EMAIL_PLACEHOLDER = '[email]';

/** Only real web links can be a builder badge; mailto:/tel: are skipped entirely. */
const BADGE_LINK_PROTOCOLS = new Set(['http:', 'https:']);

/**
 * Reads DOM-visible signals into a plain, serializable snapshot. Runs in the isolated world
 * (see entrypoints/collect.ts) so it only touches the DOM, never page-context globals.
 */
export function collectPageSnapshot(
  doc: Document = document,
  loc: Pick<Location, 'hostname'> = location,
): PageSnapshot {
  return {
    hostname: loc.hostname,
    title: doc.title,
    generatorMeta: doc.querySelector('meta[name="generator"]')?.getAttribute('content') ?? null,
    faviconHref: doc.querySelector('link[rel~="icon"]')?.getAttribute('href') ?? null,
    scriptSrcs: collectAttributeValues(doc, 'script[src]', 'src').slice(0, MAX_SCRIPT_SRCS),
    htmlDatasetKeys: Object.keys(doc.documentElement.dataset),
    bodyDatasetKeys: doc.body ? Object.keys(doc.body.dataset) : [],
    componentDatasetKeys: COMPONENT_DATASET_CANDIDATES.filter(
      (key) => doc.querySelector(`[data-${key}]`) != null,
    ),
    builderMarkupHints: Object.entries(BUILDER_MARKUP_SELECTORS)
      .filter(([, selector]) => doc.querySelector(selector) != null)
      .map(([builder]) => builder),
    badgeLinks: collectBadgeLinks(doc),
    // Inline data: URIs can never match a builder asset path but are frequently 100KB+ of
    // base64, so they are dropped rather than shipped over runtime.sendMessage.
    imageSrcs: collectAttributeValues(doc, 'img[src]', 'src')
      .filter((src) => !src.startsWith('data:'))
      .slice(0, MAX_IMAGE_SRCS),
    fontFamilySample: collectFontFamilySample(doc),
    bodyTextSample: (doc.body?.textContent ?? '')
      .replace(/\s+/g, ' ')
      .replace(EMAIL_PATTERN, EMAIL_PLACEHOLDER)
      .trim()
      .slice(0, BODY_TEXT_SAMPLE_MAX_LENGTH),
  };
}

function collectAttributeValues(doc: Document, selector: string, attribute: string): string[] {
  return Array.from(doc.querySelectorAll(selector))
    .map((el) => el.getAttribute(attribute))
    .filter((value): value is string => Boolean(value));
}

function collectBadgeLinks(doc: Document): BadgeLink[] {
  const links: BadgeLink[] = [];
  for (const anchor of Array.from(doc.querySelectorAll('a[href]'))) {
    const href = anchor.getAttribute('href');
    const text = anchor.textContent?.trim() ?? '';
    if (!href || !text || text.length > BADGE_LINK_TEXT_MAX_LENGTH) continue;
    // A page can put anything in an href attribute. A malformed one must not abort the
    // whole snapshot — that would let a single bad link silently defeat detection on an
    // otherwise-fingerprintable page (e.g. one with data-framer-* attributes that are
    // impractical for a site owner to strip).
    let resolved: URL;
    try {
      resolved = new URL(href, doc.baseURI);
    } catch {
      continue;
    }
    // A builder badge always points at a website, so mailto:/tel: links can never be one.
    // Skipping them also keeps third-party contact details out of the snapshot entirely.
    if (!BADGE_LINK_PROTOCOLS.has(resolved.protocol)) continue;
    links.push({ href: resolved.toString(), text });
    if (links.length >= MAX_BADGE_LINKS) break;
  }
  return links;
}

function collectFontFamilySample(doc: Document): string | null {
  if (!doc.body || !doc.defaultView) return null;
  const fontFamily = doc.defaultView.getComputedStyle(doc.body).fontFamily;
  return fontFamily || null;
}
