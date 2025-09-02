/*╔══════════════════════════════════════════════════════╗
  ║  ░  L M   C O N F I G   ( S H A R E D )  ░░░░░░░░░░░░░  ║
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
  • WHAT ▸ Shared LM configuration for web and macOS
  • WHY  ▸ Ensure consistent behavior across platforms
  • HOW  ▸ Common model settings and adapter options
*/

import type { QwenRunnerOptions } from './transformersRunner';

export interface PlatformLMConfig {
  web: QwenRunnerOptions;
  macos: QwenRunnerOptions;
  shared: QwenRunnerOptions;
}

/**
 * Shared LM configuration ensuring consistent behavior across platforms
 */
export const LM_CONFIG: PlatformLMConfig = {
  shared: {
    modelId: 'onnx-community/Qwen2.5-0.5B-Instruct',
    maxNewTokens: 24, // Conservative default, adjusted by device tier
    localOnly: false, // Default to remote for easier setup
  },
  
  web: {
    modelId: 'onnx-community/Qwen2.5-0.5B-Instruct',
    maxNewTokens: 24,
    localOnly: false, // Remote models for web demo
    // Web-specific paths (served by Vite/CDN)
    localModelPath: '/models/',
    wasmPaths: '/wasm/',
  },
  
  macos: {
    modelId: 'onnx-community/Qwen2.5-0.5B-Instruct', 
    maxNewTokens: 24,
    localOnly: true, // Prefer local models for native app
    // macOS-specific paths (bundled with app)
    localModelPath: './models/',
    wasmPaths: './wasm/',
  },
};

/**
 * Get platform-appropriate LM configuration
 */
export function getLMConfigForPlatform(platform: 'web' | 'macos' = 'web'): QwenRunnerOptions {
  return {
    ...LM_CONFIG.shared,
    ...LM_CONFIG[platform],
  };
}

/**
 * Environment detection for automatic platform selection
 */
export function detectPlatform(): 'web' | 'macos' {
  if (typeof window !== 'undefined') {
    // Browser environment
    return 'web';
  } else {
    // Assume native environment (Node.js/Swift)
    return 'macos';
  }
}

/**
 * Get appropriate LM configuration for current environment
 */
export function getDefaultLMConfig(): QwenRunnerOptions {
  const platform = detectPlatform();
  return getLMConfigForPlatform(platform);
}
