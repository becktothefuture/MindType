/*╔══════════════════════════════════════════════════════╗
  ║  ░  D E V I C E T I E R S   M E M O R Y   U S E D  ░░  ║
  ║                                                      ║
  ║  Covers estimateMemoryUsage when memory exists.      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝*/
import { describe, it, expect } from 'vitest';
import { PerformanceMonitor } from '../../core/lm/deviceTiers';

describe('estimateMemoryUsage true branch', () => {
  it('reports non-zero memoryUsageMB when performance.memory is present', () => {
    const original = (global as any).performance;
    (global as any).performance = { memory: { usedJSHeapSize: 50 * 1024 * 1024 } };
    const m = new PerformanceMonitor();
    m.recordRequest('cpu', 10, true);
    const metrics = m.getMetrics('cpu')!;
    expect(metrics.memoryUsageMB).toBe(50);
    (global as any).performance = original;
  });
});
