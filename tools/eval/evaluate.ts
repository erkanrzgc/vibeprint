/**
 * Scores the captured real-site corpus and reports precision/recall for the "likely-ai-built"
 * verdict. Run with: npm run eval
 *
 * Ground-truth caveat: `ai-built` labels come from builder-owned subdomains (self-labeling)
 * or a builder's own public showcase; `hand-built` labels are sites that predate the AI
 * builders or have long public git histories. Neither is infallible - treat these numbers as
 * directional, not certified.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runAllRules } from '../../src/detection/rules';
import { scoreResults } from '../../src/detection/score';
import type { PageSnapshot, VerdictBucket } from '../../src/detection/types';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CORPUS_DIR = path.resolve(__dirname, '../../test/fixtures/corpus');

type Label = 'ai-built' | 'hand-built';

interface CorpusRecord {
  url: string;
  label: Label;
  builder: string | null;
  difficulty?: string;
  note?: string | null;
  snapshot: PageSnapshot;
}

async function loadCorpus(): Promise<CorpusRecord[]> {
  const files = (await readdir(CORPUS_DIR)).filter((f) => f.endsWith('.json'));
  const records = await Promise.all(
    files.map(async (file) => JSON.parse(await readFile(path.join(CORPUS_DIR, file), 'utf-8'))),
  );
  return records as CorpusRecord[];
}

function pad(value: string, width: number): string {
  return value.length > width ? `${value.slice(0, width - 1)}…` : value.padEnd(width);
}

async function main(): Promise<void> {
  const corpus = await loadCorpus();

  let tp = 0;
  let fp = 0;
  let fn = 0;
  let tn = 0;
  const rows: string[] = [];

  const sorted = [...corpus].sort((a, b) => a.label.localeCompare(b.label) || a.url.localeCompare(b.url));

  for (const record of sorted) {
    const verdict = scoreResults(runAllRules(record.snapshot));
    const predictedAi: boolean = verdict.bucket === 'likely-ai-built';
    const actualAi = record.label === 'ai-built';

    if (actualAi && predictedAi) tp++;
    else if (!actualAi && predictedAi) fp++;
    else if (actualAi && !predictedAi) fn++;
    else tn++;

    const outcome = actualAi === predictedAi ? '   ' : (actualAi ? 'MISS' : 'FALSE+');
    const firedIds = verdict.results.map((r) => r.id).join(',') || '-';
    rows.push(
      `${pad(outcome, 7)}${pad(record.label, 11)}${pad(record.difficulty ?? '-', 6)}` +
        `${pad(new URL(record.url).hostname, 32)}${pad(verdict.bucket, 22)}` +
        `${String(verdict.score).padStart(3)}  ${firedIds}`,
    );
  }

  const header =
    `${pad('', 7)}${pad('label', 11)}${pad('diff', 6)}${pad('host', 32)}${pad('verdict', 22)}${'score'.padStart(5)}  rules fired`;
  console.log(header);
  console.log('-'.repeat(header.length + 20));
  rows.forEach((r) => console.log(r));

  const precision = tp + fp === 0 ? 1 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 1 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);

  console.log(`\nCorpus: ${corpus.length} sites  (${tp + fn} ai-built, ${tn + fp} hand-built)`);
  console.log(`Confusion (positive = "likely-ai-built"):  TP=${tp}  FP=${fp}  FN=${fn}  TN=${tn}`);
  console.log(
    `Precision=${precision.toFixed(3)}  Recall=${recall.toFixed(3)}  F1=${f1.toFixed(3)}`,
  );

  // Precision is the number that matters most: a false "likely-ai-built" accusation about
  // someone's hand-written site is the worst failure this tool can produce.
  console.log(
    `\nFalse accusations (hand-built called likely-ai-built): ${fp}` +
      (fp === 0 ? '  <- good' : '  <- MUST FIX'),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
