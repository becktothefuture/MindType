/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  S E C U R E   F I E L D S   T E S T S  ░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Verifies that scheduler ignores events in secure/IME mode. ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Ensure no ticks/sweeps when security gates are on
  • WHY  ▸ Meet REQ-SECURE-FIELDS: no corrections in secure fields
  • HOW  ▸ Provide SecurityContext stubs and assert no calls occur
*/

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { boot } from '../index';

vi.mock('../engines/tidySweep', () => ({ tidySweep: vi.fn(() => ({ diff: null })) }));
vi.mock('../engines/backfillConsistency', () => ({
  backfillConsistency: vi.fn(() => ({ diffs: [] })),
}));

// Mock DiffusionController to observe calls
const tickOnce = vi.fn();
const catchUp = vi.fn();
const update = vi.fn();
const getState = () => ({ text: '', caret: 0, frontier: 0 });
vi.mock('../core/diffusionController', () => ({
  createDiffusionController: () => ({ update, tickOnce, catchUp, getState }),
}));

describe('Security gating', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    tickOnce.mockClear();
    catchUp.mockClear();
    update.mockClear();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('drops events when isSecure() is true', () => {
    const app = boot({ security: { isSecure: () => true, isIMEComposing: () => false } });
    app.start();
    app.ingest('secret', 3);
    vi.advanceTimersByTime(10_000);
    expect(update).not.toHaveBeenCalled();
    expect(tickOnce).not.toHaveBeenCalled();
    expect(catchUp).not.toHaveBeenCalled();
    app.stop();
  });

  it('drops events while IME composing', () => {
    const app = boot({ security: { isSecure: () => false, isIMEComposing: () => true } });
    app.start();
    app.ingest('かな', 2);
    vi.advanceTimersByTime(10_000);
    expect(update).not.toHaveBeenCalled();
    expect(tickOnce).not.toHaveBeenCalled();
    expect(catchUp).not.toHaveBeenCalled();
    app.stop();
  });
});
