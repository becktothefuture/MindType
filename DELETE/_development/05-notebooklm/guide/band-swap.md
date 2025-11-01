<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  B A N D  S W A P   D E M O  ░░░░░░░░░░░░░░░░░░░  ║
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
    • WHAT ▸ Band-swap noise cluster sweeping text
    • WHY  ▸ Visualize a controlled distortion band
    • HOW  ▸ Canvas overlay; reduced-motion static
-->

<!-- SPEC:CONTRACT
id: CONTRACT-BAND-SWAP
title: Band-swap animation tokens
types:
  - name: AnimTokens
    ts: |
      export interface AnimTokens {
        bandSpeed: number;
        bandSpread: number;
        bandMix: number; // 0..100
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
  - web-demo/public/demo/band-swap/main.js
invariants:
  - Preserve layout: no per-char DOM mutations; overlay only
  - Reduced-motion: static band highlight, no rAF
-->

### In simple terms

- The band is a moving window that temporarily replaces letters with braille-style symbols, creating a sweeping noise cluster.
- You can control speed, spread (width), and mix (how many letters vs symbols).
- Behind the band, text returns to normal; ahead, it stays unchanged.
