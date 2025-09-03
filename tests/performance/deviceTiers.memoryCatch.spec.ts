/*╔══════════════════════════════════════════════════════╗
  ║  ░  D E V I C E   T I E R S   M E M O R Y   C A T C H  ░░  ║
  ║                                                      ║
  ║  Exercises estimateMemoryUsage catch path            ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝*/
import { describe, it, expect } from 'vitest';
import { PerformanceMonitor } from '../../core/lm/deviceTiers';

describe('PerformanceMonitor memory estimation catch branch', () => {
  it('handles exception from performance accessor', () => {
    const monitor = new PerformanceMonitor();
    const original = (global as any).performance;
    // Create a proxy that throws on any property access
    const throwingPerf = new Proxy({}, {
      get() { throw new Error('perf blocked'); }
    });
    (global as any).performance = throwingPerf;

    // Trigger updateMetrics via recordRequest
    monitor.recordRequest('cpu', 10, true);
    const m = monitor.getMetrics('cpu');
    expect(m).toBeTruthy();
    // Memory falls back to 0 on catch
    expect(m!.memoryUsageMB).toBe(0);

    // Restore
    (global as any).performance = original;
  });
});
