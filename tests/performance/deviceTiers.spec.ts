/*╔══════════════════════════════════════════════════════╗
  ║  ░  D E V I C E   T I E R S   P E R F   T E S T S  ░░  ║
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
  • WHAT ▸ Performance tests for device tier optimization
  • WHY  ▸ Ensure tiering system works under various conditions
  • HOW  ▸ Mock different device capabilities and measure adaptation
*/
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  DEVICE_TIERS,
  PerformanceMonitor,
  detectDeviceTier,
  getExpectedLatency,
  adjustPolicyForPressure,
  type DeviceTier,
  type PerformanceMetrics,
} from '../../core/lm/deviceTiers';

describe('DeviceTiers Performance', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
    vi.clearAllMocks();
  });

  describe('Device Tier Detection', () => {
    it('detects WebGPU when available', () => {
      // Mock WebGPU support
      Object.defineProperty(navigator, 'gpu', {
        value: { requestAdapter: vi.fn() },
        writable: true,
      });

      const tier = detectDeviceTier();
      expect(tier).toBe('webgpu');
    });

    it('detects WASM with threads/SIMD when WebGPU unavailable', () => {
      // Mock no WebGPU but WASM support
      Object.defineProperty(navigator, 'gpu', {
        value: undefined,
        writable: true,
      });
      
      // Mock SharedArrayBuffer (threads)
      Object.defineProperty(global, 'SharedArrayBuffer', {
        value: function SharedArrayBuffer() {},
        writable: true,
      });

      const tier = detectDeviceTier();
      expect(tier).toBe('wasm');
    });

    it('falls back to CPU tier when advanced features unavailable', () => {
      // Mock no advanced features
      Object.defineProperty(navigator, 'gpu', {
        value: undefined,
        writable: true,
      });
      Object.defineProperty(global, 'SharedArrayBuffer', {
        value: undefined,
        writable: true,
      });

      const tier = detectDeviceTier();
      expect(tier).toBe('cpu');
    });

    it('detects WASM via SIMD when threads missing', () => {
      Object.defineProperty(navigator, 'gpu', { value: undefined, writable: true });
      // Force SharedArrayBuffer missing but WebAssembly.validate returns true
      Object.defineProperty(global, 'SharedArrayBuffer', { value: undefined, writable: true });
      const validate = WebAssembly.validate;
      // @ts-ignore
      WebAssembly.validate = () => true;
      const tier = detectDeviceTier();
      expect(tier).toBe('wasm');
      WebAssembly.validate = validate;
    });
  });

  describe('Performance Monitoring', () => {
    it('records and calculates average latency correctly', () => {
      const tier: DeviceTier = 'webgpu';
      
      monitor.recordRequest(tier, 10, true);
      monitor.recordRequest(tier, 20, true);
      monitor.recordRequest(tier, 30, true);

      const metrics = monitor.getMetrics(tier);
      expect(metrics?.avgLatencyMs).toBe(20);
    });

    it('tracks error rates accurately', () => {
      const tier: DeviceTier = 'cpu';
      
      monitor.recordRequest(tier, 100, true);
      monitor.recordRequest(tier, 110, false); // error
      monitor.recordRequest(tier, 120, true);
      monitor.recordRequest(tier, 130, false); // error

      const metrics = monitor.getMetrics(tier);
      expect(metrics?.errorRate).toBe(0.5); // 50% error rate
    });

    it('maintains rolling window of request times', () => {
      const tier: DeviceTier = 'wasm';
      
      // Record more than 100 requests to test rolling window
      for (let i = 0; i < 150; i++) {
        monitor.recordRequest(tier, i + 10, true);
      }

      const metrics = monitor.getMetrics(tier);
      // Should average only the last 100 requests (59-158)
      expect(metrics?.avgLatencyMs).toBeGreaterThan(100);
      expect(metrics?.avgLatencyMs).toBeLessThan(120);
    });
  });

  describe('Performance-Based Degradation', () => {
    it('detects memory pressure degradation', () => {
      const tier: DeviceTier = 'webgpu';
      const mockMetrics: PerformanceMetrics = {
        avgLatencyMs: 15,
        requestsPerMinute: 10,
        memoryUsageMB: 600, // Above threshold of 512MB
        errorRate: 0.05,
        lastUpdated: Date.now(),
      };

      // Mock the getMetrics method
      vi.spyOn(monitor, 'getMetrics').mockReturnValue(mockMetrics);
      
      expect(monitor.shouldDegrade(tier)).toBe(true);
    });

    it('detects high error rate degradation', () => {
      const tier: DeviceTier = 'wasm';
      const mockMetrics: PerformanceMetrics = {
        avgLatencyMs: 25,
        requestsPerMinute: 8,
        memoryUsageMB: 100,
        errorRate: 0.25, // 25% error rate (above 20% threshold)
        lastUpdated: Date.now(),
      };

      vi.spyOn(monitor, 'getMetrics').mockReturnValue(mockMetrics);
      
      expect(monitor.shouldDegrade(tier)).toBe(true);
    });

    it('detects latency degradation', () => {
      const tier: DeviceTier = 'cpu';
      const expectedLatency = getExpectedLatency(tier); // 100ms
      const mockMetrics: PerformanceMetrics = {
        avgLatencyMs: expectedLatency * 3, // 300ms (3x expected)
        requestsPerMinute: 5,
        memoryUsageMB: 50,
        errorRate: 0.05,
        lastUpdated: Date.now(),
      };

      vi.spyOn(monitor, 'getMetrics').mockReturnValue(mockMetrics);
      
      expect(monitor.shouldDegrade(tier)).toBe(true);
    });

    it('does not degrade under normal conditions', () => {
      const tier: DeviceTier = 'webgpu';
      const mockMetrics: PerformanceMetrics = {
        avgLatencyMs: 15,
        requestsPerMinute: 20,
        memoryUsageMB: 200, // Well below threshold
        errorRate: 0.02, // 2% error rate
        lastUpdated: Date.now(),
      };

      vi.spyOn(monitor, 'getMetrics').mockReturnValue(mockMetrics);
      
      expect(monitor.shouldDegrade(tier)).toBe(false);
    });
  });

  describe('Policy Adjustment Under Pressure', () => {
    it('reduces scope and increases cooldowns under memory pressure', () => {
      const tier: DeviceTier = 'webgpu';
      const basePolicy = DEVICE_TIERS[tier];
      const pressureMetrics: PerformanceMetrics = {
        avgLatencyMs: 15,
        requestsPerMinute: 10,
        memoryUsageMB: basePolicy.memoryPressureThreshold * 0.9, // High memory usage
        errorRate: 0.05,
        lastUpdated: Date.now(),
      };

      const adjustedPolicy = adjustPolicyForPressure(tier, pressureMetrics);
      
      expect(adjustedPolicy.toneAnalysisScope).toBeLessThan(basePolicy.toneAnalysisScope);
      expect(adjustedPolicy.cooldownMs).toBeGreaterThan(basePolicy.cooldownMs);
      expect(adjustedPolicy.maxTokens).toBeLessThan(basePolicy.maxTokens);
      expect(adjustedPolicy.maxConcurrentRequests).toBeLessThanOrEqual(basePolicy.maxConcurrentRequests);
    });

    it('increases debounce and cooldown under high error rate', () => {
      const tier: DeviceTier = 'wasm';
      const basePolicy = DEVICE_TIERS[tier];
      const errorMetrics: PerformanceMetrics = {
        avgLatencyMs: 30,
        requestsPerMinute: 8,
        memoryUsageMB: 100,
        errorRate: 0.15, // 15% error rate
        lastUpdated: Date.now(),
      };

      const adjustedPolicy = adjustPolicyForPressure(tier, errorMetrics);
      
      expect(adjustedPolicy.debounceMs).toBeGreaterThan(basePolicy.debounceMs);
      expect(adjustedPolicy.cooldownMs).toBeGreaterThan(basePolicy.cooldownMs);
      expect(adjustedPolicy.maxConcurrentRequests).toBeLessThanOrEqual(basePolicy.maxConcurrentRequests);
    });

    it('returns base policy under normal conditions', () => {
      const tier: DeviceTier = 'cpu';
      const basePolicy = DEVICE_TIERS[tier];
      const normalMetrics: PerformanceMetrics = {
        avgLatencyMs: 80,
        requestsPerMinute: 5,
        memoryUsageMB: 50,
        errorRate: 0.02,
        lastUpdated: Date.now(),
      };

      const adjustedPolicy = adjustPolicyForPressure(tier, normalMetrics);
      
      expect(adjustedPolicy).toEqual(basePolicy);
    });
  });

  describe('Tier-Specific Configurations', () => {
    it('has correct tone analysis scope by tier', () => {
      expect(DEVICE_TIERS.cpu.toneAnalysisScope).toBe(10);
      expect(DEVICE_TIERS.wasm.toneAnalysisScope).toBe(20);
      expect(DEVICE_TIERS.webgpu.toneAnalysisScope).toBe(20);
    });

    it('has progressive memory thresholds', () => {
      expect(DEVICE_TIERS.cpu.memoryPressureThreshold).toBeLessThan(
        DEVICE_TIERS.wasm.memoryPressureThreshold
      );
      expect(DEVICE_TIERS.wasm.memoryPressureThreshold).toBeLessThan(
        DEVICE_TIERS.webgpu.memoryPressureThreshold
      );
    });

    it('has appropriate concurrent request limits', () => {
      expect(DEVICE_TIERS.cpu.maxConcurrentRequests).toBe(1);
      expect(DEVICE_TIERS.wasm.maxConcurrentRequests).toBe(2);
      expect(DEVICE_TIERS.webgpu.maxConcurrentRequests).toBe(3);
    });

    it('has realistic expected latencies', () => {
      expect(getExpectedLatency('webgpu')).toBe(15);
      expect(getExpectedLatency('wasm')).toBe(30);
      expect(getExpectedLatency('cpu')).toBe(100);
    });
  });

  describe('Performance Regression Detection', () => {
    it('detects performance regression over time', () => {
      const tier: DeviceTier = 'webgpu';
      const expectedLatency = getExpectedLatency(tier);
      
      // Simulate severe performance degradation
      monitor.recordRequest(tier, expectedLatency * 3, true); // 3x expected (45ms)
      monitor.recordRequest(tier, expectedLatency * 3, true);
      monitor.recordRequest(tier, expectedLatency * 3, true);

      const metrics = monitor.getMetrics(tier);
      console.log(`Expected: ${expectedLatency}, Actual: ${metrics?.avgLatencyMs}, Threshold: ${expectedLatency * 2}`);
      
      expect(metrics?.avgLatencyMs).toBeGreaterThan(expectedLatency * 2);
      
      // The shouldDegrade method should return true for high latency
      expect(monitor.shouldDegrade(tier)).toBe(true);
    });

    it('handles burst error patterns correctly', () => {
      const tier: DeviceTier = 'wasm';
      
      // Simulate burst of errors
      for (let i = 0; i < 10; i++) {
        monitor.recordRequest(tier, 30, false); // All errors
      }
      
      // Then some successes
      for (let i = 0; i < 5; i++) {
        monitor.recordRequest(tier, 25, true);
      }

      const metrics = monitor.getMetrics(tier);
      expect(metrics?.errorRate).toBeGreaterThan(0.5); // Still high error rate
      expect(monitor.shouldDegrade(tier)).toBe(true);
    });
  });
});
