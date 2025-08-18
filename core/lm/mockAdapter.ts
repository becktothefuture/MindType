/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  M O C K   L M   A D A P T E R  ░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Deterministic stub for tests and demos.                    ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import type { LMAdapter, LMCapabilities, LMStreamParams } from './types';

export function createMockLMAdapter(): LMAdapter {
  let aborted = false;
  return {
    init(): LMCapabilities {
      return { backend: 'cpu', maxContextTokens: 256 };
    },
    abort() {
      aborted = true;
    },
    async *stream(params: LMStreamParams): AsyncIterable<string> {
      aborted = false;
      const { band, text } = params;
      // naive correction: fix "teh"->"the" inside band only
      const bandText = text.slice(band.start, band.end).replaceAll(' teh ', ' the ');
      const chunks = bandText.match(/.{1,8}/g) ?? [];
      for (const c of chunks) {
        if (aborted) return;
        // simulate async streaming
        await new Promise((r) => setTimeout(r, 0));
        yield c;
      }
    },
  };
}
