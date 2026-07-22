import { describe, expect, it } from 'vitest';
import { reducePopupState } from '../../src/popupState';
import { makeSnapshot } from '../helpers/makeSnapshot';

const snapshot = makeSnapshot({
  hostname: 'petcare-tracker.lovable.app',
  title: 'PetCare Tracker',
  scriptSrcs: ['https://cdn.gpteng.co/gptengineer.js'],
});

describe('reducePopupState', () => {
  it('starts in the loading phase', () => {
    expect(reducePopupState(undefined, { type: 'SCAN_STARTED' })).toEqual({ phase: 'loading' });
  });

  it('moves to unscannable when there is no scannable tab', () => {
    const state = reducePopupState({ phase: 'loading' }, { type: 'NO_SCANNABLE_TAB' });
    expect(state).toEqual({ phase: 'unscannable' });
  });

  it('moves to unscannable when script injection fails (defensive backstop)', () => {
    const state = reducePopupState({ phase: 'loading' }, { type: 'EXECUTE_SCRIPT_FAILED' });
    expect(state).toEqual({ phase: 'unscannable' });
  });

  it('moves to a distinct error state when querying tabs itself fails', () => {
    const state = reducePopupState({ phase: 'loading' }, { type: 'TABS_QUERY_FAILED' });
    expect(state.phase).toBe('error');
  });

  it('moves to a distinct error state on timeout', () => {
    const state = reducePopupState({ phase: 'loading' }, { type: 'TIMED_OUT' });
    expect(state.phase).toBe('error');
  });

  it('moves to the result phase with a scored verdict when a snapshot arrives', () => {
    const state = reducePopupState({ phase: 'loading' }, { type: 'SNAPSHOT_RECEIVED', snapshot });

    expect(state.phase).toBe('result');
    if (state.phase === 'result') {
      expect(state.verdict.bucket).toBe('likely-ai-built');
    }
  });

  it('ignores every event once the state has already settled (fixes the race where a late executeScript failure overwrote a timeout error)', () => {
    const timedOut = reducePopupState({ phase: 'loading' }, { type: 'TIMED_OUT' });

    expect(reducePopupState(timedOut, { type: 'EXECUTE_SCRIPT_FAILED' })).toBe(timedOut);
    expect(reducePopupState(timedOut, { type: 'NO_SCANNABLE_TAB' })).toBe(timedOut);
    expect(reducePopupState(timedOut, { type: 'SNAPSHOT_RECEIVED', snapshot })).toBe(timedOut);
  });

  it('ignores a late event after a result has already been rendered', () => {
    const result = reducePopupState(
      { phase: 'loading' },
      { type: 'SNAPSHOT_RECEIVED', snapshot },
    );

    expect(reducePopupState(result, { type: 'TIMED_OUT' })).toBe(result);
  });
});
