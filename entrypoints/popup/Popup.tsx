import { useEffect, useState } from 'react';
import { isPageSnapshotMessage } from '../../src/messaging';
import { isScannableUrl } from '../../src/scannable';
import { selectScanTargetTab } from '../../src/scanTarget';
import { reducePopupState, type PopupEvent } from '../../src/popupState';
import { ResultView } from './ResultView';
import { BreakdownList } from './BreakdownList';

const SCAN_TIMEOUT_MS = 4000;

export function Popup() {
  const [state, setState] = useState(() => reducePopupState(undefined, { type: 'SCAN_STARTED' }));

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    let activeTabId: number | undefined;

    // reducePopupState ignores every event once the state has already settled
    // (unscannable/error/result), so out-of-order async resolutions (e.g. a slow
    // executeScript rejection arriving after the scan already timed out) can't overwrite a
    // more accurate terminal state. Once settled, also stop the timeout/listener from doing
    // any further pointless work.
    function dispatch(event: PopupEvent): void {
      if (cancelled) return;
      setState((prev) => {
        const next = reducePopupState(prev, event);
        if (next !== prev && next.phase !== 'loading') {
          clearTimeout(timeoutId);
          browser.runtime.onMessage.removeListener(onMessage);
        }
        return next;
      });
    }

    const onMessage = (message: unknown, sender: Browser.runtime.MessageSender): void => {
      if (!isPageSnapshotMessage(message)) return;
      if (sender.tab?.id === undefined || sender.tab.id !== activeTabId) return;
      dispatch({ type: 'SNAPSHOT_RECEIVED', snapshot: message.snapshot });
    };

    async function startScan(): Promise<void> {
      let tabs: Browser.tabs.Tab[];
      try {
        tabs = await browser.tabs.query({ currentWindow: true });
      } catch {
        dispatch({ type: 'TABS_QUERY_FAILED' });
        return;
      }
      if (cancelled) return;

      const tab = selectScanTargetTab(tabs, browser.runtime.getURL('/popup.html'));
      if (tab?.id === undefined || !isScannableUrl(tab.url)) {
        dispatch({ type: 'NO_SCANNABLE_TAB' });
        return;
      }
      activeTabId = tab.id;

      browser.runtime.onMessage.addListener(onMessage);
      timeoutId = setTimeout(() => dispatch({ type: 'TIMED_OUT' }), SCAN_TIMEOUT_MS);

      try {
        await browser.scripting.executeScript({ target: { tabId: tab.id }, files: ['/collect.js'] });
      } catch {
        dispatch({ type: 'EXECUTE_SCRIPT_FAILED' });
      }
    }

    void startScan();

    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
      browser.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  return (
    <main className="popup">
      <h1 className="popup__title">Vibecode Detector</h1>
      {state.phase === 'loading' && <p className="popup__status">Scanning this page…</p>}
      {state.phase === 'unscannable' && (
        <p className="popup__status">Can't scan this page (browser/internal pages aren't accessible).</p>
      )}
      {state.phase === 'error' && <p className="popup__status popup__status--error">{state.message}</p>}
      {state.phase === 'result' && (
        <>
          <ResultView verdict={state.verdict} />
          <BreakdownList results={state.verdict.results} />
        </>
      )}
    </main>
  );
}
