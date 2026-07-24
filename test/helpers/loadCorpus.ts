import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { PageSnapshot } from '../../src/detection/types';

export type CorpusLabel = 'ai-built' | 'hand-built';

/** Shape of one file in test/fixtures/corpus, as written by tools/capture/capture.mjs. */
export interface CorpusRecord {
  url: string;
  label: CorpusLabel;
  builder: string | null;
  difficulty?: string;
  note?: string | null;
  capturedAt?: string;
  snapshot: PageSnapshot;
}

const CORPUS_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../fixtures/corpus');

/**
 * Loads every captured real-site snapshot. Shared by the corpus regression test and the
 * eval/coverage tools so all three agree on what a corpus record looks like.
 */
export function loadCorpus(): CorpusRecord[] {
  return readdirSync(CORPUS_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => JSON.parse(readFileSync(path.join(CORPUS_DIR, file), 'utf-8')) as CorpusRecord);
}
