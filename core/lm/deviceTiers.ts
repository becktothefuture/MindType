/*╔══════════════════════════════════════════════════════╗
  ║  ░  A U T O  D E V I C E  T I E R S  ░░░░░░░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Auto-generated from docs/spec YAML
  • WHY  ▸ Do not edit by hand; edit YAML instead
  • HOW  ▸ Generated via scripts/doc2code.cjs
*/

export interface DeviceTierPolicy {
  maxTokens: number;
  debounceMs: number;
  cooldownMs: number;
}
export interface DeviceTiers {
  webgpu: DeviceTierPolicy;
  wasm: DeviceTierPolicy;
  cpu: DeviceTierPolicy;
}
export const DEVICE_TIERS: DeviceTiers = {
  webgpu: {
    maxTokens: 48,
    debounceMs: 120,
    cooldownMs: 150,
  },
  wasm: {
    maxTokens: 24,
    debounceMs: 180,
    cooldownMs: 250,
  },
  cpu: {
    maxTokens: 16,
    debounceMs: 220,
    cooldownMs: 300,
  },
} as const;
