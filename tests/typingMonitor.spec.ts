/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T Y P I N G   M O N I T O R   T E S T S  ░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Validates listener registration and unsubscribe behavior.  ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Ensure events fan out to listeners and can stop
  • WHY  ▸ Prevent memory leaks and stale listeners in hosts
  • HOW  ▸ Subscribe two listeners; unsubscribe one; emit events
*/

import { describe, it, expect, vi } from 'vitest';
import { createTypingMonitor } from '../core/typingMonitor';

describe('TypingMonitor', () => {
  it('invokes multiple listeners and supports unsubscribe', () => {
    const monitor = createTypingMonitor();
    const l1 = vi.fn();
    const l2 = vi.fn();

    const off1 = monitor.on(l1);
    monitor.on(l2);

    monitor.emit({ text: 'a', caret: 1, atMs: 1 });
    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(1);

    // Unsubscribe first listener
    off1();
    monitor.emit({ text: 'b', caret: 2, atMs: 2 });
    expect(l1).toHaveBeenCalledTimes(1);
    expect(l2).toHaveBeenCalledTimes(2);
  });
});
