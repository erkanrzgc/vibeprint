import { describe, expect, it } from 'vitest';
import { runAllRules } from '../../src/detection/rules';
import { scoreResults } from '../../src/detection/score';
import { loadCorpus } from '../helpers/loadCorpus';

const corpus = loadCorpus();

const predictions = corpus.map((record) => ({
  ...record,
  bucket: scoreResults(runAllRules(record.snapshot)).bucket,
}));

const tp = predictions.filter(
  (p) => p.label === 'ai-built' && p.bucket === 'likely-ai-built',
).length;
const fp = predictions.filter((p) => p.label === 'hand-built' && p.bucket === 'likely-ai-built');
const fn = predictions.filter(
  (p) => p.label === 'ai-built' && p.bucket !== 'likely-ai-built',
).length;

/**
 * Regression guard over snapshots captured from REAL sites (see tools/capture). Unlike the
 * hand-written fixtures in ../fixtures/snapshots, these encode what live pages actually
 * serve, so they catch the class of bug that green unit tests hid: rules that look correct
 * but never fire on real markup.
 */
describe('real-site corpus', () => {
  it('has a balanced, non-trivial corpus', () => {
    expect(corpus.length).toBeGreaterThanOrEqual(50);
    expect(corpus.filter((r) => r.label === 'ai-built').length).toBeGreaterThanOrEqual(25);
    expect(corpus.filter((r) => r.label === 'hand-built').length).toBeGreaterThanOrEqual(25);
  });

  it('never calls a known hand-built site "likely-ai-built"', () => {
    // Precision is the metric that matters most here: falsely accusing someone's hand-written
    // site is the worst output this tool can produce. Regressions must fail loudly.
    expect(fp.map((p) => new URL(p.url).hostname)).toEqual([]);
  });

  it('catches at least 90% of known AI-built sites', () => {
    const recall = tp / (tp + fn);
    expect(recall).toBeGreaterThanOrEqual(0.9);
  });

  it('detects Framer sites via generator meta / builder markup, not just badges', () => {
    // Framer labels in the corpus are evidence-backed: every one was confirmed by a
    // <meta name="generator" content="Framer ..."> tag at capture time. Sites that merely
    // appeared in Framer's gallery without any such trace were dropped rather than guessed at.
    const framerSites = predictions.filter((p) => p.builder === 'framer');

    expect(framerSites.length).toBeGreaterThanOrEqual(5);
    framerSites.forEach((site) => expect(site.bucket).toBe('likely-ai-built'));
  });

  it('does not accuse modern hand-built SaaS/framework sites that share the AI-template aesthetic', () => {
    // The highest-risk false positives: Geist/Inter fonts, shadcn+Radix markup, dark gradient
    // heroes, Vercel hosting - all present here, all hand-built.
    const riskyHosts = ['vercel.com', 'ui.shadcn.com', 'resend.com', 'supabase.com', 'clerk.com'];
    const risky = predictions.filter((p) => riskyHosts.includes(p.snapshot.hostname));

    expect(risky.length).toBeGreaterThanOrEqual(4);
    risky.forEach((site) => expect(site.bucket).not.toBe('likely-ai-built'));
  });

  it('detects Lovable sites that kept the platform subdomain', () => {
    const subdomainSites = predictions.filter((p) => p.snapshot.hostname.endsWith('.lovable.app'));

    expect(subdomainSites.length).toBeGreaterThan(0);
    subdomainSites.forEach((site) => expect(site.bucket).toBe('likely-ai-built'));
  });

  it('still detects Lovable sites deployed to a custom domain', () => {
    // The hard case, and the reason the /~flock.js runtime rule exists: these sites have no
    // badge, no cdn.gpteng.co loader, and no builder subdomain left.
    const customDomain = predictions.filter(
      (p) => p.builder === 'lovable' && !p.snapshot.hostname.endsWith('.lovable.app'),
    );

    const detected = customDomain.filter((p) => p.bucket === 'likely-ai-built');
    expect(detected.length).toBeGreaterThanOrEqual(Math.ceil(customDomain.length * 0.7));
  });

  it('does not mistake the shadcn/ui docs for an AI-built site', () => {
    // Regression test for a real false positive: ui.shadcn.com has maximum data-slot/Radix
    // density plus an "Open in v0" button that used to read as a builder badge.
    const shadcn = predictions.find((p) => p.snapshot.hostname === 'ui.shadcn.com');

    expect(shadcn).toBeDefined();
    expect(shadcn?.bucket).not.toBe('likely-ai-built');
  });
});
