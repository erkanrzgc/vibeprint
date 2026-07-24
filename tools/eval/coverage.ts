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
import { ALL_RULE_IDS, runAllRules } from '../../src/detection/rules';
import { loadCorpus } from '../../test/helpers/loadCorpus';

const corpus = loadCorpus();

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
