/*╔══════════════════════════════════════════════════════╗
  ║  ░  A U T O  D E V I C E  T I E R S  ░░░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ Auto-generated from docs/spec YAML
  • WHY  ▸ Do not edit by hand; edit YAML instead
  • HOW  ▸ Generated via scripts/doc2code.cjs
*/

export interface DeviceTierPolicy {
  maxTokens: number;
  debounceMs: number;
  cooldownMs: number;
  toneAnalysisScope: number; // sentences for tone analysis
  memoryPressureThreshold: number; // MB
  maxConcurrentRequests: number;
}

export interface DeviceTiers {
  webgpu: DeviceTierPolicy;
  wasm: DeviceTierPolicy;
  cpu: DeviceTierPolicy;
}

export interface PerformanceMetrics {
  avgLatencyMs: number;
  requestsPerMinute: number;
  memoryUsageMB: number;
  errorRate: number;
  lastUpdated: number;
}
export const DEVICE_TIERS: DeviceTiers = {
  webgpu: {
    maxTokens: 48,
    debounceMs: 120,
    cooldownMs: 150,
    toneAnalysisScope: 20, // sentences for tone analysis
    memoryPressureThreshold: 512, // MB
    maxConcurrentRequests: 3,
  },
  wasm: {
    maxTokens: 24,
    debounceMs: 180,
    cooldownMs: 250,
    toneAnalysisScope: 20, // sentences for tone analysis
    memoryPressureThreshold: 256, // MB
    maxConcurrentRequests: 2,
  },
  cpu: {
    maxTokens: 16,
    debounceMs: 220,
    cooldownMs: 300,
    toneAnalysisScope: 10, // sentences for tone analysis
    memoryPressureThreshold: 128, // MB
    maxConcurrentRequests: 1,
  },
} as const;

export type DeviceTier = keyof DeviceTiers;

export class PerformanceMonitor {
  private metrics: Map<DeviceTier, PerformanceMetrics> = new Map();
  private requestTimes: Map<DeviceTier, number[]> = new Map();
  private requestCounts: Map<DeviceTier, number> = new Map();
  private errorCounts: Map<DeviceTier, number> = new Map();

  constructor() {
    // Initialize metrics for all tiers
    (Object.keys(DEVICE_TIERS) as DeviceTier[]).forEach(tier => {
      this.metrics.set(tier, {
        avgLatencyMs: 0,
        requestsPerMinute: 0,
        memoryUsageMB: 0,
        errorRate: 0,
        lastUpdated: Date.now(),
      });
      this.requestTimes.set(tier, []);
      this.requestCounts.set(tier, 0);
      this.errorCounts.set(tier, 0);
    });
  }

  recordRequest(tier: DeviceTier, latencyMs: number, success: boolean = true): void {
    const times = this.requestTimes.get(tier) || [];
    times.push(latencyMs);
    
    // Keep only last 100 requests for rolling average
    if (times.length > 100) {
      times.shift();
    }
    
    this.requestTimes.set(tier, times);
    this.requestCounts.set(tier, (this.requestCounts.get(tier) || 0) + 1);
    
    if (!success) {
      this.errorCounts.set(tier, (this.errorCounts.get(tier) || 0) + 1);
    }
    
    this.updateMetrics(tier);
  }

  private updateMetrics(tier: DeviceTier): void {
    const times = this.requestTimes.get(tier) || [];
    const totalRequests = this.requestCounts.get(tier) || 0;
    const errorCount = this.errorCounts.get(tier) || 0;
    
    const avgLatency = times.length > 0 
      ? times.reduce((sum, time) => sum + time, 0) / times.length 
      : 0;
    
    // Calculate requests per minute (rough estimate)
    const now = Date.now();
    const recentRequests = times.length;
    const requestsPerMinute = recentRequests > 0 ? recentRequests * 6 : 0; // rough estimate
    
    const errorRate = totalRequests > 0 ? errorCount / totalRequests : 0;
    
    this.metrics.set(tier, {
      avgLatencyMs: Math.round(avgLatency),
      requestsPerMinute,
      memoryUsageMB: this.estimateMemoryUsage(),
      errorRate: Math.round(errorRate * 100) / 100,
      lastUpdated: now,
    });
  }

