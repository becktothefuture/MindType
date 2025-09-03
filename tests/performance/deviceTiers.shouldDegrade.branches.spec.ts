/*╔══════════════════════════════════════════════════════╗
  ║  ░  S H O U L D   D E G R A D E   B R A N C H E S  ░░  ║
  ║                                                      ║
  ║  Exercises all return-true branches.                 ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝*/
import { describe, it, expect } from 'vitest';
import { PerformanceMonitor, DEVICE_TIERS } from '../../core/lm/deviceTiers';

describe('PerformanceMonitor.shouldDegrade branches', () => {
  it('degrades on memory pressure', () => {
    const m = new PerformanceMonitor();
    const tier = 'cpu' as const;
    // Record one request to create metrics
    m.recordRequest(tier, 10, true);
    // Monkey patch metrics to exceed memory
    const metrics = m.getMetrics(tier)!;
    const patched = { ...metrics, memoryUsageMB: DEVICE_TIERS[tier].memoryPressureThreshold + 1 };
    // @ts-ignore private access bypass via direct map mutation
    (m as any).metrics.set(tier, patched);
    expect(m.shouldDegrade(tier)).toBe(true);
  });

  it('degrades on high error rate', () => {
    const m = new PerformanceMonitor();
    const tier = 'cpu' as const;
    // Record successes and failures
    m.recordRequest(tier, 10, false);
    m.recordRequest(tier, 10, false);
    m.recordRequest(tier, 10, true);
    expect(m.shouldDegrade(tier)).toBe(true);
  });

  it('degrades on high latency vs expected', () => {
    const m = new PerformanceMonitor();
    const tier = 'webgpu' as const; // expected 15
    // Record slow latencies > 2x expected
    m.recordRequest(tier, 40, true);
    m.recordRequest(tier, 50, true);
    expect(m.shouldDegrade(tier)).toBe(true);
  });
});
