/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T R A N S F O R M E R S   C L I E N T — E D G E S  ░░░░░  ║
  ║                                                              ║
  ║   Covers local-asset verification and stream gating branches ║
  ║   to satisfy coverage thresholds and guard behavior.         ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
*/
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  verifyLocalAssets,
  createTransformersAdapter,
  getTierPolicy,
} from '../core/lm/transformersClient';

function makeRunner(chunks: string[]) {
  return {
    async *generateStream() {
      for (const c of chunks) yield c;
    },
  } as const;
}

describe('Transformers client (assets + gating)', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.stubGlobal('fetch', originalFetch as unknown as typeof fetch);
  });

  it('verifyLocalAssets: returns true when localOnly=false (skips checks)', async () => {
    const ok = await verifyLocalAssets(false);
    expect(ok).toBe(true);
  });

  it('verifyLocalAssets: returns true when HEAD ok for expected paths', async () => {
    vi.stubGlobal(
      'fetch',
      (async (_url: string, _init?: RequestInit) =>
        ({ ok: true, status: 200 }) as unknown as Response) as unknown as typeof fetch,
    );
    const ok = await verifyLocalAssets(true);
    expect(ok).toBe(true);
  });

  it('verifyLocalAssets: returns false on 404', async () => {
    vi.stubGlobal(
      'fetch',
      (async (_url: string, _init?: RequestInit) =>
        ({ ok: false, status: 404 }) as unknown as Response) as unknown as typeof fetch,
    );
    const ok = await verifyLocalAssets(true);
    expect(ok).toBe(false);
  });

  it('verifyLocalAssets: returns false on network error', async () => {
    vi.stubGlobal('fetch', (async () => {
      throw new Error('network');
    }) as unknown as typeof fetch);
    const ok = await verifyLocalAssets(true);
    expect(ok).toBe(false);
  });

  it('stream: gates when localOnly=true and assets unavailable', async () => {
    // Make HEAD return 404
    vi.stubGlobal(
      'fetch',
      (async (_url: string, _init?: RequestInit) =>
        ({ ok: false, status: 404 }) as unknown as Response) as unknown as typeof fetch,
    );
    const adapter = createTransformersAdapter(makeRunner(['ok']));
    adapter.init?.({ preferBackend: 'cpu' });
    const chunks: string[] = [];
    for await (const c of adapter.stream({
      text: 'abc ok',
      caret: 6,
      band: { start: 4, end: 6 },
      settings: { localOnly: true },
    })) {
      chunks.push(c);
    }
    expect(chunks.length).toBe(0);
  });

  it('stream: passes when localOnly=true and assets available', async () => {
    vi.stubGlobal(
      'fetch',
      (async (_url: string, _init?: RequestInit) =>
        ({ ok: true, status: 200 }) as unknown as Response) as unknown as typeof fetch,
    );
    const adapter = createTransformersAdapter(makeRunner(['a', 'b']));
    adapter.init?.({ preferBackend: 'cpu' });
    const chunks: string[] = [];
    for await (const c of adapter.stream({
      text: 'xx ab',
      caret: 5,
      band: { start: 3, end: 5 },
      settings: { localOnly: true },
    })) {
      chunks.push(c);
    }
    expect(chunks.join('')).toBe('ab');
  });

  it('getTierPolicy: returns cpu policy for unknown backend', () => {
    const p = getTierPolicy('unknown');
    expect(p.cooldownMs).toBeGreaterThan(0);
  });
});
