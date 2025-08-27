/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  L M   A D A P T E R   F A C T O R Y  ░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Creates a default LMAdapter using a pluggable TokenRunner. ║
  ║   Defaults to Transformers.js runner; testable via override.  ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Factory for LMAdapter with capability detection
  • WHY  ▸ Decouple core from heavy deps; enable mocking
  • HOW  ▸ Wrap TokenStreamer with createTransformersAdapter
*/

import type { LMAdapter } from './types';
import { createTransformersAdapter, type TokenStreamer } from './transformersClient';
import { createQwenTokenStreamer, type QwenRunnerOptions } from './transformersRunner';

export type DefaultLMOptions = QwenRunnerOptions;

export function createDefaultLMAdapter(
  options?: DefaultLMOptions,
  runner?: TokenStreamer,
): LMAdapter {
  const tokenStreamer = runner ?? createQwenTokenStreamer(options);
  return createTransformersAdapter(tokenStreamer);
}
