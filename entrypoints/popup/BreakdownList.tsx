import type { RuleResult, RuleTier } from '../../src/detection/types';

const TIER_ORDER: RuleTier[] = ['strong', 'medium', 'weak'];

const TIER_COPY: Record<RuleTier, { label: string; note: string }> = {
  strong: { label: 'Conclusive', note: 'Identifies a specific builder' },
  medium: { label: 'Suggestive', note: 'Common in generated code' },
  weak: { label: 'Circumstantial', note: 'Also seen on hand-built sites' },
};

interface BreakdownListProps {
  results: RuleResult[];
}

export function BreakdownList({ results }: BreakdownListProps) {
  if (results.length === 0) {
    return (
      <p className="breakdown-empty">
        Nothing matched. That is a real answer, not a failure — a site can be AI-built and leave
        no trace.
      </p>
    );
  }

  const groups = TIER_ORDER.map((tier) => ({
    tier,
    items: results.filter((result) => result.tier === tier),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="breakdown">
      {groups.map(({ tier, items }) => (
        <section key={tier} className={`tier tier--${tier}`}>
          <header className="tier__head">
            <span className="tier__label">{TIER_COPY[tier].label}</span>
            <span className="tier__count">{items.length}</span>
            <span className="tier__note">{TIER_COPY[tier].note}</span>
          </header>
          <ul className="tier__items">
            {items.map((result) => (
              <li key={result.id} className="signal">
                <p className="signal__label">{result.label}</p>
                <p className="signal__evidence" title={result.evidence}>
                  {result.evidence}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
