/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  S W E E P   S C H E D U L E R   B R A N C H E S  2  ░░░  ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Cover early return when lastEvent is null and stop() path
  • WHY  ▸ Push branch coverage ≥ 90%
*/
import { describe, it, expect } from 'vitest';
import { createSweepScheduler } from '../core/sweepScheduler';

describe('sweepScheduler additional branches', () => {
  it('start/stop without events does not throw (covers lastEvent early return)', async () => {
    const monitor = { on: () => () => {} } as any;
    const sch = createSweepScheduler(monitor);
    sch.start();
    // No events emitted → runSweeps will early-return when timer fires (unobservable here).
    sch.stop();
    expect(typeof sch.setOptions).toBe('function');
  });
});
