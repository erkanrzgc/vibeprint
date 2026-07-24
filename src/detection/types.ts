/**
 * Plain, serializable snapshot of DOM-readable signals from a page.
 * Collected in the isolated world (see snapshot.ts) so every field here is
 * something `chrome.scripting.executeScript` can read without page-context access.
 */
export interface PageSnapshot {
  hostname: string;
  title: string;
  generatorMeta: string | null;
  faviconHref: string | null;
  scriptSrcs: string[];
  /** data-* keys found on <html> or <body> (e.g. Framer's data-framer-*, Webflow's data-wf-*). */
  htmlDatasetKeys: string[];
  bodyDatasetKeys: string[];
  /**
   * Which known component-library data attributes (shadcn's data-slot, Radix's data-state /
   * data-orientation / data-side / data-align / data-disabled) were found anywhere in the
   * document, via a fixed set of `querySelectorAll` checks — not a full attribute scan.
   */
  componentDatasetKeys: string[];
  /**
   * Which known builder-specific markup families were found ANYWHERE in the document
   * (e.g. 'framer', 'webflow'). Checked document-wide via a fixed selector list rather than
   * only on <html>/<body>: real Framer sites carry thousands of data-framer-* attributes on
   * descendant elements while leaving <html>/<body> completely bare, so an html/body-only
   * check silently never fires. Verified against a live capture of framer.com.
   */
  builderMarkupHints: string[];
  badgeLinks: BadgeLink[];
  imageSrcs: string[];
  fontFamilySample: string | null;
  bodyTextSample: string;
}

export interface BadgeLink {
  href: string;
  text: string;
}

export type RuleTier = 'strong' | 'medium' | 'weak';

export interface RuleResult {
  id: string;
  tier: RuleTier;
  label: string;
  evidence: string;
  /**
   * Display name of the builder this signal points at, when the signal identifies one
   * (e.g. 'Lovable', 'Framer'). Generic signals like font or hosting choices leave this
   * unset — naming a specific company needs specific evidence.
   */
  builder?: string;
}

export type VerdictBucket =
  'likely-ai-built' | 'possibly-ai-assisted' | 'likely-hand-crafted' | 'not-enough-signal';

export interface Verdict {
  bucket: VerdictBucket;
  score: number;
  results: RuleResult[];
}
