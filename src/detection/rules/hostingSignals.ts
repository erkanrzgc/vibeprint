import type { PageSnapshot, RuleResult } from '../types';

/** Every rule id this module can emit — aggregated into ALL_RULE_IDS in rules/index.ts. */
export const HOSTING_SIGNAL_RULE_IDS = ['platform-hosting-subdomain', 'default-only-font'] as const;

type HostingSignalRuleId = (typeof HOSTING_SIGNAL_RULE_IDS)[number];

const PLATFORM_HOSTING_SUFFIXES = [
  // Generic PaaS: weak on their own, plenty of hand-built hobby projects live here.
  '.vercel.app',
  '.netlify.app',
  '.pages.dev',
  '.replit.app',
  // Builder-owned hosting. These were missing until tools/eval/coverage.ts showed this rule
  // never fired on a corpus containing 20+ *.lovable.app sites. Still weak-tier: the strong
  // builder fingerprints carry the verdict, this only corroborates.
  '.lovable.app',
  '.framer.website',
  '.framer.app',
  '.base44.app',
  '.created.app',
  '.bolt.host',
];

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
      id: 'platform-hosting-subdomain' satisfies HostingSignalRuleId,
      tier: 'weak',
      label: 'Hosted on a builder platform subdomain, no custom domain',
      evidence: snapshot.hostname,
    });
  }

  const font = snapshot.fontFamilySample?.split(',')[0]?.trim().toLowerCase();
  if (font && DEFAULT_ONLY_FONTS.includes(font)) {
    results.push({
      id: 'default-only-font' satisfies HostingSignalRuleId,
      tier: 'weak',
      label: 'Uses only a builder-default font, no custom typography',
      evidence: snapshot.fontFamilySample!,
    });
  }

  return results;
}
