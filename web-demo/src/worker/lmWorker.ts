/*╔══════════════════════════════════════════════════════╗
  ║  ░  L M   W O R K E R  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║  WHAT ▸ Transformers.js bridge for main-thread       ║
  ║  WHY  ▸ Keep UI responsive; stream tokens via post   ║
  ║  HOW  ▸ init on first use; handle generate/abort     ║
  ╚══════════════════════════════════════════════════════╝ */
/// <reference lib="webworker" />

import { createQwenTokenStreamer } from '../../../core/lm/transformersRunner';

type Msg =
  | { type: 'generate'; requestId: string; params: any }
  | { type: 'abort' };

// Decide local/remote based on env flag; allow CI override for asset strategy
const MT_LM_AVAILABLE = (self as unknown as { MT_LM_AVAILABLE?: string }).MT_LM_AVAILABLE ?? (globalThis as any).MT_LM_AVAILABLE;

let streamerPromise: Promise<ReturnType<typeof createQwenTokenStreamer>> | null = null;
async function getStreamer() {
  if (streamerPromise) return streamerPromise;
  streamerPromise = (async () => {
    const cdn = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@latest/dist/';
    const localOnly = MT_LM_AVAILABLE === 'local';
    async function canFetch(url: string): Promise<boolean> {
      try {
        const res = await fetch(url, { method: 'HEAD' });
        return !!res.ok;
      } catch {
        return false;
      }
    }
    const candidate = cdn + 'ort-wasm-simd-threaded.jsep.mjs';
    const cdnOk = await canFetch(candidate);
    const wasmPaths = localOnly ? '/wasm/' : (cdnOk ? cdn : '/wasm/');
    return createQwenTokenStreamer({ localOnly, wasmPaths });
  })();
  return streamerPromise;
}
let controller: AbortController | null = null;

self.addEventListener('message', async (e: MessageEvent<Msg>) => {
  const msg = e.data;
  if (!msg) return;
  if (msg.type === 'abort') {
    try { controller?.abort(); } catch {}
    return;
  }
  if (msg.type === 'generate') {
    const { requestId, params } = msg;
    controller = new AbortController();
    try {
      console.log('[LMWorker] Generate request:', { requestId, prompt: (params.settings as any)?.prompt?.slice(0, 50) });
      const streamer = await getStreamer();
      console.log('[LMWorker] Streamer ready, starting generation');
      let chunkCount = 0;
      for await (const chunk of streamer.generateStream({ prompt: (params.settings as any)?.prompt ?? params.text.slice(params.band.start, params.band.end), maxNewTokens: (params.settings as any)?.maxNewTokens })) {
        chunkCount++;
        console.log('[LMWorker] Chunk', chunkCount, ':', chunk.slice(0, 20));
        (self as unknown as Worker).postMessage({ type: 'chunk', requestId, text: chunk });
      }
      console.log('[LMWorker] Generation complete, total chunks:', chunkCount);
      (self as unknown as Worker).postMessage({ type: 'done', requestId });
    } catch (err: any) {
      console.error('[LMWorker] Generation failed:', err);
      (self as unknown as Worker).postMessage({ type: 'error', requestId, message: String(err?.message || err) });
    }
  }
});

// Add error handler for worker
self.addEventListener('error', (e) => {
  console.error('[LMWorker] Worker error:', e);
});

self.addEventListener('unhandledrejection', (e) => {
  console.error('[LMWorker] Unhandled rejection:', e.reason);
});


