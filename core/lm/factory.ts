/*╔══════════════════════════════════════════════════════════╗
  ║  ░  FACTORY  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
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

import type { LMAdapter } from './types';
import { createTransformersAdapter, type TokenStreamer } from './transformersClient';
import { createQwenTokenStreamer, type QwenRunnerOptions } from './transformersRunner';
import { getDefaultLMConfig } from './config';

export type DefaultLMOptions = QwenRunnerOptions;

export function createDefaultLMAdapter(
  options?: DefaultLMOptions,
  runner?: TokenStreamer,
): LMAdapter {
  // Merge platform defaults with provided options
  const config = {
    ...getDefaultLMConfig(),
    ...options,
  };

  const tokenStreamer = runner ?? createQwenTokenStreamer(config);
  return createTransformersAdapter(tokenStreamer);
}
