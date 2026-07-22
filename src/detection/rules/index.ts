import type { PageSnapshot, RuleResult } from '../types';
import { detectBuilderFingerprints } from './builderFingerprints';
import { detectCodePatterns } from './codePatterns';
import { detectHostingSignals } from './hostingSignals';
import { detectCopyHeuristics } from './copyHeuristics';

export function runAllRules(snapshot: PageSnapshot): RuleResult[] {
  return [
    ...detectBuilderFingerprints(snapshot),
    ...detectCodePatterns(snapshot),
    ...detectHostingSignals(snapshot),
    ...detectCopyHeuristics(snapshot),
  ];
}
