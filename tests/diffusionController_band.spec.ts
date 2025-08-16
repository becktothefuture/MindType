/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  D I F F U S I O N   B A N D   E D G E   T E S T S   ░░░  ║
  ║                                                              ║
  ║   Covers no-word segments path for bandRange (spaces only).  ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Assert bandRange falls back to [frontier, caret]
  • WHY  ▸ Increase branch coverage on empty word segmentation
  • HOW  ▸ Mock highlighter; capture last rendered band
*/

import { describe, it, expect, vi } from 'vitest';

const bands: Array<{ start: number; end: number }> = [];
vi.mock('../ui/highlighter', () => ({
  renderValidationBand: vi.fn((range: { start: number; end: number }) => {
    bands.push(range);
  }),
  renderHighlight: vi.fn(),
}));

import { createDiffusionController } from '../core/diffusionController';

describe('DiffusionController bandRange edge', () => {
  it('renders [frontier, caret] when no word-like segments exist', () => {
    const c = createDiffusionController();
    c.update('    ', 3); // spaces only
    const last = bands[bands.length - 1];
    expect(last).toEqual({ start: 0, end: 3 });
  });
});


