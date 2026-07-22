import type { PageSnapshot, RuleResult } from '../types';

const WEAK_WEIGHT = 10;

const PLATFORM_HOSTING_SUFFIXES = ['.vercel.app', '.netlify.app', '.pages.dev', '.replit.app'];

const DEFAULT_ONLY_FONTS = ['inter', 'geist'];

/**
 * Weak corroborating signals: hosting on a platform's own subdomain (no custom domain
 * mapped) and defaulting to a builder-favorite font. Both are common legitimate choices
 * for hand-built hobby projects too, so these only ever nudge the score — see score.ts for
 * the tier-capping rule that stops weak signals alone from reaching "likely-ai-built".
 */
export function detectHostingSignals(snapshot: PageSnapshot): RuleResult[] {
  const results: RuleResult[] = [];

  const matchedSuffix = PLATFORM_HOSTING_SUFFIXES.find((suffix) =>
    snapshot.hostname.endsWith(suffix),
  );
  if (matchedSuffix) {
    results.push({
      id: 'platform-hosting-subdomain',
      tier: 'weak',
      label: 'Hosted on a builder platform subdomain, no custom domain',
      weight: WEAK_WEIGHT,
      evidence: snapshot.hostname,
    });
  }

  const font = snapshot.fontFamilySample?.split(',')[0]?.trim().toLowerCase();
  if (font && DEFAULT_ONLY_FONTS.includes(font)) {
    results.push({
      id: 'default-only-font',
      tier: 'weak',
      label: 'Uses only a builder-default font, no custom typography',
      weight: WEAK_WEIGHT,
      evidence: snapshot.fontFamilySample!,
    });
  }

  return results;
}
