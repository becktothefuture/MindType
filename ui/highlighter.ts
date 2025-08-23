/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  H I G H L I G H T E R  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Renders active region + fix highlights in host editor.     ║
  ║   Visual feedback for streamed diffusion behind CARET.       ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Draws active region + transient highlights for applied fixes
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
    const event = new g.CustomEvent('mindtype:highlight', {
      detail: { start: _range.start, end: _range.end, text: _range.text },
    });
    g.dispatchEvent(event);
  }
}

// Active region showing currently validated text behind caret
export function emitActiveRegion(_range: { start: number; end: number }) {
  const g = globalThis as unknown as MinimalGlobal;
  if (g.dispatchEvent && g.CustomEvent) {
    const event = new g.CustomEvent('mindtype:activeRegion', {
      detail: { start: _range.start, end: _range.end },
    });
    g.dispatchEvent(event);
  }
}
