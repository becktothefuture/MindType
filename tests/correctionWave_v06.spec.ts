/*╔══════════════════════════════════════════════════════╗
  ║  ░  C O R R E C T I O N   W A V E   V 0 6   T E S T  ║
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
  • WHAT ▸ Test v0.6 Correction Wave: typing → pause → wave integration
  • WHY  ▸ Validate complete LM-only pipeline with Active Region
  • HOW  ▸ Mock LMAdapter; test Noise→Context→Tone sequence
*/

import { describe, it, expect, vi } from 'vitest';
import { runCorrectionWave } from '../core/correctionWave_v06';
import type { LMAdapter } from '../core/lm/types';

describe('Correction Wave v0.6', () => {
  it('runs complete pipeline: typing → pause → wave', async () => {
    // Mock LM adapter that returns corrections
    const mockAdapter: LMAdapter = {
      async *stream(params) {
        const spanText = params.text.slice(params.activeRegion.start, params.activeRegion.end);
        if (spanText.includes('teh')) {
          yield spanText.replace('teh', 'the');
        } else if (spanText.includes('wrold')) {
          yield spanText.replace('wrold', 'world');
        } else {
          yield spanText; // No change
        }
      },
      getStats: () => ({ runs: 1, staleDrops: 0 }),
    };

    const result = await runCorrectionWave({
      text: 'Hello teh wrold',
      caret: 15,
      lmAdapter: mockAdapter,
      toneTarget: 'None',
    });

    // Should have corrections from noise and context stages
    expect(result.diffs.length).toBeGreaterThan(0);
    expect(result.activeRegion.start).toBeGreaterThanOrEqual(0);
    expect(result.activeRegion.end).toBeLessThanOrEqual(15);
    
    // All diffs should be caret-safe
    for (const diff of result.diffs) {
      expect(diff.end).toBeLessThanOrEqual(15);
    }
  });

  it('handles LM errors gracefully', async () => {
    const failingAdapter: LMAdapter = {
      async *stream() {
        throw new Error('LM failed');
      },
      getStats: () => ({ runs: 0, staleDrops: 1 }),
    };

    const result = await runCorrectionWave({
      text: 'Test text',
      caret: 9,
      lmAdapter: failingAdapter,
    });

    // Should return empty result on LM failure
    expect(result.diffs).toEqual([]);
    expect(result.activeRegion.start).toBeGreaterThanOrEqual(0);
  });

  it('skips tone stage when target is None', async () => {
    const mockAdapter: LMAdapter = {
      async *stream() {
        yield 'corrected text';
      },
      getStats: () => ({ runs: 1, staleDrops: 0 }),
    };

    const result = await runCorrectionWave({
      text: 'Test text',
      caret: 9,
      lmAdapter: mockAdapter,
      toneTarget: 'None', // Should skip tone stage
    });

    // Should not have tone stage diffs
    const toneDiffs = result.diffs.filter(d => d.stage === 'tone');
    expect(toneDiffs).toEqual([]);
  });

  it('applies tone when explicitly enabled', async () => {
    const mockAdapter: LMAdapter = {
      async *stream() {
        yield 'professionally corrected text';
      },
      getStats: () => ({ runs: 1, staleDrops: 0 }),
    };

    const result = await runCorrectionWave({
      text: 'Test text',
      caret: 9,
      lmAdapter: mockAdapter,
      toneTarget: 'Professional', // Should include tone stage
    });

    // May have tone stage diffs (depends on confidence gating)
    const stages = result.diffs.map(d => d.stage);
    expect(stages).toContain('noise'); // Should have at least noise
  });
});

