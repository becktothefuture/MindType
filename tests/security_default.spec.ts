/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  S E C U R I T Y   D E F A U L T   C O N T E X T  ░░░░░░░  ║
  ║                                                              ║
  ║   Covers the default SecurityContext implementation branches ║
  ║   to lift branch/function coverage.                          ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Validate default flags (not secure, not composing)
  • WHY  ▸ Increase coverage for core/security.ts
  • HOW  ▸ Create default context; assert flags
*/

import { describe, it, expect } from 'vitest';
import { createDefaultSecurityContext } from '../core/security';

describe('SecurityContext default', () => {
  it('returns false for secure and IME composing by default', () => {
    const ctx = createDefaultSecurityContext();
    expect(ctx.isSecure()).toBe(false);
    expect(ctx.isIMEComposing?.()).toBe(false);
  });
});
