import { identifyBuilder } from '../../src/detection/identifyBuilder';
import type { Verdict, VerdictBucket } from '../../src/detection/types';

const BUCKET_COPY: Record<VerdictBucket, { label: string; caption: string }> = {
  'likely-ai-built': {
    label: 'Likely AI-built',
    caption: 'Strong builder fingerprints found on this page.',
  },
  'possibly-ai-assisted': {
    label: 'Possibly AI-assisted',
    caption: 'Some corroborating signals, but nothing conclusive.',
  },
  'likely-hand-crafted': {
    label: 'Likely hand-crafted',
    caption: 'Barely any AI-builder signal detected.',
  },
  'not-enough-signal': {
    label: 'Not enough signal',
    caption: 'No fingerprints found. Common once a site moves to its own domain.',
  },
};

const CONFIDENCE_STEPS = 20;

interface ResultViewProps {
  verdict: Verdict;
}

export function ResultView({ verdict }: ResultViewProps) {
  const copy = BUCKET_COPY[verdict.bucket];
  const builder = identifyBuilder(verdict.results);
  const litSteps = Math.round((verdict.score / 100) * CONFIDENCE_STEPS);

  return (
    <section className={`result result--${verdict.bucket}`} aria-label="Scan result">
      <p className="result__verdict">{copy.label}</p>

      {builder && (
        <p className="result__builder">
          <span className="result__builder-mark" aria-hidden="true" />
          Fingerprint matches <strong>{builder}</strong>
        </p>
      )}

      <div
        className="result__gauge"
        role="meter"
        aria-valuenow={verdict.score}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label="Signal strength"
      >
        {Array.from({ length: CONFIDENCE_STEPS }, (_, i) => (
          <span
            key={i}
            className={`result__tick${i < litSteps ? ' result__tick--lit' : ''}`}
            style={{ transitionDelay: `${i * 18}ms` }}
          />
        ))}
      </div>

      <p className="result__scale">
        <span className="result__score">{verdict.score}</span>
        <span className="result__scale-unit">/100 signal</span>
      </p>

      <p className="result__caption">{copy.caption}</p>
    </section>
  );
}
