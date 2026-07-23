import type { RuleResult } from './types';

/**
 * Picks which builder to name in the UI, based on the fired rules.
 *
 * Only strong-tier signals count: putting a specific company's name on screen is a concrete
 * claim, and weak signals (hosting subdomain, default font) are exactly the ones a hand-built
 * site can also trip. When several builders are implicated, the one with the most strong
 * evidence wins.
 */
export function identifyBuilder(results: RuleResult[]): string | null {
  const tally = new Map<string, number>();

  for (const result of results) {
    if (result.tier !== 'strong' || !result.builder) continue;
    tally.set(result.builder, (tally.get(result.builder) ?? 0) + 1);
  }

  let best: string | null = null;
  let bestCount = 0;
  for (const [builder, count] of tally) {
    if (count > bestCount) {
      best = builder;
      bestCount = count;
    }
  }

  return best;
}
