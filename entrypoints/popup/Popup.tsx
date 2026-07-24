import { useEffect, useRef, useState } from 'react';
import { isPageSnapshotMessage } from '../../src/messaging';
import { isScannableUrl } from '../../src/scannable';
import { selectScanTargetTab } from '../../src/scanTarget';
import { reducePopupState, type PopupEvent } from '../../src/popupState';
import { ResultView } from './ResultView';
import { BreakdownList } from './BreakdownList';

const SCAN_TIMEOUT_MS = 4000;

type SnapshotListener = (message: unknown, sender: Browser.runtime.MessageSender) => void;

export function Popup() {
  const [state, setState] = useState(() => reducePopupState(undefined, { type: 'SCAN_STARTED' }));
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const listenerRef = useRef<SnapshotListener | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;
    let activeTabId: number | undefined;

    // reducePopupState ignores every event once the state has already settled
    // (unscannable/error/result), so out-of-order async resolutions (e.g. a slow
    // executeScript rejection arriving after the scan already timed out) can't overwrite a
    // more accurate terminal state. The updater stays pure — StrictMode double-invokes
    // updaters, so tearing down the timeout/listener happens in the settle effect below,
    // never in here.
    function dispatch(event: PopupEvent): void {
      if (cancelled) return;
      setState((prev) => reducePopupState(prev, event));
    }

    const onMessage: SnapshotListener = (message, sender) => {
      if (!isPageSnapshotMessage(message)) return;
      if (sender.tab?.id === undefined || sender.tab.id !== activeTabId) return;
      dispatch({ type: 'SNAPSHOT_RECEIVED', snapshot: message.snapshot });
    };
    listenerRef.current = onMessage;

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
      timeoutRef.current = setTimeout(() => dispatch({ type: 'TIMED_OUT' }), SCAN_TIMEOUT_MS);

      try {
        await browser.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['/collect.js'],
        });
      } catch {
        dispatch({ type: 'EXECUTE_SCRIPT_FAILED' });
      }
    }

    void startScan();

    return () => {
      cancelled = true;
      clearTimeout(timeoutRef.current);
      browser.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  // Once the scan settles, stop the timeout and listener from doing further pointless work.
  // Correctness never depends on this cleanup — the reducer already ignores late events —
  // which is what lets it live here as an effect instead of inside the setState updater.
  useEffect(() => {
    if (state.phase === 'loading') return;
    clearTimeout(timeoutRef.current);
    if (listenerRef.current) browser.runtime.onMessage.removeListener(listenerRef.current);
  }, [state.phase]);

  return (
    <main className="popup">
      <header className="popup__head">
        <h1 className="popup__title">Vibeprint</h1>
        {state.phase === 'result' && <p className="popup__host">{state.hostname}</p>}
      </header>

      {state.phase === 'loading' && (
        <>
          <div className="scanning" aria-hidden="true" />
          <p className="popup__status">Reading page signals…</p>
        </>
      )}

      {state.phase === 'unscannable' && (
        <p className="popup__status">
          Can't scan this page. Browser and extension pages are off-limits.
        </p>
      )}

      {state.phase === 'error' && (
        <p className="popup__status popup__status--error">{state.message}</p>
      )}

      {state.phase === 'result' && (
        <>
          <ResultView verdict={state.verdict} />
          <BreakdownList results={state.verdict.results} />
          <p className="popup__foot">
            Heuristic estimate from page fingerprints — not proof. Runs locally; nothing leaves your
            browser.
          </p>
        </>
      )}
    </main>
  );
}
