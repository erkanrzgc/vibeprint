import type { PageSnapshot } from './detection/types';

export interface PageSnapshotMessage {
  type: 'PAGE_SNAPSHOT';
  snapshot: PageSnapshot;
}

export function isPageSnapshotMessage(message: unknown): message is PageSnapshotMessage {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message as { type?: unknown }).type === 'PAGE_SNAPSHOT'
  );
}
