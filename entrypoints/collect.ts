import { collectPageSnapshot } from '../src/detection/snapshot';
import type { PageSnapshotMessage } from '../src/messaging';

export default defineUnlistedScript(() => {
  const snapshot = collectPageSnapshot();
  const message: PageSnapshotMessage = { type: 'PAGE_SNAPSHOT', snapshot };
  // If the user closes the popup before the collector finishes, there is no receiver and
  // sendMessage rejects. That is a normal outcome, not an error — and an unhandled rejection
  // here would surface as console noise on someone else's page.
  Promise.resolve(browser.runtime.sendMessage(message)).catch(() => {});
});
