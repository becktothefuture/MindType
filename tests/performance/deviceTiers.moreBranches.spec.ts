/*╔══════════════════════════════════════════════════════╗
  ║  ░  D E V I C E   T I E R S   M O R E   B R A N C H E S  ░  ║
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
*/
import { describe, it, expect } from 'vitest';
import { getExpectedLatency, PerformanceMonitor } from '../../core/lm/deviceTiers';

describe('deviceTiers extra branches', () => {
  it('getExpectedLatency default branch', () => {
    // @ts-ignore force invalid tier
    expect(getExpectedLatency('unknown')).toBe(100);
  });

  it('shouldDegrade returns false when metrics missing', () => {
    const m = new PerformanceMonitor();
    // @ts-ignore
    // direct access to private is not allowed; instead, rely on empty metrics for fabricated tier
    // We simulate by casting and calling with a real tier before any records
    expect(m.shouldDegrade('cpu')).toBe(false);
  });
});
