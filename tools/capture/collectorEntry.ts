import { collectPageSnapshot } from '../../src/detection/snapshot';

/**
 * Entry point bundled into a standalone IIFE (see capture.mjs) and injected into real pages
 * by the capture tool. It deliberately re-exports the SAME collectPageSnapshot the extension
 * runs in production — capturing with a reimplementation would reintroduce exactly the
 * fixtures-drift problem this tooling exists to fix.
 */
declare global {
  interface Window {
    __vibecodeCollect: typeof collectPageSnapshot;
  }
}

window.__vibecodeCollect = collectPageSnapshot;
