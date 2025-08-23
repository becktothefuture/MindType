/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T A P E S T R Y   ( V A L I D A T E D   S P A N S )  ░░  ║
  ║                                                              ║
  ║   Tracks validated/unvalidated spans and applied merges.     ║
  ║   Supports merge/split/query near the caret.                 ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Data structure for FT-240 / FT-242 foundations
  • WHY  ▸ Enable rollbacks and confidence-aware decisions
  • HOW  ▸ Flat array of spans with helpers to merge/split/query
*/

export interface TapestrySpan {
  start: number;
  end: number;
  original: string;
  corrected: string;
  confidence: number;
  appliedAt: number;
}

export class Tapestry {
  private spans: TapestrySpan[] = [];

  constructor(initial?: TapestrySpan[]) {
    if (initial) this.spans = initial.slice();
  }

  add(span: TapestrySpan): void {
    this.spans.push(span);
    this.spans.sort((a, b) => a.start - b.start);
  }

  queryNear(index: number, window: number): TapestrySpan[] {
    const lo = Math.max(0, index - window);
    const hi = index + window;
    return this.spans.filter((s) => s.end >= lo && s.start <= hi);
  }

  /** Merge adjacent spans when corrected text touches */
  coalesce(): void {
    const out: TapestrySpan[] = [];
    for (const s of this.spans.sort((a, b) => a.start - b.start)) {
      const last = out[out.length - 1];
      if (last && last.end === s.start && last.corrected === s.original) {
        last.end = s.end;
        last.corrected = s.corrected;
        last.appliedAt = Math.max(last.appliedAt, s.appliedAt);
        last.confidence = Math.min(last.confidence, s.confidence);
      } else {
        out.push({ ...s });
      }
    }
    this.spans = out;
  }

  all(): TapestrySpan[] {
    return this.spans.slice();
  }
}
