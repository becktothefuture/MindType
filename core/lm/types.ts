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
  • WHAT ▸ LMAdapter streaming contract; JSONL LM stream protocol (context → tone)
  • WHY  ▸ CONTRACT-LM-ADAPTER, CONTRACT-LM-STREAM
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

// ── LM Lab JSONL stream event types (non‑breaking, for lab/tests) ──────────
export type LMStreamEventType =
  | 'meta'
  | 'rules'
  | 'stage'
  | 'diff'
  | 'commit'
  | 'log'
  | 'done';

export interface LMStreamEventBase {
  type: LMStreamEventType;
}

export interface LMStreamMetaEvent extends LMStreamEventBase {
  type: 'meta';
  session?: string;
  model?: string;
  version?: string;
}

export interface LMStreamRulesEvent extends LMStreamEventBase {
  type: 'rules';
  band: { start: number; end: number };
  confidence?: { tau_input?: number; tau_commit?: number; tau_tone?: number };
  toneTarget?: 'None' | 'Casual' | 'Professional';
}

export interface LMStreamStageEvent extends LMStreamEventBase {
  type: 'stage';
  id: 'context' | 'tone';
  state: 'start' | 'end';
  tone?: 'None' | 'Casual' | 'Professional';
}

export interface LMStreamDiffEvent extends LMStreamEventBase {
  type: 'diff';
  stage: 'context' | 'tone';
  band: { start: number; end: number };
  span: { start: number; end: number };
  text: string;
  confidence?: number;
}

export interface LMStreamCommitEvent extends LMStreamEventBase {
  type: 'commit';
  stage: 'context' | 'tone';
  band: { start: number; end: number };
  text: string;
  tone?: 'None' | 'Casual' | 'Professional';
  confidence?: number;
}

export interface LMStreamLogEvent extends LMStreamEventBase {
  type: 'log';
  level?: 'debug' | 'info' | 'warn' | 'error';
  message: string;
}

export interface LMStreamDoneEvent extends LMStreamEventBase {
  type: 'done';
}

export type LMStreamEvent =
  | LMStreamMetaEvent
  | LMStreamRulesEvent
  | LMStreamStageEvent
  | LMStreamDiffEvent
  | LMStreamCommitEvent
  | LMStreamLogEvent
  | LMStreamDoneEvent;
