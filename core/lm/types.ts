/*╔══════════════════════════════════════════════════════════╗
  ║  ░  TYPES  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ╚══════════════════════════════════════════════════════════╝
  • WHAT ▸ LMAdapter streaming contract
  • WHY  ▸ CONTRACT-LM-ADAPTER
  • HOW  ▸ See linked contracts and guides in docs
*/

export interface LMCapabilities {
  backend: 'webgpu' | 'wasm' | 'cpu' | 'unknown';
  maxContextTokens?: number;
  features?: {
    webgpu?: boolean;
    wasmSimd?: boolean;
    wasmThreads?: boolean;
  };
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
  getStats?(): { runs: number; staleDrops: number };
}
