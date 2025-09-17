/*╔══════════════════════════════════════════════════════════╗
  ║  ░  ANIMTOKENS  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ Dot-matrix wave animation tokens
  • WHY  ▸ CONTRACT-DOT-MATRIX-WAVE
  • HOW  ▸ See linked contracts and guides in docs
*/

export interface AnimTokens {
  bandSpeed: number;
  bandSpread: number;
  bandMix: number; // 0..100
  symbolSet: readonly string[];
  autoplay: boolean;
  playhead: number; // 0..100
}

export const DEFAULT_SYMBOLS = [
  '\u2800',
  '\u2802',
  '\u2804',
  '\u2806',
  '\u2810',
  '\u2812',
  '\u2814',
  '\u2816',
  '\u2820',
  '\u2822',
  '\u2824',
  '\u2826',
  '\u2830',
  '\u2832',
  '\u2834',
  '\u2836',
] as const;

export const DEFAULT_TOKENS: AnimTokens = {
  bandSpeed: 0.5,
  bandSpread: 5,
  bandMix: 50,
  symbolSet: DEFAULT_SYMBOLS,
  autoplay: true,
  playhead: 0,
};
