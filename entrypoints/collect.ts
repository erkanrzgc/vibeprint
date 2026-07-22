import { collectPageSnapshot } from '../src/detection/snapshot';
import type { PageSnapshotMessage } from '../src/messaging';

export default defineUnlistedScript(() => {
  const snapshot = collectPageSnapshot();
  const message: PageSnapshotMessage = { type: 'PAGE_SNAPSHOT', snapshot };
  browser.runtime.sendMessage(message);
});
