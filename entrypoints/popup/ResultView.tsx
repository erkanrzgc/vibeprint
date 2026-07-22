import type { Verdict, VerdictBucket } from '../../src/detection/types';

const BUCKET_COPY: Record<VerdictBucket, { label: string; caption: string }> = {
  'likely-ai-built': {
    label: 'Likely AI-built',
    caption: 'Strong builder fingerprints found on this page.',
  },
  'possibly-ai-assisted': {
    label: 'Possibly AI-assisted',
    caption: 'Some corroborating signals found, but nothing definitive.',
  },
  'likely-hand-crafted': {
    label: 'Likely hand-crafted',
    caption: 'Barely any AI-builder signal detected.',
  },
  'not-enough-signal': {
    label: 'Not enough signal',
    caption:
      'No fingerprints found — common for sites on a custom domain with any builder badge removed.',
  },
};

interface ResultViewProps {
  verdict: Verdict;
}

export function ResultView({ verdict }: ResultViewProps) {
  const copy = BUCKET_COPY[verdict.bucket];

  return (
    <div className={`result result--${verdict.bucket}`}>
      <div className="result__label">{copy.label}</div>
      <div className="result__meter" role="meter" aria-valuenow={verdict.score} aria-valuemin={0} aria-valuemax={100}>
        <div className="result__meter-fill" style={{ width: `${verdict.score}%` }} />
      </div>
      <p className="result__caption">{copy.caption}</p>
    </div>
  );
}
