/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  L M   B A R R E L   E X P O R T S  ░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Central export surface for LM types and factories.          ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Export adapter types, factory, and policies
  • WHY  ▸ Stable API for hosts/tests
  • HOW  ▸ Re-export from module files
*/

export type { LMAdapter, LMCapabilities, LMInitOptions, LMStreamParams } from './types';
export { createDefaultLMAdapter } from './factory';
export { createMockLMAdapter } from './mockAdapter';
export { createTransformersAdapter } from './transformersClient';
export { createQwenTokenStreamer } from './transformersRunner';
export { streamMerge } from './mergePolicy';
