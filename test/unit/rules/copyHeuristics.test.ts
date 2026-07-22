import { describe, expect, it } from 'vitest';
import { detectCopyHeuristics } from '../../../src/detection/rules/copyHeuristics';
import { makeSnapshot } from '../../helpers/makeSnapshot';
import type { PageSnapshot } from '../../../src/detection/types';
import handBuiltBuzzwords from '../../fixtures/snapshots/hand-built-buzzwords.json';
import handBuiltPlain from '../../fixtures/snapshots/hand-built-plain.json';

describe('detectCopyHeuristics', () => {
  it('flags dense marketing buzzwords and stock avatar images', () => {
    const results = detectCopyHeuristics(handBuiltBuzzwords as PageSnapshot);

    expect(results).toContainEqual(expect.objectContaining({ id: 'buzzword-density', tier: 'weak' }));
    expect(results).toContainEqual(
      expect.objectContaining({ id: 'stock-avatar-images', tier: 'weak' }),
    );
  });

  it('does not fire on a single incidental buzzword-like word', () => {
    const snapshot = makeSnapshot({
      bodyTextSample: 'Our new update makes checkout seamless for returning customers.',
    });

    expect(detectCopyHeuristics(snapshot).map((r) => r.id)).not.toContain('buzzword-density');
  });

  it('returns no results for plain, non-buzzwordy copy with real photos', () => {
    expect(detectCopyHeuristics(handBuiltPlain as PageSnapshot)).toEqual([]);
  });
});
