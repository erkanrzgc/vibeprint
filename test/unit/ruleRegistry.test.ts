import { describe, expect, it } from 'vitest';
import { ALL_RULE_IDS, runAllRules } from '../../src/detection/rules';
import { loadCorpus } from '../helpers/loadCorpus';

/**
 * Guards the rule-id registry against drift. tools/eval/coverage.ts once kept its own
 * hand-maintained copy of "every rule id" and silently lost track of two rules
 * (bolt-badge-script, base44-assets) — the registry now lives next to the rules, and this
 * test catches a rule module whose ids were never aggregated into ALL_RULE_IDS.
 */
describe('rule-id registry', () => {
  it('contains no duplicate ids', () => {
    expect(new Set(ALL_RULE_IDS).size).toBe(ALL_RULE_IDS.length);
  });

  it('covers every rule that actually fires on the real corpus', () => {
    const known = new Set<string>(ALL_RULE_IDS);
    const unregistered = new Set<string>();

    for (const record of loadCorpus()) {
      for (const result of runAllRules(record.snapshot)) {
        if (!known.has(result.id)) unregistered.add(result.id);
      }
    }

    expect([...unregistered]).toEqual([]);
  });
});
