import type { PageSnapshot, RuleResult } from '../types';

/**
 * Every rule id this module can emit. The `strong()` helper only accepts ids from this list,
 * so an id used below but missing here is a compile error — tools/eval/coverage.ts reads the
 * aggregated registry (rules/index.ts) instead of keeping its own copy, which is how its old
 * hand-maintained list silently went stale.
 */
export const BUILDER_FINGERPRINT_RULE_IDS = [
  'lovable-script',
  'lovable-runtime-script',
  'replit-banner-script',
  'bolt-badge-script',
  'base44-assets',
  'lovable-uploads-path',
  'generator-meta',
  'builder-markup',
  'builder-badge-link',
] as const;

type BuilderFingerprintRuleId = (typeof BUILDER_FINGERPRINT_RULE_IDS)[number];

/**
 * Lovable's original GPT-Engineer-era loader. Kept for older deploys, but note it no longer
 * appears on ANY of the 22 real Lovable sites in the corpus (see tools/eval/coverage.ts) -
 * current Lovable output ships LOVABLE_RUNTIME_PATH instead. A live example of fingerprint
 * rot; retained only because it is harmless and may still match legacy sites.
 */
const LOVABLE_SCRIPT_HOST = 'cdn.gpteng.co';

/**
 * Lovable's hosted runtime. Discovered by capturing real sites rather than from docs: it is
 * served at the site's own origin, so unlike the badge or the cdn.gpteng.co loader it
 * survives a custom-domain deploy. Measured on the real corpus (test/fixtures/corpus):
 * present on 8/11 known AI-built sites and 0/11 known hand-built sites.
 */
const LOVABLE_RUNTIME_PATH = '/~flock.js';

/** Replit injects this banner script into apps served through its infrastructure. */
const REPLIT_BANNER_PATH = '/public/js/replit-dev-banner.js';

/**
 * Bolt's badge loader, served from bolt.new itself. Found on 8/8 real *.bolt.host sites
 * captured for the corpus. Because it is a script rather than rendered markup, it survives
 * a badge that has been hidden with CSS.
 */
const BOLT_BADGE_HOST = 'bolt.new';
const BOLT_BADGE_PATH = '/badge.js';

/**
 * Base44 apps keep pulling assets from Base44 infrastructure after moving to a custom domain.
 * Verified on giftmybook.com, the app in Base44's own published case study: it serves images
 * both from base44.app and from a `base44-prod` storage bucket. The bucket name is specific
 * enough not to collide with an unrelated project's storage.
 *
 * Caveat: only one real Base44 site has been captured so far, so this is less validated than
 * the Lovable/Framer/Bolt rules. Both markers are exact-match, so the false-positive risk is
 * low even if coverage is thin.
 */
const BASE44_ASSET_HOST = 'base44.app';
const BASE44_STORAGE_BUCKET = '/base44-prod/';

/** Exact hostnames (or their subdomains) a genuine "Made with X" badge would point at. */
const BADGE_HOST_NAMES: Readonly<Record<string, string>> = {
  'lovable.dev': 'Lovable',
  'bolt.new': 'Bolt',
  'v0.dev': 'v0',
  'v0.app': 'v0',
  'replit.com': 'Replit',
  'framer.com': 'Framer',
};
const BUILDER_BADGE_HOSTS = Object.keys(BADGE_HOST_NAMES);

/**
 * A badge is a provenance claim, so the link TEXT has to actually claim provenance. Without
 * this, an "Open in v0" action button (real case: ui.shadcn.com) reads as proof the site was
 * built by v0, when linking TO a builder is the opposite of being built BY one.
 */
const BADGE_TEXT_PATTERN =
  /\b(made|built|created|designed|generated)\s+(with|in|on|by)\b|\bedit\s+with\b|\bpowered\s+by\b/i;

/** Generator meta values that name a site builder (vs. a static site generator like Hugo). */
const BUILDER_GENERATOR_PATTERN = /\b(framer|webflow|lovable|wix|squarespace)\b/i;

