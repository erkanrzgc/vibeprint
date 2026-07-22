import { describe, expect, it } from 'vitest';
import { detectCodePatterns } from '../../../src/detection/rules/codePatterns';
import { makeSnapshot } from '../../helpers/makeSnapshot';
import type { PageSnapshot } from '../../../src/detection/types';
import v0VercelApp from '../../fixtures/snapshots/v0-vercel-app.json';
import boltNetlifyApp from '../../fixtures/snapshots/bolt-netlify-app.json';
import handBuiltPlain from '../../fixtures/snapshots/hand-built-plain.json';

describe('detectCodePatterns', () => {
  it('detects shadcn + Radix co-occurrence as a medium signal', () => {
    const results = detectCodePatterns(v0VercelApp as PageSnapshot);

    expect(results).toContainEqual(
      expect.objectContaining({ id: 'shadcn-radix-dataset', tier: 'medium' }),
    );
  });

  it('detects an un-customized Vite favicon as a medium signal', () => {
    const results = detectCodePatterns(boltNetlifyApp as PageSnapshot);

    expect(results).toContainEqual(
      expect.objectContaining({ id: 'default-boilerplate', tier: 'medium' }),
    );
  });

  it('does not fire on a single generic Radix-adjacent key without shadcn\'s data-slot', () => {
    const snapshot = makeSnapshot({ componentDatasetKeys: ['state'] });

    expect(detectCodePatterns(snapshot)).toEqual([]);
  });

  it('returns no results for a hand-built site with a custom favicon and title', () => {
    expect(detectCodePatterns(handBuiltPlain as PageSnapshot)).toEqual([]);
  });

  it('detects an un-customized default title even with a non-default favicon', () => {
    const snapshot = makeSnapshot({ title: 'React App', faviconHref: '/custom-favicon.png' });

    const results = detectCodePatterns(snapshot);

    expect(results).toContainEqual(
      expect.objectContaining({ id: 'default-boilerplate', evidence: 'React App' }),
    );
  });
});