  private estimateMemoryUsage(): number {
    // Simple memory estimation - in real implementation would use performance.memory
    try {
      return (performance as any).memory?.usedJSHeapSize 
        ? Math.round((performance as any).memory.usedJSHeapSize / (1024 * 1024))
        : 0;
    } catch {
      return 0;
    }
  }

  getMetrics(tier: DeviceTier): PerformanceMetrics | null {
    return this.metrics.get(tier) || null;
  }

  getAllMetrics(): Record<DeviceTier, PerformanceMetrics> {
    const result = {} as Record<DeviceTier, PerformanceMetrics>;
    this.metrics.forEach((metrics, tier) => {
      result[tier] = metrics;
    });
    return result;
  }

  shouldDegrade(tier: DeviceTier): boolean {
    const metrics = this.getMetrics(tier);
    const policy = DEVICE_TIERS[tier];
    
    if (!metrics) return false;
    
    // Check memory pressure
    if (metrics.memoryUsageMB > policy.memoryPressureThreshold) {
      return true;
    }
    
    // Check error rate
    if (metrics.errorRate > 0.2) { // 20% error rate threshold
      return true;
    }
    
    // Check latency degradation
    const expectedLatency = getExpectedLatency(tier);
    if (metrics.avgLatencyMs > expectedLatency * 2) {
      return true;
    }
    
    return false;
  }
}

export function detectDeviceTier(): DeviceTier {
  // Check WebGPU support
  if ('gpu' in navigator && (navigator as any).gpu) {
    return 'webgpu';
  }
  
  // Check WASM support with threads/SIMD
  if (typeof WebAssembly !== 'undefined') {
    try {
      // Simple WASM feature detection
      const hasThreads = typeof SharedArrayBuffer !== 'undefined';
      const hasSIMD = WebAssembly.validate(new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, 0x01, 0x00, 0x00, 0x00,
        0x01, 0x05, 0x01, 0x60, 0x00, 0x01, 0x7b, 0x03,
        0x02, 0x01, 0x00, 0x0a, 0x0a, 0x01, 0x08, 0x00,
        0xfd, 0x0c, 0xfd, 0x0c, 0x0b
      ]));
      
      if (hasThreads || hasSIMD) {
        return 'wasm';
      }
    } catch {
      // Fall through to CPU
    }
  }
  
  return 'cpu';
}

export function getExpectedLatency(tier: DeviceTier): number {
  switch (tier) {
    case 'webgpu': return 15;
    case 'wasm': return 30;
    case 'cpu': return 100;
    default: return 100;
  }
}

export function adjustPolicyForPressure(
  tier: DeviceTier, 
  metrics: PerformanceMetrics
): DeviceTierPolicy {
  const basePolicy = DEVICE_TIERS[tier];
  
  // If under memory pressure, reduce scope and increase cooldowns
  if (metrics.memoryUsageMB > basePolicy.memoryPressureThreshold * 0.8) {
    return {
      ...basePolicy,
      toneAnalysisScope: Math.max(5, Math.floor(basePolicy.toneAnalysisScope * 0.7)),
      cooldownMs: Math.floor(basePolicy.cooldownMs * 1.5),
      maxTokens: Math.max(8, Math.floor(basePolicy.maxTokens * 0.8)),
      maxConcurrentRequests: Math.max(1, basePolicy.maxConcurrentRequests - 1),
    };
  }
  
  // If high error rate, be more conservative
  if (metrics.errorRate > 0.1) {
    return {
      ...basePolicy,
      debounceMs: Math.floor(basePolicy.debounceMs * 1.3),
      cooldownMs: Math.floor(basePolicy.cooldownMs * 1.2),
      maxConcurrentRequests: Math.max(1, basePolicy.maxConcurrentRequests - 1),
    };
  }
  
  return basePolicy;
}
