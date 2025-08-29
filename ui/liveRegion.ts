/*╔══════════════════════════════════════════════════════════╗
  ║  ░  LIVEREGION  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ Respect reduced-motion; single announcement; mechanical swap
  • WHY  ▸ REQ-A11Y-MOTION
  • HOW  ▸ See linked contracts and guides in docs
*/

export type Politeness = 'polite' | 'assertive';

export interface LiveRegion {
  announce(message: string): void;
  setPoliteness(politeness: Politeness): void;
  destroy(): void;
}

export interface LiveRegionOptions {
  id?: string;
  politeness?: Politeness; // default: polite
  atomic?: boolean; // default: true
  parent?: Document | HTMLElement; // default: document.body
}

function applyVisuallyHiddenStyles(el: HTMLElement): void {
  el.style.position = 'absolute';
  el.style.width = '1px';
  el.style.height = '1px';
  el.style.margin = '-1px';
  el.style.border = '0';
  el.style.padding = '0';
  el.style.overflow = 'hidden';
  el.style.clip = 'rect(0 0 0 0)';
  el.style.whiteSpace = 'nowrap';
}

function setAriaAttrs(el: HTMLElement, politeness: Politeness, atomic: boolean): void {
  el.setAttribute('aria-live', politeness);
  el.setAttribute('aria-atomic', atomic ? 'true' : 'false');
  // role mapping per common guidance
  el.setAttribute('role', politeness === 'assertive' ? 'alert' : 'status');
}

export function createLiveRegion(options?: LiveRegionOptions): LiveRegion {
  const parent = options?.parent ?? (globalThis.document as Document | undefined)?.body;
  if (!parent) {
    // Non-DOM environment: provide a no-op region
    return {
      announce: () => {},
      setPoliteness: () => {},
      destroy: () => {},
    };
  }

  const id = options?.id ?? 'mt-live-region';
  const politeness: Politeness = options?.politeness ?? 'polite';
  const atomic = options?.atomic ?? true;

  const region = (parent.ownerDocument || document).createElement('div');
  region.id = id;
  applyVisuallyHiddenStyles(region);
  setAriaAttrs(region, politeness, atomic);
  parent.appendChild(region);

  // Toggle to force SR re-announce of repeated strings
  let toggle = false;

  function announce(message: string): void {
    // Clear then set on next tick to ensure mutation is detected
    region.textContent = '';
    const text = toggle ? message + '\u200B' : message; // zero-width space to change node value
    toggle = !toggle;
    setTimeout(() => {
      region.textContent = text;
    }, 0);
  }

  function setPolitenessLevel(p: Politeness): void {
    setAriaAttrs(region, p, atomic);
  }

  function destroy(): void {
    if (region.parentNode) {
      region.parentNode.removeChild(region);
    }
  }

  return {
    announce,
    setPoliteness: setPolitenessLevel,
    destroy,
  };
}
