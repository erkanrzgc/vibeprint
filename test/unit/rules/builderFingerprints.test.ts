import { describe, expect, it } from 'vitest';
import { detectBuilderFingerprints } from '../../../src/detection/rules/builderFingerprints';
import { makeSnapshot } from '../../helpers/makeSnapshot';
import type { PageSnapshot } from '../../../src/detection/types';
import lovableApp from '../../fixtures/snapshots/lovable-app.json';
import framerSite from '../../fixtures/snapshots/framer-site.json';
import replitApp from '../../fixtures/snapshots/replit-app.json';
import handBuiltPlain from '../../fixtures/snapshots/hand-built-plain.json';
import handBuiltBuzzwords from '../../fixtures/snapshots/hand-built-buzzwords.json';

const firedIds = (snapshot: PageSnapshot): string[] =>
  detectBuilderFingerprints(snapshot).map((r) => r.id);

describe('detectBuilderFingerprints', () => {
  it('detects the Lovable loader script and upload path as strong signals', () => {
    const results = detectBuilderFingerprints(lovableApp as PageSnapshot);

    expect(results.every((r) => r.tier === 'strong')).toBe(true);
    expect(results.map((r) => r.id)).toEqual(
      expect.arrayContaining(['lovable-script', 'lovable-uploads-path', 'builder-badge-link']),
    );
  });

  it('detects Framer markup and badge link as strong signals', () => {
    const results = detectBuilderFingerprints(framerSite as PageSnapshot);

    expect(results.every((r) => r.tier === 'strong')).toBe(true);
    expect(results.map((r) => r.id)).toEqual(
      expect.arrayContaining(['builder-markup', 'builder-badge-link']),
    );
  });

  it('detects a "Made in Replit" badge link as a strong signal', () => {
    const results = detectBuilderFingerprints(replitApp as PageSnapshot);

    expect(results.map((r) => r.id)).toContain('builder-badge-link');
    expect(results.find((r) => r.id === 'builder-badge-link')?.evidence).toContain('replit.com');
  });

  it('returns no results for a hand-built site with no builder fingerprints', () => {
    expect(detectBuilderFingerprints(handBuiltPlain as PageSnapshot)).toEqual([]);
  });

  it('does not false-positive on marketing buzzwords or stock avatars alone', () => {
    expect(detectBuilderFingerprints(handBuiltBuzzwords as PageSnapshot)).toEqual([]);
  });

  describe('Lovable runtime script (survives custom domains)', () => {
    // Discovered by capturing real sites: /~flock.js is served by Lovable-hosted apps and
    // survives custom-domain deploys where the badge and cdn.gpteng.co loader are gone.
    // Measured on the real corpus: present on 8/11 ai-built, 0/11 hand-built sites.
    it('detects the /~flock.js runtime as a strong signal', () => {
      const snapshot = makeSnapshot({
        hostname: 'checkon.app',
        scriptSrcs: ['/assets/index-abc.js', '/~flock.js'],
      });

      expect(firedIds(snapshot)).toContain('lovable-runtime-script');
    });

    it('does not fire on an unrelated script that merely contains the word flock', () => {
      const snapshot = makeSnapshot({ scriptSrcs: ['/js/flocking-simulation.js'] });

      expect(firedIds(snapshot)).not.toContain('lovable-runtime-script');
    });
  });

  describe('Bolt badge script', () => {
    // Found by capturing 8 real *.bolt.host sites: every one loads bolt.new/badge.js.
    // It is served from bolt.new itself, so unlike a rendered badge it survives even when
    // the visible badge is styled away.
    it('detects the Bolt badge script as a strong signal naming Bolt', () => {
      const snapshot = makeSnapshot({
        hostname: 'lessonpick.bolt.host',
        scriptSrcs: ['/assets/index-abc.js', 'https://bolt.new/badge.js?s=5f5007ab'],
      });

      const result = detectBuilderFingerprints(snapshot).find((r) => r.id === 'bolt-badge-script');
      expect(result).toMatchObject({ tier: 'strong', builder: 'Bolt' });
    });

    it('does not fire on an unrelated script merely named badge.js', () => {
      const snapshot = makeSnapshot({ scriptSrcs: ['https://example.com/badge.js'] });

      expect(firedIds(snapshot)).not.toContain('bolt-badge-script');
    });
  });

  describe('Base44 asset paths', () => {
    // Base44 apps keep serving assets from Base44 infrastructure after moving to a custom
    // domain - the same durability that makes Lovable's /lovable-uploads/ useful. Verified on
    // giftmybook.com, the app from Base44's own published case study.
    it('detects assets served from base44.app', () => {
      const snapshot = makeSnapshot({
        hostname: 'giftmybook.com',
        imageSrcs: ['https://base44.app/api/apps/689/files/abc.webp'],
      });

      const result = detectBuilderFingerprints(snapshot).find((r) => r.id === 'base44-assets');
      expect(result).toMatchObject({ tier: 'strong', builder: 'Base44' });
    });

    it('detects the base44-prod storage bucket path', () => {
      const snapshot = makeSnapshot({
        hostname: 'giftmybook.com',
        imageSrcs: ['https://xyz.supabase.co/storage/v1/object/public/base44-prod/public/a.png'],
      });

      expect(firedIds(snapshot)).toContain('base44-assets');
    });

    it('does not fire on an unrelated supabase storage bucket', () => {
      const snapshot = makeSnapshot({
        imageSrcs: ['https://xyz.supabase.co/storage/v1/object/public/my-assets/a.png'],
      });

      expect(firedIds(snapshot)).not.toContain('base44-assets');
    });
  });

  describe('generator meta tag', () => {
    // framer.com serves <meta name="generator" content="Framer 92482b8"> - an explicit
    // self-declaration that was being collected but never read by any rule.
    it('detects a builder that declares itself in the generator meta', () => {
      const snapshot = makeSnapshot({ generatorMeta: 'Framer 92482b8' });

      const result = detectBuilderFingerprints(snapshot).find((r) => r.id === 'generator-meta');
      expect(result).toBeDefined();
      expect(result?.tier).toBe('strong');
      expect(result?.evidence).toContain('Framer');
    });

    it('ignores a generator meta from a non-builder tool', () => {
      const snapshot = makeSnapshot({ generatorMeta: 'Hugo 0.120.4' });

      expect(firedIds(snapshot)).not.toContain('generator-meta');
    });
  });

  describe('badge link must be a provenance claim, not just any link to a builder', () => {
    // Real false positive found on ui.shadcn.com: an "Open in v0" button links to v0.dev.
    // Linking TO a builder is the opposite of evidence the site was BUILT BY it.
    it('does not treat an "Open in v0" action button as a builder badge', () => {
      const snapshot = makeSnapshot({
        hostname: 'ui.shadcn.com',
        badgeLinks: [{ href: 'https://v0.dev/chat/api/open?url=https://ui.shadcn.com', text: 'Open in' }],
      });

      expect(firedIds(snapshot)).not.toContain('builder-badge-link');
    });

    it.each([
      'Made with Lovable',
      'Built with Framer',
      'Edit with Lovable',
      'Made in Replit',
      'Powered by Framer',
      'Created with Bolt',
    ])('treats "%s" as a genuine builder badge', (text) => {
      const snapshot = makeSnapshot({ badgeLinks: [{ href: 'https://lovable.dev', text }] });

      expect(firedIds(snapshot)).toContain('builder-badge-link');
    });

    it('does not fire on a plain navigational link to a builder domain', () => {
      const snapshot = makeSnapshot({
        badgeLinks: [{ href: 'https://replit.com/pricing', text: 'Pricing' }],
      });

      expect(firedIds(snapshot)).not.toContain('builder-badge-link');
    });
  });

  describe('builder markup found document-wide', () => {
    // Real framer.com has 3300+ data-framer-* attributes on descendants but a bare
    // <html>/<body>, so an html/body-only check never fired.
    it('detects framer markup reported anywhere in the document', () => {
      const snapshot = makeSnapshot({ builderMarkupHints: ['framer'] });

      expect(firedIds(snapshot)).toContain('builder-markup');
    });

    it('detects webflow markup', () => {
      const snapshot = makeSnapshot({ builderMarkupHints: ['webflow'] });

      expect(firedIds(snapshot)).toContain('builder-markup');
    });
  });

  it('does not false-positive on a script whose path merely contains the Lovable host as a substring', () => {
    const snapshot = makeSnapshot({
      scriptSrcs: ['/js/cdn.gpteng.co-shim.js', 'https://example.com/cdn.gpteng.co.fake.js'],
    });

    expect(detectBuilderFingerprints(snapshot)).toEqual([]);
  });

  it('does not false-positive on a link whose URL merely mentions a builder name in its path', () => {
    const snapshot = makeSnapshot({
      badgeLinks: [{ href: 'https://example.com/posts/v0.dev-alternatives', text: 'Read more' }],
    });

    expect(detectBuilderFingerprints(snapshot)).toEqual([]);
  });

  it('does not throw when a script src or badge href is unparseable as a URL', () => {
    const snapshot = makeSnapshot({
      scriptSrcs: ['http://['],
      badgeLinks: [{ href: 'http://[', text: 'Made with Lovable' }],
    });

    expect(() => detectBuilderFingerprints(snapshot)).not.toThrow();
    expect(detectBuilderFingerprints(snapshot)).toEqual([]);
  });
});
