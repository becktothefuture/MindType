/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  L M   A D A P T E R   T Y P E S  ░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Contracts for streaming language model corrections.        ║
  ║   Designed to be caret-safe and band-bounded.                ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Interfaces for LM adapter and capabilities
  • WHY  ▸ Enable optional LM integration without behaviour change
  • HOW  ▸ Stream API constrained to [band.start, band.end)
*/

export interface LMCapabilities {
  backend: 'webgpu' | 'wasm' | 'cpu' | 'unknown';
  maxContextTokens?: number;
}

export interface LMInitOptions {
  modelId?: string;
  preferBackend?: 'webgpu' | 'wasm' | 'cpu';
}

export interface LMStreamParams {
  text: string;
  caret: number;
  band: { start: number; end: number };
  settings?: Record<string, unknown>;
}

export interface LMAdapter {
  init?(opts?: LMInitOptions): Promise<LMCapabilities> | LMCapabilities;
  stream(params: LMStreamParams): AsyncIterable<string>;
  abort?(): void;
}
