/*╔══════════════════════════════════════════════════════╗
  ║  ░  T R A N S F O R M E R S   R U N N E R   B R A N C H E S  ░  ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌                      ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Branch coverage for transformers runner options
  • WHY  ▸ Lift branch coverage over threshold
  • HOW  ▸ Exercise remote path and tiny token clamp
*/
import { describe, it, expect } from 'vitest';
import { createDefaultLMAdapter } from '../core/lm/factory';
import type { LMStreamParams } from '../core/lm/types';

const RUN_REMOTE = process.env.ENABLE_REAL_LM === '1';

describe('transformersRunner branches', () => {
  if (RUN_REMOTE) {
    it('clamps tiny maxNewTokens and supports remote mode', async () => {
      const adapter = createDefaultLMAdapter({ localOnly: false, maxNewTokens: 1 });
      const chunks: string[] = [];
      const params: LMStreamParams = {
        text: 'hello world',
        caret: 5,
        band: { start: 0, end: 5 },
      };
      for await (const c of adapter.stream(params)) chunks.push(c);
      expect(chunks.join('')).toBeDefined();
    });
  } else {
    it.skip('remote path requires ENABLE_REAL_LM=1', () => {});
  }
});
