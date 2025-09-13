/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  S T A G I N G   B U F F E R   B R A N C H E S  ░░░░░░░░  ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Cover TTL/eviction and nextCommit branches
  • WHY  ▸ Nudge core branch coverage to threshold
*/
import { describe, it, expect } from 'vitest';
import { StagingBuffer } from '../core/stagingBuffer';

describe('StagingBuffer branches', () => {
  it('evicts when exceeding max and cleans up TTL/ discard', () => {
    const sb = new StagingBuffer({ maxProposals: 2, ttlMs: 10 });
    sb.add({ id: 'a', start: 0, end: 1, text: 'x' });
    sb.add({ id: 'b', start: 1, end: 2, text: 'y' });
    sb.add({ id: 'c', start: 2, end: 3, text: 'z' }); // evicts 'a'
    expect(sb.list().some((p) => p.id === 'a')).toBe(false);
    // Mark one as discard and cleanup
    sb.updateScore(
      'b',
      {
        inputFidelity: 0.5,
        transformationQuality: 0.5,
        contextCoherence: 0.5,
        temporalDecay: 1,
        combined: 0.5,
      },
      'discard',
    );
    sb.cleanup(Date.now() + 20); // TTL expired
    expect(sb.list().every((p) => p.id !== 'b')).toBe(true);
  });

  it('nextCommit returns and removes the next commit', () => {
    const sb = new StagingBuffer();
    sb.add({ id: 'a', start: 0, end: 1, text: 'x' });
    sb.updateScore(
      'a',
      {
        inputFidelity: 0.9,
        transformationQuality: 0.9,
        contextCoherence: 0.9,
        temporalDecay: 1,
        combined: 0.9,
      },
      'commit',
    );
    const c = sb.nextCommit();
    expect(c?.id).toBe('a');
    expect(sb.list().length).toBe(0);
  });
});
