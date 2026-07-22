import type { PageSnapshot, RuleResult } from '../types';

const WEAK_WEIGHT = 10;
const MIN_BUZZWORD_HITS = 2;

const BUZZWORD_PHRASES = [
  'revolutionize',
  'revolutionary',
  'cutting-edge',
  'cutting edge',
  'seamless',
  'seamlessly',
  'supercharge',
  'unlock the power',
  'empower',
  'game-changing',
  'game changer',
  'next-level',
  'next level',
  'elevate your',
  'unleash',
];

const STOCK_AVATAR_HOSTS = ['pravatar.cc', 'randomuser.me', 'ui-avatars.com'];

/**
 * Weak, supporting-only signals from visible copy and imagery. Deliberately capped to
 * "weak" tier and requires >=2 buzzword hits (not just one incidental word) — a single
 * legitimately hand-written marketing page can easily use one of these words in passing.
 */
export function detectCopyHeuristics(snapshot: PageSnapshot): RuleResult[] {
  const results: RuleResult[] = [];

  const text = snapshot.bodyTextSample.toLowerCase();
  const matchedPhrases = BUZZWORD_PHRASES.filter((phrase) => text.includes(phrase));
  if (matchedPhrases.length >= MIN_BUZZWORD_HITS) {
    results.push({
      id: 'buzzword-density',
      tier: 'weak',
      label: 'Dense generic marketing buzzwords',
      weight: WEAK_WEIGHT,
      evidence: matchedPhrases.join(', '),
    });
  }

  const stockAvatar = snapshot.imageSrcs.find((src) =>
    STOCK_AVATAR_HOSTS.some((host) => src.includes(host)),
  );
  if (stockAvatar) {
    results.push({
      id: 'stock-avatar-images',
      tier: 'weak',
      label: 'Testimonial images from a stock/placeholder avatar service',
      weight: WEAK_WEIGHT,
      evidence: stockAvatar,
    });
  }

  return results;
}
