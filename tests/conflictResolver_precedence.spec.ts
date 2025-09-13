/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  C O N F L I C T   R E S O L V E R   P R E C E D E N C E  ░░  ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Cover custom precedence branch
  • WHY  ▸ Improve branch coverage in resolver
*/
import { describe, it, expect } from 'vitest';
import { resolveConflicts, type Proposal } from '../engines/conflictResolver';

describe('conflictResolver custom precedence', () => {
  it('respects custom precedence order', () => {
    const proposals: Proposal[] = [
      { start: 0, end: 4, text: 'tone', source: 'tone' },
      { start: 0, end: 4, text: 'ctx', source: 'context' },
      { start: 0, end: 4, text: 'noise', source: 'noise' },
    ];
    const precedence: Array<'noise' | 'context' | 'tone'> = ['tone', 'context', 'noise'];
    const r = resolveConflicts(proposals, precedence);
    expect(r).toEqual([{ start: 0, end: 4, text: 'tone' }]);
  });
});
