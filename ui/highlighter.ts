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

interface MinimalCustomEventCtor {
  new (type: string, eventInitDict?: { detail?: unknown }): Event;
}
interface MinimalGlobal {
  dispatchEvent?: (event: Event) => boolean;
  CustomEvent?: MinimalCustomEventCtor;
}

export function renderHighlight(_range: { start: number; end: number; text?: string }) {
  const g = globalThis as unknown as MinimalGlobal;
  if (g.dispatchEvent && g.CustomEvent) {
    const event = new g.CustomEvent('mindtyper:highlight', {
      detail: { start: _range.start, end: _range.end, text: _range.text },
    });
    g.dispatchEvent(event);
  }
}

// Subtle shimmer band showing currently validated text behind caret
export function renderValidationBand(_range: { start: number; end: number }) {
  const g = globalThis as unknown as MinimalGlobal;
  if (g.dispatchEvent && g.CustomEvent) {
    const event = new g.CustomEvent('mindtyper:validationBand', {
      detail: { start: _range.start, end: _range.end },
    });
    g.dispatchEvent(event);
  }
}
