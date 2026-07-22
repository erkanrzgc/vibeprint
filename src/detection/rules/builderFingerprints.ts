import type { PageSnapshot, RuleResult } from '../types';

const STRONG_WEIGHT = 65;

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

/** Exact hostnames (or their subdomains) a genuine "Made with X" badge would point at. */
const BUILDER_BADGE_HOSTS = [
  'lovable.dev',
  'bolt.new',
  'v0.dev',
  'v0.app',
  'replit.com',
  'framer.com',
];

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
  const strong = (id: string, label: string, evidence: string): RuleResult => ({
    id,
    tier: 'strong',
    label,
    weight: STRONG_WEIGHT,
    evidence,
  });

  const lovableScript = snapshot.scriptSrcs.find(
    (src) => hostnameOf(src, base) === LOVABLE_SCRIPT_HOST,
  );
  if (lovableScript) {
    results.push(strong('lovable-script', 'Lovable loader script', lovableScript));
  }

  const lovableRuntime = snapshot.scriptSrcs.find(
    (src) => pathnameOf(src, base) === LOVABLE_RUNTIME_PATH,
  );
  if (lovableRuntime) {
    results.push(strong('lovable-runtime-script', 'Lovable hosted runtime script', lovableRuntime));
  }

  const replitBanner = snapshot.scriptSrcs.find(
    (src) => pathnameOf(src, base) === REPLIT_BANNER_PATH,
  );
  if (replitBanner) {
    results.push(strong('replit-banner-script', 'Replit dev banner script', replitBanner));
  }

  const lovableUpload = snapshot.imageSrcs.find((src) => src.includes('/lovable-uploads/'));
  if (lovableUpload) {
    results.push(strong('lovable-uploads-path', 'Lovable asset upload path', lovableUpload));
  }

  if (snapshot.generatorMeta && BUILDER_GENERATOR_PATTERN.test(snapshot.generatorMeta)) {
    results.push(
      strong('generator-meta', 'Builder named in generator meta tag', snapshot.generatorMeta),
    );
  }

  if (snapshot.builderMarkupHints.length > 0) {
    results.push(
      strong(
        'builder-markup',
        'Builder-generated markup attributes',
        snapshot.builderMarkupHints.map((hint) => `${hint} markup`).join(', '),
      ),
    );
  }

  const badgeLink = snapshot.badgeLinks.find((link) => {
    if (!BADGE_TEXT_PATTERN.test(link.text)) return false;
    const host = hostnameOf(link.href, base);
    return host != null && BUILDER_BADGE_HOSTS.some((domain) => isSameOrSubdomain(host, domain));
  });
  if (badgeLink) {
    results.push(
      strong(
        'builder-badge-link',
        'Explicit "Made with" builder badge link',
        `"${badgeLink.text}" -> ${badgeLink.href}`,
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
