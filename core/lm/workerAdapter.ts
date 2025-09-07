/*╔══════════════════════════════════════════════════════╗
  ║  ░  W O R K E R   L M   A D A P T E R  ░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║  WHAT ▸ LMAdapter backed by a Web Worker             ║
  ║  WHY  ▸ Offload Transformers.js off main thread      ║
  ║  HOW  ▸ Message API: init/generate/abort/status      ║
  ╚══════════════════════════════════════════════════════╝ */
import type { LMAdapter, LMCapabilities, LMInitOptions, LMStreamParams } from './types';

type WorkerMessage =
  | { type: 'ready' }
  | { type: 'status'; payload: unknown }
  | { type: 'chunk'; requestId: string; text: string }
  | { type: 'done'; requestId: string }
  | { type: 'error'; requestId?: string; message: string };

export function createWorkerLMAdapter(makeWorker: () => Worker): LMAdapter {
  let worker: Worker | null = null;
  let aborted = false;
  let runs = 0;
  let staleDrops = 0;

  function ensureWorker(): Worker {
    if (worker) return worker;
    worker = makeWorker();
    return worker;
  }

  return {
    init(_opts?: LMInitOptions): LMCapabilities {
      ensureWorker();
      return { backend: 'unknown', maxContextTokens: 1024 };
    },
    abort() {
      aborted = true;
      try { worker?.postMessage({ type: 'abort' }); } catch {}
    },
    getStats() {
      return { runs, staleDrops };
    },
    async *stream(params: LMStreamParams): AsyncIterable<string> {
      const w = ensureWorker();
      const requestId = `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      aborted = false;
      runs += 1;
      const chunks: string[] = [];
      let resolver: (() => void) | null = null;
      let closed = false;

      function push(text: string) {
        chunks.push(text);
        if (resolver) { const r = resolver; resolver = null; r(); }
      }
      function close() {
        closed = true;
        if (resolver) { const r = resolver; resolver = null; r(); }
      }
      async function wait() {
        if (chunks.length || closed) return;
        await new Promise<void>((r) => { resolver = r; });
      }

      const onMessage = (ev: MessageEvent<WorkerMessage>) => {
        const msg = ev.data;
        if (!msg) return;
        if (msg.type === 'chunk' && msg.requestId === requestId) {
          if (!aborted) push(msg.text);
        } else if (msg.type === 'done' && msg.requestId === requestId) {
          close();
        } else if (msg.type === 'error' && (!msg.requestId || msg.requestId === requestId)) {
          close();
        }
      };
      w.addEventListener('message', onMessage);
      try {
        w.postMessage({ type: 'generate', requestId, params });
        while (!closed || chunks.length) {
          if (chunks.length) {
            yield chunks.shift() as string;
          } else {
            await wait();
          }
        }
      } finally {
        w.removeEventListener('message', onMessage);
      }
    },
  };
}


