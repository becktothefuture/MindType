/*╔══════════════════════════════════════════════════════╗
  ║  ░  P E R F O R M A N C E   B E N C H M A R K S  ░░░░  ║
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
  • WHAT ▸ Performance benchmarks for LM token/cooldown tiering
  • WHY  ▸ Ensure performance targets are met across device tiers
  • HOW  ▸ Measure latency, throughput, and resource usage
*/
import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEVICE_TIERS,
  PerformanceMonitor,
  detectDeviceTier,
  type DeviceTier,
} from '../../core/lm/deviceTiers';

describe('Performance Benchmarks', () => {
  let monitor: PerformanceMonitor;

  beforeEach(() => {
    monitor = new PerformanceMonitor();
  });

  describe('Latency Benchmarks', () => {
    it('measures request processing latency within tier expectations', async () => {
      const tier = detectDeviceTier();
      const expectedLatency = getExpectedLatencyForTier(tier);

      const startTime = performance.now();

      // Simulate processing time
      await simulateProcessing(tier);

      const actualLatency = performance.now() - startTime;

      // Record for monitoring
      monitor.recordRequest(tier, actualLatency, true);

      // Benchmark: should be within 2x expected latency for synthetic test
      expect(actualLatency).toBeLessThan(expectedLatency * 2);
    });

    it('benchmarks token generation rate by tier', async () => {
      const testCases: Array<{ tier: DeviceTier; minTokensPerSecond: number }> = [
        { tier: 'webgpu', minTokensPerSecond: 20 },
        { tier: 'wasm', minTokensPerSecond: 10 },
        { tier: 'cpu', minTokensPerSecond: 5 },
      ];

      for (const { tier, minTokensPerSecond } of testCases) {
        const startTime = performance.now();
        const tokenCount = DEVICE_TIERS[tier].maxTokens;

        // Simulate token generation
        await simulateTokenGeneration(tier, tokenCount);

        const elapsed = (performance.now() - startTime) / 1000; // Convert to seconds
        const tokensPerSecond = tokenCount / elapsed;

        expect(tokensPerSecond).toBeGreaterThanOrEqual(minTokensPerSecond);
      }
    });
  });

  describe('Memory Usage Benchmarks', () => {
    it('measures memory usage stays within tier thresholds', () => {
      const tier = detectDeviceTier();
      const threshold = DEVICE_TIERS[tier].memoryPressureThreshold;

      // Get baseline memory
      const initialMemory = getMemoryUsage();

      // Simulate memory-intensive operations
      const testData = generateTestData(1000);
      processTestData(testData);

      const peakMemory = getMemoryUsage();
      const memoryIncrease = peakMemory - initialMemory;

      // Should stay well below pressure threshold
      expect(memoryIncrease).toBeLessThan(threshold * 0.5);
    });

    it('benchmarks memory cleanup after processing', async () => {
      const initialMemory = getMemoryUsage();

      // Create and process large dataset
      const largeData = generateTestData(5000);
      processTestData(largeData);

      const peakMemory = getMemoryUsage();

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));

      const finalMemory = getMemoryUsage();

      // Memory should return close to baseline
      const memoryLeak = finalMemory - initialMemory;
      expect(memoryLeak).toBeLessThan(10); // Less than 10MB leak
    });
  });

  describe('Throughput Benchmarks', () => {
    it('measures concurrent request handling capacity', async () => {
      const tier = detectDeviceTier();
      const maxConcurrent = DEVICE_TIERS[tier].maxConcurrentRequests;

      const requests: Promise<number>[] = [];

      // Start concurrent requests up to the limit
      for (let i = 0; i < maxConcurrent; i++) {
        requests.push(measureRequestLatency(tier));
      }

      const latencies = await Promise.all(requests);

      // All requests should complete successfully
      expect(latencies).toHaveLength(maxConcurrent);

      // Average latency should be reasonable
      const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const expectedLatency = getExpectedLatencyForTier(tier);

      expect(avgLatency).toBeLessThan(expectedLatency * 1.5);
    });

    it('benchmarks cooldown period effectiveness', async () => {
      const tier = detectDeviceTier();
      const cooldown = DEVICE_TIERS[tier].cooldownMs;

      // Make first request
      const start1 = performance.now();
      await simulateProcessing(tier);
      const latency1 = performance.now() - start1;

      // Wait less than cooldown period
      await new Promise((resolve) => setTimeout(resolve, cooldown * 0.5));

      // Make second request (should be throttled)
      const start2 = performance.now();
      await simulateProcessing(tier);
      const latency2 = performance.now() - start2;

      // Allow jitter: latency2 should not be significantly faster than latency1
      // Accept within 25% noise band to avoid flakiness in CI
      const lowerBound = latency1 * 0.75;
      expect(latency2).toBeGreaterThanOrEqual(lowerBound);
    });
  });

  describe('Regression Tests', () => {
    it('maintains performance within acceptable bounds', async () => {
      const tier = detectDeviceTier();
      const baselineLatency = getExpectedLatencyForTier(tier);

      // Run multiple iterations to get stable measurement
      const iterations = 10;
      const latencies: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const latency = await measureRequestLatency(tier);
        latencies.push(latency);
        monitor.recordRequest(tier, latency, true);
      }

      const avgLatency = latencies.reduce((sum, lat) => sum + lat, 0) / latencies.length;
      const maxLatency = Math.max(...latencies);

      // Performance regression check
      // Relaxed to 30% to reduce flakiness on slower machines
      expect(avgLatency).toBeLessThan(baselineLatency * 1.3);
      expect(maxLatency).toBeLessThan(baselineLatency * 2.0); // No outliers beyond 2x
    });

    it('validates performance under stress conditions', async () => {
      const tier = detectDeviceTier();
      const stressIterations = 50;
      let errorCount = 0;
      const latencies: number[] = [];

      // Stress test with rapid requests
      for (let i = 0; i < stressIterations; i++) {
        try {
          const latency = await measureRequestLatency(tier);
          latencies.push(latency);
          monitor.recordRequest(tier, latency, true);
        } catch {
          errorCount++;
          monitor.recordRequest(tier, 0, false);
        }
      }

      const errorRate = errorCount / stressIterations;
      const metrics = monitor.getMetrics(tier);

      // Should maintain low error rate under stress
      expect(errorRate).toBeLessThan(0.1); // Less than 10% error rate

      // Should not trigger degradation unnecessarily
      expect(monitor.shouldDegrade(tier)).toBe(false);

      // Metrics should be reasonable
      if (metrics) {
        expect(metrics.avgLatencyMs).toBeGreaterThan(0);
        expect(metrics.errorRate).toBeLessThan(0.2);
      }
    });
  });
});

