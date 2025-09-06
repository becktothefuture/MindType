/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  C A R E T   M O N I T O R   B R A N C H E S  ░░░░░░░░░░  ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Cover branches: no active region; same-caret no-enter
  • WHY  ▸ Raise branch coverage in caret monitor
*/
import { describe, it, expect } from 'vitest';
import { createCaretMonitor } from '../../core/caretMonitor';

describe('caretMonitor branches', () => {
  it('does not emit caret_entered_active_region when no active region', () => {
    const cm = createCaretMonitor({ pauseMs: 350 });
    const types: string[] = [];
    cm.on((e) => types.push(e.type));
    cm.update('abc', 1, 0);
    expect(types).toContain('typing');
    expect(types).not.toContain('caret_entered_active_region');
  });

  it('does not emit enter event when caret unchanged within region', () => {
    const cm = createCaretMonitor({ pauseMs: 350 });
    const types: string[] = [];
    cm.on((e) => types.push(e.type));
    cm.setActiveRegion({ start: 0, end: 5 });
    cm.update('hello', 2, 0);
    types.length = 0;
    cm.update('hello', 2, 1);
    expect(types).not.toContain('caret_entered_active_region');
  });
});
