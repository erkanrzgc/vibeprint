import type { PageSnapshot } from '../../src/detection/types';

const EMPTY_SNAPSHOT: PageSnapshot = {
  hostname: 'example.com',
  title: 'Example',
  generatorMeta: null,
  faviconHref: null,
  scriptSrcs: [],
  htmlDatasetKeys: [],
  bodyDatasetKeys: [],
  componentDatasetKeys: [],
  builderMarkupHints: [],
  badgeLinks: [],
  imageSrcs: [],
  fontFamilySample: null,
  bodyTextSample: '',
};

/**
 * Builds a PageSnapshot with only the fields a test cares about, so adding a new snapshot
 * field doesn't require touching every test literal.
 */
export function makeSnapshot(overrides: Partial<PageSnapshot> = {}): PageSnapshot {
  return { ...EMPTY_SNAPSHOT, ...overrides };
}
