/*╔══════════════════════════════════════════════════════╗
  ║  ░  T R A N S F O R M E R S   C L I E N T   A S S E T S  ░░  ║
  ║                                                      ║
  ║  Verifies verifyLocalAssets(false) path.              ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝*/
import { describe, it, expect } from 'vitest';
import { createDefaultLMAdapter } from '../core/lm/factory';
import type { LMStreamParams } from '../core/lm/types';

const RUN = process.env.ENABLE_REAL_LM === '1';

describe('transformersClient assets branches', () => {
  if (RUN) {
    it('handles verifyLocalAssets false when remote mode', async () => {
      const adapter = createDefaultLMAdapter({ localOnly: false });
      const params: LMStreamParams = {
        text: 'abc',
        caret: 3,
        band: { start: 0, end: 3 },
      };
      const iter = adapter.stream(params);
      let firstChunk: string | undefined;
      for await (const c of iter) {
        firstChunk = c;
        break;
      }
      expect(firstChunk).toBeDefined();
    });
  } else {
    it.skip('requires ENABLE_REAL_LM=1', () => {});
  }
});
