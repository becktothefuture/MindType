/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  S W A P   R E N D E R E R   ( U I   E V E N T S )  ░░░░░  ║
  ║                                                              ║
  ║   Verifies mechanical swap events, reduced-motion behavior,  ║
  ║   and batched screen-reader announcements.                   ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderMechanicalSwap } from '../ui/swapRenderer';

interface MTEvent {
  type: string;
  detail?: unknown;
}
type Listener = (e: MTEvent) => void;

const listeners: Record<string, Listener[]> = {};

function installGlobalEventShim() {
  (globalThis as unknown as { dispatchEvent?: (e: MTEvent) => boolean }).dispatchEvent = (
    e: MTEvent,
  ) => {
    const arr = listeners[e?.type] || [];
    for (const l of arr) l(e);
    return true;
  };
  (
    globalThis as unknown as { addEventListener?: (t: string, l: Listener) => void }
  ).addEventListener = (t: string, l: Listener) => {
    listeners[t] = listeners[t] || [];
    listeners[t].push(l);
  };
  (
    globalThis as unknown as { removeEventListener?: (t: string, l: Listener) => void }
  ).removeEventListener = (t: string, l: Listener) => {
    listeners[t] = (listeners[t] || []).filter((x) => x !== l);
  };
  (
    globalThis as unknown as {
      CustomEvent?: new (type: string, init?: { detail?: unknown }) => MTEvent;
    }
  ).CustomEvent = class CustomEvent {
    type: string;
    detail: unknown;
    constructor(type: string, init?: { detail?: unknown }) {
      this.type = type;
      this.detail = init?.detail;
    }
  };
}

describe('swapRenderer events', () => {
  type WindowLike = { matchMedia?: (q: string) => { matches: boolean } };
  const originalWindow = (globalThis as unknown as { window?: WindowLike }).window;
  beforeEach(() => {
    for (const k of Object.keys(listeners)) delete listeners[k];
    vi.useFakeTimers();
    installGlobalEventShim();
    (globalThis as unknown as { window?: WindowLike }).window = {} as WindowLike;
  });
  afterEach(() => {
    // Flush any pending batched announcements between tests
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
    (globalThis as unknown as { window?: WindowLike }).window = originalWindow;
  });

  it('emits mechanicalSwap event with details', () => {
    const got: Array<{
      instant?: boolean;
      durationMs?: number;
      start?: number;
      end?: number;
      text?: string;
    }> = [];
    (
      globalThis as unknown as {
        addEventListener: (t: string, l: (e: MTEvent) => void) => void;
      }
    ).addEventListener('mindtype:mechanicalSwap', (e: MTEvent) =>
      got.push(
        e.detail as {
          instant?: boolean;
          durationMs?: number;
          start?: number;
          end?: number;
          text?: string;
        },
      ),
    );
    renderMechanicalSwap({ start: 2, end: 5, text: 'fix' });
    expect(got.length).toBe(1);
    expect(got[0]).toMatchObject({ start: 2, end: 5, text: 'fix' });
    expect(typeof got[0].instant).toBe('boolean');
  });

  it('respects reduced-motion (instant=true, duration=0)', () => {
    (globalThis as unknown as { window?: WindowLike }).window = {
      matchMedia: (q: string) => ({ matches: q.includes('prefers-reduced-motion') }),
    };
    const got: Array<{ instant?: boolean; durationMs?: number }> = [];
    (
      globalThis as unknown as {
        addEventListener: (t: string, l: (e: MTEvent) => void) => void;
      }
    ).addEventListener('mindtype:mechanicalSwap', (e: MTEvent) =>
      got.push(e.detail as { instant?: boolean; durationMs?: number }),
    );
    renderMechanicalSwap({ start: 0, end: 3, text: 'ok' });
    expect(got[0].instant).toBe(true);
    expect(got[0].durationMs).toBe(0);
  });

  it('batches swapAnnouncement to a single event for multiple swaps', async () => {
    const announcements: Array<{ count: number }> = [];
    (
      globalThis as unknown as {
        addEventListener: (t: string, l: (e: MTEvent) => void) => void;
      }
    ).addEventListener('mindtype:swapAnnouncement', (e: MTEvent) =>
      announcements.push(e.detail as { count: number }),
    );
    renderMechanicalSwap({ start: 1, end: 2, text: 'a' });
    renderMechanicalSwap({ start: 3, end: 4, text: 'b' });
    // Announcement batches over ~100ms
    await vi.advanceTimersByTimeAsync(110);
    expect(announcements.length).toBe(1);
    expect(announcements[0].count).toBe(2);
  });
});
