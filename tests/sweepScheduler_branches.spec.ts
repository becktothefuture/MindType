import { describe, it, expect } from 'vitest';
import { createSweepScheduler } from '../core/sweepScheduler';

describe('SweepScheduler branch coverage', () => {
  it('start() returns early when no monitor is provided', () => {
    const scheduler = createSweepScheduler(undefined);
    // Should not throw
    expect(() => scheduler.start()).not.toThrow();
    scheduler.stop();
  });
});
