/*╔══════════════════════════════════════════════════════╗
  ║  ░  P E R F M O N   U P D A T E   M E T R I C S  ░░░  ║
  ║                                                      ║
  ║  Covers zero-sample branches in updateMetrics.       ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝*/
import { describe, it, expect } from 'vitest';
import { PerformanceMonitor, type DeviceTier } from '../../core/lm/deviceTiers';

describe('PerformanceMonitor.updateMetrics zero-sample branches', () => {
  it('produces zero averages and error rate when no samples', () => {
    const m = new PerformanceMonitor();
    type Tier = DeviceTier;
    const hack = m as unknown as Record<string, unknown>;
    // Force internal maps to empty and invoke update directly
    const requestTimes = hack['requestTimes'] as Map<Tier, number[]>;
    const requestCounts = hack['requestCounts'] as Map<Tier, number>;
    const errorCounts = hack['errorCounts'] as Map<Tier, number>;
    const updateMetrics = hack['updateMetrics'] as (
      this: PerformanceMonitor,
      tier: Tier,
    ) => void;
    requestTimes.set('cpu', []);
    requestCounts.set('cpu', 0);
    errorCounts.set('cpu', 0);
    updateMetrics.call(m, 'cpu');
    const metrics = m.getMetrics('cpu')!;
    expect(metrics.avgLatencyMs).toBe(0);
    expect(metrics.requestsPerMinute).toBe(0);
    expect(metrics.errorRate).toBe(0);
  });
});
