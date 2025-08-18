/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  W E B   S E C U R I T Y   D E T E C T I O N  ░░░░░░░░░░  ║
  ║                                                              ║
  ║   Detects secure input contexts (password, OTP, card data)  ║
  ║   for the web host. Produces a SecurityContext compatible    ║
  ║   with the core pipeline to auto-disable corrections.        ║
  ║                                                              ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌                      ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ DOM helpers to create a SecurityContext from active el
  • WHY  ▸ Enforce REQ-SECURE-FIELDS automatically in web hosts
  • HOW  ▸ Inspect activeElement type/autocomplete/attributes
*/

import type { SecurityContext } from '../core/security';

/**
 * Returns true if the provided element should be considered a secure field
 * where corrections must be disabled (passwords, OTP codes, payment data).
 */
export function isSecureElement(el: Element | null | undefined): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  // Password fields
  if (el instanceof HTMLInputElement && el.type.toLowerCase() === 'password') {
    return true;
  }
  // OTP and payment data via autocomplete tokens
  if (el instanceof HTMLInputElement) {
    const ac = (el.autocomplete || '').toLowerCase();
    if (ac === 'one-time-code') return true;
    if (ac.startsWith('cc-')) return true; // cc-number, cc-csc, cc-exp, etc.
  }
  // Custom attribute hook for hosts to mark fields as secure
  if (el.hasAttribute('data-secure') && el.getAttribute('data-secure') !== 'false') {
    return true;
  }
  // ContentEditable regions marked secure
  if (
    el instanceof HTMLElement &&
    el.isContentEditable &&
    (el.getAttribute('data-secure') === 'true' ||
      el.getAttribute('aria-hidden') === 'true')
  ) {
    // Treat hidden/secure editable fields as secure to avoid accidental edits
    return true;
  }
  return false;
}

/**
 * Creates a SecurityContext backed by the document's activeElement.
 * The IME state is left to the host to manage via an optional flag.
 */
type HasActiveElement = { activeElement: Element | null };

export function createDomSecurityContext(options?: {
  root?: HasActiveElement;
  isIMEComposingFlag?: () => boolean;
}): SecurityContext {
  const root =
    options?.root ?? (globalThis as unknown as { document?: HasActiveElement }).document;
  const ime = options?.isIMEComposingFlag ?? (() => false);
  return {
    isSecure: () => {
      const active =
        root && 'activeElement' in (root as HasActiveElement)
          ? (root as HasActiveElement).activeElement
          : null;
      return isSecureElement(active ?? undefined);
    },
    isIMEComposing: () => ime(),
  };
}