export function detectBuilderFingerprints(snapshot: PageSnapshot): RuleResult[] {
  const results: RuleResult[] = [];
  const base = `https://${snapshot.hostname}/`;
  const strong = (
    id: BuilderFingerprintRuleId,
    label: string,
    evidence: string,
    builder?: string,
  ): RuleResult => ({
    id,
    tier: 'strong',
    label,
    evidence,
    builder,
  });

  const lovableScript = snapshot.scriptSrcs.find(
    (src) => hostnameOf(src, base) === LOVABLE_SCRIPT_HOST,
  );
  if (lovableScript) {
    results.push(strong('lovable-script', 'Lovable loader script', lovableScript, 'Lovable'));
  }

  const lovableRuntime = snapshot.scriptSrcs.find(
    (src) => pathnameOf(src, base) === LOVABLE_RUNTIME_PATH,
  );
  if (lovableRuntime) {
    results.push(strong('lovable-runtime-script', 'Lovable hosted runtime script', lovableRuntime, 'Lovable'));
  }

  const replitBanner = snapshot.scriptSrcs.find(
    (src) => pathnameOf(src, base) === REPLIT_BANNER_PATH,
  );
  if (replitBanner) {
    results.push(strong('replit-banner-script', 'Replit dev banner script', replitBanner, 'Replit'));
  }

  const boltBadge = snapshot.scriptSrcs.find((src) => {
    const url = parseUrl(src, base);
    return url?.hostname === BOLT_BADGE_HOST && url.pathname === BOLT_BADGE_PATH;
  });
  if (boltBadge) {
    results.push(strong('bolt-badge-script', 'Bolt badge script', boltBadge, 'Bolt'));
  }

  const base44Asset = snapshot.imageSrcs.find((src) => {
    if (src.includes(BASE44_STORAGE_BUCKET)) return true;
    const host = hostnameOf(src, base);
    return host != null && isSameOrSubdomain(host, BASE44_ASSET_HOST);
  });
  if (base44Asset) {
    results.push(strong('base44-assets', 'Base44 asset path', base44Asset, 'Base44'));
  }

  const lovableUpload = snapshot.imageSrcs.find((src) => src.includes('/lovable-uploads/'));
  if (lovableUpload) {
    results.push(strong('lovable-uploads-path', 'Lovable asset upload path', lovableUpload, 'Lovable'));
  }

  if (snapshot.generatorMeta && BUILDER_GENERATOR_PATTERN.test(snapshot.generatorMeta)) {
    results.push(
      strong(
        'generator-meta',
        'Builder named in generator meta tag',
        snapshot.generatorMeta,
        titleCase(snapshot.generatorMeta.match(BUILDER_GENERATOR_PATTERN)?.[1]),
      ),
    );
  }

  if (snapshot.builderMarkupHints.length > 0) {
    results.push(
      strong(
        'builder-markup',
        'Builder-generated markup attributes',
        snapshot.builderMarkupHints.map((hint) => `${hint} markup`).join(', '),
        titleCase(snapshot.builderMarkupHints[0]),
      ),
    );
  }

  const badgeHost = { name: undefined as string | undefined };
  const badgeLink = snapshot.badgeLinks.find((link) => {
    if (!BADGE_TEXT_PATTERN.test(link.text)) return false;
    const host = hostnameOf(link.href, base);
    if (host == null) return false;
    const matched = BUILDER_BADGE_HOSTS.find((domain) => isSameOrSubdomain(host, domain));
    if (!matched) return false;
    badgeHost.name = BADGE_HOST_NAMES[matched];
    return true;
  });
  if (badgeLink) {
    results.push(
      strong(
        'builder-badge-link',
        'Explicit "Made with" builder badge link',
        `"${badgeLink.text}" -> ${badgeLink.href}`,
        badgeHost.name,
      ),
    );
  }

  return results;
}

function parseUrl(url: string, base: string): URL | null {
  try {
    return new URL(url, base);
  } catch {
    return null;
  }
}

function hostnameOf(url: string, base: string): string | null {
  return parseUrl(url, base)?.hostname ?? null;
}

function pathnameOf(url: string, base: string): string | null {
  return parseUrl(url, base)?.pathname ?? null;
}

function isSameOrSubdomain(hostname: string, domain: string): boolean {
  return hostname === domain || hostname.endsWith(`.${domain}`);
}

/** 'framer' -> 'Framer'. Used to turn a matched marker into a display name. */
function titleCase(value: string | undefined): string | undefined {
  return value ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() : undefined;
}
