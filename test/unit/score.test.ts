import { describe, expect, it } from 'vitest';
import { scoreResults } from '../../src/detection/score';
import type { RuleResult } from '../../src/detection/types';

function weak(id: string, weight = 10): RuleResult {
  return { id, tier: 'weak', label: id, weight, evidence: id };
}
function medium(id: string, weight = 25): RuleResult {
  return { id, tier: 'medium', label: id, weight, evidence: id };
}
function strong(id: string, weight = 65): RuleResult {
  return { id, tier: 'strong', label: id, weight, evidence: id };
}

describe('scoreResults', () => {
  it('returns "not-enough-signal" with score 0 when no rules fired', () => {
    const verdict = scoreResults([]);

    expect(verdict).toEqual({ bucket: 'not-enough-signal', score: 0, results: [] });
  });

  it('returns "likely-hand-crafted" for a single weak signal (low, non-zero score)', () => {
    const results = [weak('a')];
    const verdict = scoreResults(results);

    expect(verdict.score).toBe(10);
    expect(verdict.bucket).toBe('likely-hand-crafted');
  });

  it('returns "possibly-ai-assisted" once weak/medium signals cross the low threshold', () => {
    const results = [medium('a'), weak('b')];
    const verdict = scoreResults(results);

    expect(verdict.score).toBe(35);
    expect(verdict.bucket).toBe('possibly-ai-assisted');
  });

  it('caps at "possibly-ai-assisted" even when many weak signals sum past the high threshold, with no strong signal', () => {
    const results = [weak('a'), weak('b'), weak('c'), weak('d'), weak('e'), weak('f'), weak('g')];
    const verdict = scoreResults(results);

    expect(verdict.score).toBeGreaterThanOrEqual(60);
    expect(verdict.bucket).toBe('possibly-ai-assisted');
  });

  it('returns "likely-ai-built" when a strong signal is present and the score clears the high threshold', () => {
    const verdict = scoreResults([strong('a')]);

    expect(verdict.score).toBe(65);
    expect(verdict.bucket).toBe('likely-ai-built');
  });

  it('clamps the score at 100 when multiple strong signals fire', () => {
    const verdict = scoreResults([strong('a'), strong('b'), strong('c')]);

    expect(verdict.score).toBe(100);
    expect(verdict.bucket).toBe('likely-ai-built');
  });

  it('preserves the original rule results on the verdict for the popup breakdown list', () => {
    const results = [strong('lovable-script')];
    const verdict = scoreResults(results);

    expect(verdict.results).toBe(results);
  });
});
