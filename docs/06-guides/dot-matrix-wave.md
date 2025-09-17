<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  D O T - M A T R I X   W A V E   D E M O  ░░░░░░  ║
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
    • WHAT ▸ Dot-matrix wave animation for corrections
    • WHY  ▸ Visualize word-by-word corrections elegantly
    • HOW  ▸ Canvas overlay; reduced-motion static
-->

<!-- SPEC:CONTRACT
id: CONTRACT-DOT-MATRIX-WAVE
title: Dot-matrix wave animation tokens
types:
  - name: AnimTokens
    ts: |
      export interface AnimTokens {
        waveSpeed: number;
        waveSpread: number;
        waveMix: number; // 0..100
        symbolSet: string[];
        autoplay: boolean;
        playhead: number; // 0..100
      }
  - name: DEFAULT_SYMBOLS
    ts: |
      export const DEFAULT_SYMBOLS = [
        '\u2800','\u2802','\u2804','\u2806','\u2810','\u2812','\u2814','\u2816',
        '\u2820','\u2822','\u2824','\u2826','\u2830','\u2832','\u2834','\u2836',
      ] as const;
modules:
  - contracts/animTokens.ts
  - demo/dot-matrix-wave/main.js
invariants:
  - Preserve layout: no per-char DOM mutations; overlay only
  - Reduced-motion: static correction highlight, no rAF
-->

### In simple terms

- The wave is a moving animation that temporarily replaces letters with braille-style symbols, creating a visual feedback for corrections.
- You can control speed, spread (width), and mix (how many letters vs symbols).
- Behind the wave, text shows the corrected version; ahead, it stays unchanged.
- This creates an elegant word-by-word replacement animation as specified in the PRD.

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:45:45Z -->
