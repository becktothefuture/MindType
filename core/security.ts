/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  S E C U R I T Y   C O N T E X T  ░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Host-provided gating for secure fields and IME states.     ║
  ║   Core uses this to disable corrections when required.       ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Contract for security/IME checks consumed by core
  • WHY  ▸ Disable corrections in secure contexts (password, IME)
  • HOW  ▸ Host supplies implementation; default returns false
*/

export interface SecurityContext {
  isSecure(): boolean;
  isIMEComposing?(): boolean;
}

export function createDefaultSecurityContext(): SecurityContext {
  return {
    isSecure: () => false,
    isIMEComposing: () => false,
  };
}
