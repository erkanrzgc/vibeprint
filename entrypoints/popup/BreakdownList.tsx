import type { RuleResult, RuleTier } from '../../src/detection/types';

const TIER_ORDER: Record<RuleTier, number> = { strong: 0, medium: 1, weak: 2 };
const TIER_LABEL: Record<RuleTier, string> = { strong: 'Strong', medium: 'Medium', weak: 'Weak' };

interface BreakdownListProps {
  results: RuleResult[];
}

export function BreakdownList({ results }: BreakdownListProps) {
  if (results.length === 0) {
    return <p className="breakdown breakdown--empty">No signals matched on this page.</p>;
  }

  const sorted = [...results].sort((a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier]);

  return (
    <ul className="breakdown">
      {sorted.map((result) => (
        <li key={result.id} className={`breakdown__item breakdown__item--${result.tier}`}>
          <span className="breakdown__tier">{TIER_LABEL[result.tier]}</span>
          <span className="breakdown__label">{result.label}</span>
          <span className="breakdown__evidence">{result.evidence}</span>
        </li>
      ))}
    </ul>
  );
}
