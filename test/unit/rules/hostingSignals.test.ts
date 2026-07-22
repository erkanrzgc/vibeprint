import { describe, expect, it } from 'vitest';
import { detectHostingSignals } from '../../../src/detection/rules/hostingSignals';
import { makeSnapshot } from '../../helpers/makeSnapshot';
import type { PageSnapshot } from '../../../src/detection/types';
import boltNetlifyApp from '../../fixtures/snapshots/bolt-netlify-app.json';
import v0VercelApp from '../../fixtures/snapshots/v0-vercel-app.json';
import handBuiltPlain from '../../fixtures/snapshots/hand-built-plain.json';

describe('detectHostingSignals', () => {
  it('flags a *.netlify.app hostname as a weak hosting signal', () => {
    const results = detectHostingSignals(boltNetlifyApp as PageSnapshot);

    expect(results).toContainEqual(
      expect.objectContaining({ id: 'platform-hosting-subdomain', tier: 'weak' }),
    );
  });

  it('flags a Geist-only font sample as a weak signal', () => {
    const results = detectHostingSignals(v0VercelApp as PageSnapshot);

    expect(results).toContainEqual(expect.objectContaining({ id: 'default-only-font', tier: 'weak' }));
  });

  it('returns no results for a custom domain with a custom font', () => {
    expect(detectHostingSignals(handBuiltPlain as PageSnapshot)).toEqual([]);
  });

  it('does not flag a hostname that merely contains a platform name as a subdomain suffix', () => {
    const snapshot = makeSnapshot({ hostname: 'myvercel.app.example.com' });

    expect(detectHostingSignals(snapshot)).toEqual([]);
  });
});
