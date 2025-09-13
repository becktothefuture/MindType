/*╔══════════════════════════════════════════════════════╗
  ║  ░  W O R K E R   L M   A D A P T E R  ░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║  WHAT ▸ LMAdapter backed by a Web Worker             ║
  ║  WHY  ▸ Offload Transformers.js off main thread      ║
  ║  HOW  ▸ Message API: init/generate/abort/status      ║
  ╚══════════════════════════════════════════════════════╝ */
import type { LMAdapter, LMCapabilities, LMInitOptions, LMStreamParams } from './types';
import { diagBus } from '../diagnosticsBus';

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
      try {
        worker?.postMessage({ type: 'abort' });
      } catch {}
    },
    getStats() {
      return { runs, staleDrops };
    },
    async *stream(params: LMStreamParams): AsyncIterable<string> {
      const w = ensureWorker();
      const requestId = `r-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      aborted = false;
      runs += 1;

      // Enhanced diagnostic logging for LM-501
      console.log(`[WorkerAdapter] STREAM_INIT ${requestId}`, {
        runs,
        staleDrops,
        bandStart: params.band?.start,
        bandEnd: params.band?.end,
        textLength: params.text?.length || 0,
        caret: params.caret,
        timestamp: new Date().toISOString(),
      });
      try {
        diagBus.publish({
          channel: 'lm-wire',
          time: Date.now(),
          phase: 'stream_init',
          requestId,
          detail: {
            bandStart: params.band?.start,
            bandEnd: params.band?.end,
            textLength: params.text?.length || 0,
            caret: params.caret,
          },
        });
      } catch {}
      const chunks: string[] = [];
      let resolver: (() => void) | null = null;
      let closed = false;

      function push(text: string) {
        chunks.push(text);
        if (resolver) {
          const r = resolver;
          resolver = null;
          r();
        }
      }
      function close() {
        closed = true;
        if (resolver) {
          const r = resolver;
          resolver = null;
          r();
        }
      }
      async function wait() {
        if (chunks.length || closed) return;
        await new Promise<void>((r) => {
          resolver = r;
        });
      }

      const onMessage = (ev: MessageEvent<WorkerMessage>) => {
        const msg = ev.data;
        if (!msg) return;
        const rid = (msg as WorkerMessage & { requestId?: string })?.requestId;
        console.log(`[WorkerAdapter] MSG_RECV ${requestId}`, {
          type: msg.type,
          messageRequestId: rid,
          matchesRequest: rid === requestId,
          aborted,
        });
        try {
          diagBus.publish({
            channel: 'lm-wire',
            time: Date.now(),
            phase: 'msg_recv',
            requestId,
            detail: { type: (msg as any).type, messageRequestId: rid, matches: rid === requestId, aborted },
          });
        } catch {}
        if (msg.type === 'chunk' && rid === requestId) {
          if (!aborted) {
            console.log(`[WorkerAdapter] CHUNK_RECV ${requestId}`, {
              chunkLength: msg.text.length,
              chunkPreview: msg.text.slice(0, 20),
              totalChunksQueued: chunks.length + 1,
            });
            try {
              diagBus.publish({
                channel: 'lm-wire',
                time: Date.now(),
                phase: 'chunk_recv',
                requestId,
                detail: { chunkLength: msg.text.length },
              });
            } catch {}
            push(msg.text);
          } else {
            console.log(`[WorkerAdapter] CHUNK_IGNORED ${requestId}`, {
              reason: 'aborted',
            });
          }
        } else if (msg.type === 'done' && rid === requestId) {
          console.log(`[WorkerAdapter] STREAM_DONE ${requestId}`, {
            totalChunksProcessed: chunks.length,
            aborted,
          });
          try {
            diagBus.publish({
              channel: 'lm-wire',
              time: Date.now(),
              phase: 'stream_done',
              requestId,
              detail: { totalChunksProcessed: chunks.length, aborted },
            });
          } catch {}
          close();
        } else if (msg.type === 'error' && (!rid || rid === requestId)) {
          console.error(`[WorkerAdapter] STREAM_ERROR ${requestId}`, {
            error: msg.message,
            chunksReceived: chunks.length,
            aborted,
          });
          // Surface error to UI by throwing
          try {
            diagBus.publish({
              channel: 'lm-wire',
              time: Date.now(),
              phase: 'stream_error',
              requestId,
              detail: { error: msg.message, chunksReceived: chunks.length, aborted },
            });
          } catch {}
          throw new Error(`LM Worker Error: ${msg.message}`);
        }
      };
      w.addEventListener('message', onMessage);

      // Add timeout to prevent hanging
      const timeoutMs = 30000; // 30 second timeout
      const timeoutId = setTimeout(() => {
        console.error(`[WorkerAdapter] TIMEOUT ${requestId}`, {
          timeoutMs,
          chunksReceived: chunks.length,
          aborted,
        });
        try {
          diagBus.publish({
            channel: 'lm-wire',
            time: Date.now(),
            phase: 'stream_error',
            requestId,
            detail: { timeoutMs, chunksReceived: chunks.length, aborted },
          });
        } catch {}
        close();
        throw new Error(`LM Worker timeout after ${timeoutMs}ms`);
      }, timeoutMs);

      try {
        console.log(`[WorkerAdapter] MSG_SEND ${requestId}`, {
          type: 'generate',
          bandStart: params.band?.start,
          bandEnd: params.band?.end,
          hasSettings: !!params.settings,
        });
        w.postMessage({ type: 'generate', requestId, params });
        try {
          diagBus.publish({
            channel: 'lm-wire',
            time: Date.now(),
            phase: 'msg_send',
            requestId,
            detail: { bandStart: params.band?.start, bandEnd: params.band?.end, hasSettings: !!params.settings },
          });
        } catch {}

        let yieldedChunks = 0;
        while (!closed || chunks.length) {
          if (chunks.length) {
            const chunk = chunks.shift() as string;
            yieldedChunks++;
            console.log(`[WorkerAdapter] CHUNK_YIELD ${requestId}`, {
              chunkIndex: yieldedChunks,
              chunkLength: chunk.length,
              remainingQueued: chunks.length,
            });
            try {
              diagBus.publish({
                channel: 'lm-wire',
                time: Date.now(),
                phase: 'chunk_yield',
                requestId,
                detail: { chunkIndex: yieldedChunks, chunkLength: chunk.length, remainingQueued: chunks.length },
              });
            } catch {}
            yield chunk;
          } else {
            await wait();
          }
        }

        console.log(`[WorkerAdapter] STREAM_COMPLETE ${requestId}`, {
          totalYielded: yieldedChunks,
          aborted,
        });
        try {
          diagBus.publish({
            channel: 'lm-wire',
            time: Date.now(),
            phase: 'stream_done',
            requestId,
            detail: { totalYielded: yieldedChunks, aborted },
          });
        } catch {}
      } finally {
        clearTimeout(timeoutId);
        w.removeEventListener('message', onMessage);
      }
    },
  };
}
