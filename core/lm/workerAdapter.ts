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
  console.log('[WorkerAdapter] Creating new worker...');
  worker = makeWorker();
  
  worker.onerror = (e) => {
    console.error('[WorkerAdapter] Worker error:', e);
    // Reset worker on error to allow retry
    worker = null;
  };
  
  worker.onmessageerror = (e) => {
    console.error('[WorkerAdapter] Worker message error:', e);
  };
  
  console.log('[WorkerAdapter] Worker created successfully');
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
        const rid = (msg as any)?.requestId;
        console.log('[WorkerAdapter] Message received:', { type: msg.type, requestId: rid });
        if (msg.type === 'chunk' && rid === requestId) {
          if (!aborted) {
            console.log('[WorkerAdapter] Processing chunk:', msg.text.slice(0, 20));
            push(msg.text);
          } else {
            console.log('[WorkerAdapter] Chunk ignored (aborted)');
          }
        } else if (msg.type === 'done' && rid === requestId) {
          console.log('[WorkerAdapter] Stream completed');
          close();
        } else if (msg.type === 'error' && (!rid || rid === requestId)) {
          console.error('[WorkerAdapter] Stream error:', msg.message);
          // Surface error to UI by throwing
          throw new Error(`LM Worker Error: ${msg.message}`);
        }
      };
      w.addEventListener('message', onMessage);
      
      // Add timeout to prevent hanging
      const timeoutMs = 30000; // 30 second timeout
      const timeoutId = setTimeout(() => {
        console.error('[WorkerAdapter] Stream timeout after', timeoutMs, 'ms');
        close();
        throw new Error(`LM Worker timeout after ${timeoutMs}ms`);
      }, timeoutMs);
      
      try {
        console.log('[WorkerAdapter] Sending generate message:', { requestId, band: params.band });
        w.postMessage({ type: 'generate', requestId, params });
        while (!closed || chunks.length) {
          if (chunks.length) {
            yield chunks.shift() as string;
          } else {
            await wait();
          }
        }
      } finally {
        clearTimeout(timeoutId);
        w.removeEventListener('message', onMessage);
      }
    },
  };
}