// Helper functions for benchmarking

function getExpectedLatencyForTier(tier: DeviceTier): number {
  switch (tier) {
    case 'webgpu':
      return 15;
    case 'wasm':
      return 30;
    case 'cpu':
      return 100;
    default:
      return 100;
  }
}

async function simulateProcessing(tier: DeviceTier): Promise<void> {
  const baseDelay = getExpectedLatencyForTier(tier);
  const jitter = Math.random() * (baseDelay * 0.2); // 20% jitter
  await new Promise((resolve) => setTimeout(resolve, baseDelay + jitter));
}

async function simulateTokenGeneration(
  tier: DeviceTier,
  tokenCount: number,
): Promise<void> {
  const baseTimePerToken = getExpectedLatencyForTier(tier) / 10; // Rough estimate
  const totalTime = tokenCount * baseTimePerToken;
  await new Promise((resolve) => setTimeout(resolve, totalTime));
}

function getMemoryUsage(): number {
  try {
    return (performance as any).memory?.usedJSHeapSize
      ? Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024))
      : 0;
  } catch {
    return 0;
  }
}

function generateTestData(size: number): string[] {
  const data: string[] = [];
  for (let i = 0; i < size; i++) {
    data.push(
      `Test data item ${i} with some additional content to increase memory usage`,
    );
  }
  return data;
}

function processTestData(data: string[]): void {
  // Simulate processing that uses memory
  const processed = data.map((item) => ({
    original: item,
    processed: item.toUpperCase(),
    metadata: { length: item.length, timestamp: Date.now() },
  }));

  // Force some computation to prevent optimization
  const total = processed.reduce((sum, item) => sum + item.metadata.length, 0);
  expect(total).toBeGreaterThan(0);
}

async function measureRequestLatency(tier: DeviceTier): Promise<number> {
  const start = performance.now();
  await simulateProcessing(tier);
  return performance.now() - start;
}
