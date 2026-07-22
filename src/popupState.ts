import { runAllRules } from './detection/rules';
import { scoreResults } from './detection/score';
import type { PageSnapshot, Verdict } from './detection/types';

export type PopupState =
  | { phase: 'loading' }
  | { phase: 'unscannable' }
  | { phase: 'error'; message: string }
  | { phase: 'result'; verdict: Verdict };

export type PopupEvent =
  | { type: 'SCAN_STARTED' }
  | { type: 'TABS_QUERY_FAILED' }
  | { type: 'NO_SCANNABLE_TAB' }
  | { type: 'EXECUTE_SCRIPT_FAILED' }
  | { type: 'TIMED_OUT' }
  | { type: 'SNAPSHOT_RECEIVED'; snapshot: PageSnapshot };

const TIMEOUT_MESSAGE = 'Scan timed out. Try reopening the popup.';
const TABS_QUERY_FAILED_MESSAGE = 'Could not check the current tab. Try reopening the popup.';

/**
 * Pure state transition function for the popup's scan flow. `loading` is the only
 * non-terminal phase: once any event moves the state to `unscannable`, `error`, or `result`,
 * every later event is ignored (returns the same state unchanged). This closes the race
 * where, e.g., a slow `executeScript` rejection arriving after the scan had already timed
 * out would otherwise silently overwrite the more accurate timeout message.
 */
export function reducePopupState(current: PopupState | undefined, event: PopupEvent): PopupState {
  if (current && current.phase !== 'loading') return current;

  switch (event.type) {
    case 'SCAN_STARTED':
      return { phase: 'loading' };
    case 'TABS_QUERY_FAILED':
      return { phase: 'error', message: TABS_QUERY_FAILED_MESSAGE };
    case 'NO_SCANNABLE_TAB':
    case 'EXECUTE_SCRIPT_FAILED':
      return { phase: 'unscannable' };
    case 'TIMED_OUT':
      return { phase: 'error', message: TIMEOUT_MESSAGE };
    case 'SNAPSHOT_RECEIVED':
      return { phase: 'result', verdict: scoreResults(runAllRules(event.snapshot)) };
  }
}
