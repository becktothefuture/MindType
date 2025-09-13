/*╔══════════════════════════════════════════════════════╗
  ║  ░  D I A G N O S T I C S   B U S  ░░░░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║   Typed, bounded in-memory bus for development      ║
  ║   diagnostics across engines (noise/context/LM).    ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Publish/subscribe diagnostics with ring buffers
  • WHY  ▸ Consistent, low-overhead debugging in dev builds
  • HOW  ▸ Channels with bounded arrays; no persistence
*/

export type NoiseDiagEvent = {
  channel: 'noise';
  time: number;
  rule: string;
  start: number | null;
  end: number | null;
  text: string | null;
  window: { start: number; end: number };
  decision: 'applied' | 'skipped' | 'none';
};

export type LMWireEvent = {
  channel: 'lm-wire';
  time: number;
  phase:
    | 'stream_init'
    | 'msg_send'
    | 'msg_recv'
    | 'chunk_recv'
    | 'chunk_yield'
    | 'stream_done'
    | 'stream_error';
  requestId: string;
  detail?: Record<string, unknown>;
};

export type LMJsonlEvent = {
  channel: 'lm-jsonl';
  time: number;
  raw: string;
};

export type ContextWindowEvent = {
  channel: 'context-window';
  time: number;
  bandStart: number;
  bandEnd: number;
  spanPreview: string;
};

export type DiagEvent = NoiseDiagEvent | LMWireEvent | LMJsonlEvent | ContextWindowEvent;

type Channel = DiagEvent['channel'];

const DEFAULT_BOUNDS: Record<Channel, number> = {
  'noise': 50,
  'lm-wire': 100,
  'lm-jsonl': 50,
  'context-window': 50,
};

class Ring<T> {
  private buf: T[] = [];
  constructor(private cap: number) {}
  push(v: T) {
    this.buf.push(v);
    if (this.buf.length > this.cap) this.buf.splice(0, this.buf.length - this.cap);
  }
  values(): T[] { return this.buf.slice(); }
}

class DiagnosticsBus {
  private rings: { [K in Channel]: Ring<Extract<DiagEvent, { channel: K }>> };
  private subs: { [K in Channel]: Set<(ev: Extract<DiagEvent, { channel: K }>) => void> };

  constructor(bounds?: Partial<Record<Channel, number>>) {
    this.rings = {
      'noise': new Ring(bounds?.noise ?? DEFAULT_BOUNDS['noise']),
      'lm-wire': new Ring(bounds?.['lm-wire'] ?? DEFAULT_BOUNDS['lm-wire']),
      'lm-jsonl': new Ring(bounds?.['lm-jsonl'] ?? DEFAULT_BOUNDS['lm-jsonl']),
      'context-window': new Ring(bounds?.['context-window'] ?? DEFAULT_BOUNDS['context-window']),
    } as any;
    this.subs = {
      'noise': new Set(),
      'lm-wire': new Set(),
      'lm-jsonl': new Set(),
      'context-window': new Set(),
    } as any;
  }

  publish<E extends DiagEvent>(event: E): void {
    const ring = this.rings[event.channel] as Ring<E>;
    ring.push(event);
    const subs = this.subs[event.channel] as Set<(ev: E) => void>;
    subs.forEach((fn) => {
      try { fn(event); } catch {}
    });
  }

  subscribe<K extends Channel>(channel: K, fn: (ev: Extract<DiagEvent, { channel: K }>) => void): () => void {
    const set = this.subs[channel] as Set<typeof fn>;
    set.add(fn);
    return () => set.delete(fn);
  }

  getValues<K extends Channel>(channel: K): Array<Extract<DiagEvent, { channel: K }>> {
    const ring = this.rings[channel] as Ring<Extract<DiagEvent, { channel: K }>>;
    return ring.values();
  }
}

// Singleton for demo/dev builds only
export const diagBus = new DiagnosticsBus();


