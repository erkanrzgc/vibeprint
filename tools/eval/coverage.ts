/**
 * Reports which detection rules have ever fired on the real captured corpus, and how the
 * ai-built half is distributed across builders.
 *
 * A rule that never fires on real data is not validated - it is an assumption with tests
 * around it. This is the same failure mode that hid four bugs before the corpus existed, so
 * it is worth surfacing explicitly rather than inferring from a green test suite.
 *
 * Run with: npm run eval:coverage
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAllRules } from '../../src/detection/rules';
import type { PageSnapshot } from '../../src/detection/types';

const CORPUS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../test/fixtures/corpus');

interface CorpusRecord {
  label: 'ai-built' | 'hand-built';
  builder: string | null;
  snapshot: PageSnapshot;
}

/** Every rule id the detector can emit. Keep in sync with src/detection/rules/*. */
const ALL_RULE_IDS = [
  'lovable-script',
  'lovable-runtime-script',
  'lovable-uploads-path',
  'replit-banner-script',
  'generator-meta',
  'builder-markup',
  'builder-badge-link',
  'shadcn-radix-dataset',
  'default-boilerplate',
  'platform-hosting-subdomain',
  'default-only-font',
  'buzzword-density',
  'stock-avatar-images',
] as const;

const corpus: CorpusRecord[] = readdirSync(CORPUS_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => JSON.parse(readFileSync(path.join(CORPUS_DIR, f), 'utf-8')) as CorpusRecord);

const fireCount = new Map<string, number>();
for (const record of corpus) {
  for (const result of runAllRules(record.snapshot)) {
    fireCount.set(result.id, (fireCount.get(result.id) ?? 0) + 1);
  }
}

const byBuilder = new Map<string, number>();
for (const record of corpus.filter((r) => r.label === 'ai-built')) {
  const key = record.builder ?? 'unknown';
  byBuilder.set(key, (byBuilder.get(key) ?? 0) + 1);
}

console.log('=== ai-built corpus by builder ===');
for (const [builder, n] of [...byBuilder].sort((a, b) => b[1] - a[1])) {
  console.log(`  ${builder.padEnd(10)}${String(n).padStart(3)}  ${'#'.repeat(n)}`);
}

console.log('\n=== rule validation against real data ===');
const unvalidated: string[] = [];
for (const id of ALL_RULE_IDS) {
  const n = fireCount.get(id) ?? 0;
  if (n === 0) unvalidated.push(id);
  console.log(`  ${(n === 0 ? 'NEVER' : `${n}x`).padEnd(6)} ${id}`);
}

console.log(`\ncorpus: ${corpus.length} sites, ${byBuilder.size} distinct builders represented`);
if (unvalidated.length > 0) {
  console.log(
    `\n${unvalidated.length} rule(s) never fire on real data - unvalidated assumptions:\n  ${unvalidated.join('\n  ')}`,
  );
  console.log('  (they may still be correct; they are simply untested against reality)');
}
