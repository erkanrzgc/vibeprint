import { describe, expect, it } from 'vitest';
import { runAllRules } from '../../src/detection/rules';
import { scoreResults } from '../../src/detection/score';
import type { PageSnapshot, VerdictBucket } from '../../src/detection/types';
import lovableApp from '../fixtures/snapshots/lovable-app.json';
import framerSite from '../fixtures/snapshots/framer-site.json';
import replitApp from '../fixtures/snapshots/replit-app.json';
import boltNetlifyApp from '../fixtures/snapshots/bolt-netlify-app.json';
import v0VercelApp from '../fixtures/snapshots/v0-vercel-app.json';
import handBuiltPlain from '../fixtures/snapshots/hand-built-plain.json';
import handBuiltBuzzwords from '../fixtures/snapshots/hand-built-buzzwords.json';
import handBuiltVercelHobby from '../fixtures/snapshots/hand-built-vercel-hobby.json';

function verdictFor(snapshot: PageSnapshot): VerdictBucket {
  return scoreResults(runAllRules(snapshot)).bucket;
}

describe('detection pipeline against the fixture corpus', () => {
  it('confidently flags known AI-builder outputs that still carry their badge/fingerprint', () => {
    expect(verdictFor(lovableApp as PageSnapshot)).toBe('likely-ai-built');
    expect(verdictFor(framerSite as PageSnapshot)).toBe('likely-ai-built');
    expect(verdictFor(replitApp as PageSnapshot)).toBe('likely-ai-built');
  });

  it('stays non-committal on builder outputs whose only trace is code-pattern/hosting signals', () => {
    expect(verdictFor(boltNetlifyApp as PageSnapshot)).toBe('possibly-ai-assisted');
    expect(verdictFor(v0VercelApp as PageSnapshot)).toBe('possibly-ai-assisted');
  });

  it('never calls a hand-built site "likely-ai-built" just from buzzwords, stock avatars, and generic hosting', () => {
    // This is the key false-positive guard: a legitimately hand-built marketing page can have
    // all three of these weak signals at once. The tier-capping rule in score.ts must hold.
    expect(verdictFor(handBuiltBuzzwords as PageSnapshot)).toBe('possibly-ai-assisted');
  });

  it('is honest that a plain custom-domain site with no signals means "not enough signal", not "hand-crafted"', () => {
    expect(verdictFor(handBuiltPlain as PageSnapshot)).toBe('not-enough-signal');
  });

  it('leans hand-crafted for a hobby project with exactly one weak signal', () => {
    expect(verdictFor(handBuiltVercelHobby as PageSnapshot)).toBe('likely-hand-crafted');
  });
});
