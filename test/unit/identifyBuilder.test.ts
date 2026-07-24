import { describe, expect, it } from 'vitest';
import { identifyBuilder } from '../../src/detection/identifyBuilder';
import type { RuleResult } from '../../src/detection/types';

function rule(id: string, builder?: string, tier: RuleResult['tier'] = 'strong'): RuleResult {
  return { id, tier, label: id, evidence: id, builder };
}

describe('identifyBuilder', () => {
  it('returns null when no rule names a builder', () => {
    expect(identifyBuilder([rule('default-only-font', undefined, 'weak')])).toBeNull();
  });

  it('returns null for an empty result set', () => {
    expect(identifyBuilder([])).toBeNull();
  });

  it('names the builder when strong rules agree', () => {
    const results = [
      rule('lovable-runtime-script', 'Lovable'),
      rule('builder-badge-link', 'Lovable'),
    ];

    expect(identifyBuilder(results)).toBe('Lovable');
  });

  it('prefers the builder backed by the most strong-tier evidence', () => {
    const results = [
      rule('generator-meta', 'Framer'),
      rule('builder-markup', 'Framer'),
      rule('builder-badge-link', 'Replit'),
    ];

    expect(identifyBuilder(results)).toBe('Framer');
  });

  it('ignores builders named only by weak-tier rules', () => {
    // A weak signal should never be enough to put a specific company's name on screen.
    const results = [rule('platform-hosting-subdomain', 'Lovable', 'weak')];

    expect(identifyBuilder(results)).toBeNull();
  });
});
