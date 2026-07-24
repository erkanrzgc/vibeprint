import type { RuleResult, RuleTier, Verdict, VerdictBucket } from './types';

const HIGH_THRESHOLD = 60;
const LOW_THRESHOLD = 25;
const MAX_SCORE = 100;

/**
 * The only place a tier is turned into a number. Rules declare a tier and nothing else —
 * a rule module cannot ship its own weight, so the tier-capping guarantee below can't be
 * undermined by one module quietly inflating itself.
 */
export const TIER_WEIGHTS: Readonly<Record<RuleTier, number>> = {
  strong: 65,
  medium: 25,
  weak: 10,
};

/**
 * Weighted aggregation of fired rules into a score (0-100) and a bucketed verdict.
 *
 * The honesty guarantee lives here: a "likely-ai-built" verdict requires BOTH a high score
 * AND at least one strong-tier rule. Medium/weak signals can push the score arbitrarily high
 * on their own (e.g. many weak hits), but without a strong-tier match that only reaches
 * "possibly-ai-assisted" — this is deliberate, since weak/medium signals alone (buzzwords,
 * hosting subdomain, default fonts) are exactly the kind of thing a legitimately hand-built
 * site can also have.
 */
export function scoreResults(results: RuleResult[]): Verdict {
  const rawScore = results.reduce((sum, result) => sum + TIER_WEIGHTS[result.tier], 0);
  const score = Math.min(rawScore, MAX_SCORE);
  const hasStrongSignal = results.some((result) => result.tier === 'strong');

  return { bucket: bucketFor(score, hasStrongSignal), score, results };
}

function bucketFor(score: number, hasStrongSignal: boolean): VerdictBucket {
  if (score === 0) return 'not-enough-signal';
  if (score >= HIGH_THRESHOLD && hasStrongSignal) return 'likely-ai-built';
  if (score >= LOW_THRESHOLD) return 'possibly-ai-assisted';
  return 'likely-hand-crafted';
}
