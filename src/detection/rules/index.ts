import type { PageSnapshot, RuleResult } from '../types';
import { BUILDER_FINGERPRINT_RULE_IDS, detectBuilderFingerprints } from './builderFingerprints';
import { CODE_PATTERN_RULE_IDS, detectCodePatterns } from './codePatterns';
import { HOSTING_SIGNAL_RULE_IDS, detectHostingSignals } from './hostingSignals';
import { COPY_HEURISTIC_RULE_IDS, detectCopyHeuristics } from './copyHeuristics';

/**
 * The complete rule-id registry, assembled from the per-module lists that live next to the
 * rules themselves. Anything that needs "every rule that exists" (tools/eval/coverage.ts,
 * the drift-guard test) reads this — a second hand-maintained copy is how coverage.ts once
 * silently lost track of two rules.
 */
export const ALL_RULE_IDS = [
  ...BUILDER_FINGERPRINT_RULE_IDS,
  ...CODE_PATTERN_RULE_IDS,
  ...HOSTING_SIGNAL_RULE_IDS,
  ...COPY_HEURISTIC_RULE_IDS,
] as const;

export function runAllRules(snapshot: PageSnapshot): RuleResult[] {
  return [
    ...detectBuilderFingerprints(snapshot),
    ...detectCodePatterns(snapshot),
    ...detectHostingSignals(snapshot),
    ...detectCopyHeuristics(snapshot),
  ];
}
