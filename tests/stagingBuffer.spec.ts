/* Auto-generated test for REQ-CONFIDENCE-GATE (staging buffer) */
import { describe, it, expect } from 'vitest';
import { StagingBuffer } from '../core/stagingBuffer';

describe('stagingBuffer', () => {
  it('adds proposals and updates score/state', () => {
    const sb = new StagingBuffer({ maxProposals: 8, ttlMs: 1000 });
    const p = sb.add({ id: 'a', start: 0, end: 5, text: 'Hello' });
    expect(sb.list().length).toBe(1);
    expect(p.state).toBe('hold');
    sb.updateScore(
      'a',
      {
        inputFidelity: 1,
        transformationQuality: 1,
        contextCoherence: 1,
        temporalDecay: 1,
        combined: 1,
      },
      'commit',
    );
    expect(sb.list()[0].state).toBe('commit');
  });

  it('onCaretMove marks overlapping as rollback', () => {
    const sb = new StagingBuffer();
    sb.add({ id: 'x', start: 0, end: 10, text: 'Hello world' });
    const rolled = sb.onCaretMove(5);
    expect(rolled).toBe(1);
    expect(sb.list()[0].state).toBe('rollback');
  });

  it('onCaretMove does nothing when caret is outside proposals', () => {
    const sb = new StagingBuffer();
    sb.add({ id: 'y', start: 0, end: 2, text: 'ab' });
    const rolled = sb.onCaretMove(99);
    expect(rolled).toBe(0);
    expect(sb.list()[0].state).toBe('hold');
  });

  it('cleanup removes stale/discarded', () => {
    const sb = new StagingBuffer({ ttlMs: 1 });
    sb.add({ id: 'x', start: 0, end: 1, text: 'a' });
    // simulate time passing
    sb.cleanup(Date.now() + 5);
    expect(sb.list().length).toBe(0);
  });

  it('nextCommit pops only commit items', () => {
    const sb = new StagingBuffer();
    sb.add({ id: 'h', start: 0, end: 1, text: 'a', state: 'hold' });
    sb.add({ id: 'c', start: 1, end: 2, text: 'b', state: 'commit' });
    const n = sb.nextCommit();
    expect(n?.id).toBe('c');
    expect(sb.list().length).toBe(1);
    // When no commit exists, returns null
    expect(sb.nextCommit()).toBeNull();
  });

  it('cleanup removes explicitly discarded items', () => {
    const sb = new StagingBuffer();
    sb.add({ id: 'd', start: 0, end: 1, text: 'x', state: 'discard' });
    sb.cleanup();
    expect(sb.list().length).toBe(0);
  });
});
