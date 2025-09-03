/*╔══════════════════════════════════════════════════════╗
  ║  ░  P E R F M O N   U P D A T E   M E T R I C S  ░░░  ║
  ║                                                      ║
  ║  Covers zero-sample branches in updateMetrics.       ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝*/
import { describe, it, expect } from 'vitest';
import { PerformanceMonitor } from '../../core/lm/deviceTiers';

describe('PerformanceMonitor.updateMetrics zero-sample branches', () => {
  it('produces zero averages and error rate when no samples', () => {
    const m = new PerformanceMonitor();
    // Force internal maps to empty and invoke update directly
    // @ts-ignore private access
    (m as any).requestTimes.set('cpu', []);
    // @ts-ignore private access
    (m as any).requestCounts.set('cpu', 0);
    // @ts-ignore private access
    (m as any).errorCounts.set('cpu', 0);
    // @ts-ignore private access
    (m as any).updateMetrics('cpu');
    const metrics = m.getMetrics('cpu')!;
    expect(metrics.avgLatencyMs).toBe(0);
    expect(metrics.requestsPerMinute).toBe(0);
    expect(metrics.errorRate).toBe(0);
  });
});
