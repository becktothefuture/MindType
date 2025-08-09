/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  H I G H L I G H T E R  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Renders validation band + fix highlights in host editor.    ║
  ║   Visual feedback for streamed diffusion behind CARET.       ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Draws validation band + transient highlights for applied fixes
  • WHY  ▸ Shows streaming progress; aids awareness; reduced motion support
  • HOW  ▸ Consumes ranges from diffusion; updates DOM/accessibility
*/

export function renderHighlight(_range: { start: number; end: number }) {
  /* ⟢ TODO: apply CSS class / accessibility cues */
}

// Subtle shimmer band showing currently validated text behind caret
export function renderValidationBand(_range: { start: number; end: number }) {
  /* ⟢ TODO: translucent band/shimmer honoring prefers-reduced-motion */
}
