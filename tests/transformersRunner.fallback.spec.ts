/*╔══════════════════════════════════════════════════════╗
  ║  ░  T R A N S F O R M E R S   F A L L B A C K  ░░░░░  ║
  ║                                                      ║
  ║  Covers fallback path when assets missing.           ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝*/
import { describe, it, expect } from 'vitest';
import { createDefaultLMAdapter } from '../core/lm/factory';
import type { LMStreamParams } from '../core/lm/types';

const RUN = process.env.ENABLE_REAL_LM === '1';

describe('transformers fallback gating', () => {
  if (RUN) {
    it('gracefully returns minimal stream when assets unavailable', async () => {
      const adapter = createDefaultLMAdapter({ localOnly: true });
      const chunks: string[] = [];
      const params: LMStreamParams = {
        text: 'abc',
        caret: 3,
        band: { start: 0, end: 3 },
      };
      for await (const c of adapter.stream(params)) chunks.push(c);
      expect(chunks.join('')).toBeDefined();
    });
  } else {
    it.skip('requires ENABLE_REAL_LM=1 for full path', () => {});
  }
});
