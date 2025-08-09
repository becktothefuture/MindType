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
  const g: any = globalThis as any;
  if (g && typeof g.dispatchEvent === 'function' && typeof g.CustomEvent === 'function') {
    const event = new g.CustomEvent('mindtyper:highlight', {
      detail: { start: _range.start, end: _range.end },
    });
    g.dispatchEvent(event);
  }
}

// Subtle shimmer band showing currently validated text behind caret
export function renderValidationBand(_range: { start: number; end: number }) {
  const g: any = globalThis as any;
  if (g && typeof g.dispatchEvent === 'function' && typeof g.CustomEvent === 'function') {
    const event = new g.CustomEvent('mindtyper:validationBand', {
      detail: { start: _range.start, end: _range.end },
    });
    g.dispatchEvent(event);
  }
}
