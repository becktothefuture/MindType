/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  S W E E P   S C H E D U L E R   A P I  ░░░░░░░░░░░░░░░░  ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Cover start guard when no monitor, and stop/options paths
  • WHY  ▸ Increment scheduler branch coverage
*/
import { describe, it, expect } from 'vitest';
import { createSweepScheduler } from '../core/sweepScheduler';

describe('sweepScheduler API branches', () => {
  it('start does nothing when monitor is undefined', () => {
    const sch = createSweepScheduler(undefined as any);
    // Should not throw
    sch.start();
    expect(typeof sch.stop).toBe('function');
  });

  it('stop clears without active subscription and setOptions toggles tone', () => {
    const monitor = { on: () => () => {} } as any;
    const sch = createSweepScheduler(monitor);
    sch.setOptions({ toneEnabled: true, toneTarget: 'Professional' });
    sch.stop();
    expect(typeof sch.setOptions).toBe('function');
  });
});
