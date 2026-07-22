import type { PageSnapshot, RuleResult } from '../types';

const MEDIUM_WEIGHT = 25;

const RADIX_PRIMITIVE_KEYS = ['state', 'orientation', 'side', 'align', 'disabled'];

const DEFAULT_FAVICONS = ['/vite.svg'];
const DEFAULT_TITLES = ['vite + react + ts', 'vite + react', 'create react app', 'react app'];

/**
 * Medium-confidence signals: known component-library conventions and un-customized
 * scaffold leftovers. Requires shadcn's own `data-slot` marker together with at least one
 * Radix primitive attribute (not either alone) — `data-state`/`data-disabled` etc. are common
 * enough on hand-written components that a single generic key isn't reliable by itself.
 */
export function detectCodePatterns(snapshot: PageSnapshot): RuleResult[] {
  const results: RuleResult[] = [];

  const hasShadcnSlot = snapshot.componentDatasetKeys.includes('slot');
  const radixPrimitiveKey = snapshot.componentDatasetKeys.find((key) =>
    RADIX_PRIMITIVE_KEYS.includes(key),
  );
  if (hasShadcnSlot && radixPrimitiveKey) {
    results.push({
      id: 'shadcn-radix-dataset',
      tier: 'medium',
      label: 'shadcn/ui + Radix UI component markers',
      weight: MEDIUM_WEIGHT,
      evidence: `data-slot with data-${radixPrimitiveKey}`,
    });
  }

  const faviconIsDefault =
    snapshot.faviconHref != null && DEFAULT_FAVICONS.includes(snapshot.faviconHref);
  const titleIsDefault = DEFAULT_TITLES.includes(snapshot.title.trim().toLowerCase());
  if (faviconIsDefault || titleIsDefault) {
    const evidence = faviconIsDefault ? snapshot.faviconHref! : snapshot.title;
    results.push({
      id: 'default-boilerplate',
      tier: 'medium',
      label: 'Un-customized scaffold favicon or title',
      weight: MEDIUM_WEIGHT,
      evidence,
    });
  }

  return results;
}
