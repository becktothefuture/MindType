/*╔══════════════════════════════════════════════════════╗
  ║  ░  D E V I C E   T I E R S   B R A N C H E S  ░░░░  ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Branch coverage for deviceTiers helpers
  • WHY  ▸ Lift branch coverage over global threshold
  • HOW  ▸ Exercise detectDeviceTier fallbacks and adjustPolicy branches
*/
import { describe, it, expect, vi } from 'vitest';
import {
  detectDeviceTier,
  adjustPolicyForPressure,
  DEVICE_TIERS,
  type PerformanceMetrics,
} from '../../core/lm/deviceTiers';

describe('deviceTiers branches', () => {
  it('detectDeviceTier falls back to cpu when no features present', () => {
    Object.defineProperty(navigator, 'gpu', { value: undefined, writable: true });
    // Force WebAssembly validate to throw
    const validate = WebAssembly.validate;
    WebAssembly.validate = vi.fn(() => {
      throw new Error('no simd');
    });
    // override for test (not present in JSDOM)
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    global.SharedArrayBuffer = undefined;
    const tier = detectDeviceTier();
    expect(tier).toBe('cpu');
    WebAssembly.validate = validate;
  });

  it('adjustPolicyForPressure returns conservative policy for high error rate', () => {
    const base = DEVICE_TIERS.wasm;
    const m: PerformanceMetrics = {
      avgLatencyMs: 25,
      requestsPerMinute: 8,
      memoryUsageMB: 10,
      errorRate: 0.11,
      lastUpdated: Date.now(),
    };
    const adjusted = adjustPolicyForPressure('wasm', m);
    expect(adjusted.cooldownMs).toBeGreaterThanOrEqual(base.cooldownMs);
    expect(adjusted.debounceMs).toBeGreaterThanOrEqual(base.debounceMs);
  });

  it('adjustPolicyForPressure returns reduced scope under memory pressure', () => {
    const base = DEVICE_TIERS.webgpu;
    const m: PerformanceMetrics = {
      avgLatencyMs: 15,
      requestsPerMinute: 10,
      memoryUsageMB: base.memoryPressureThreshold * 0.9,
      errorRate: 0.0,
      lastUpdated: Date.now(),
    };
    const adjusted = adjustPolicyForPressure('webgpu', m);
    expect(adjusted.toneAnalysisScope).toBeLessThan(base.toneAnalysisScope);
    expect(adjusted.maxConcurrentRequests).toBeLessThanOrEqual(
      base.maxConcurrentRequests,
    );
  });
});
