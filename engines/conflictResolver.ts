/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  C O N F L I C T   R E S O L V E R  ░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Deterministically resolves overlapping proposals.          ║
  ║   Enforces precedence: rules > context > tone.               ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Merge and filter overlapping edits deterministically
  • WHY  ▸ Prevent conflicting suggestions and thrash
  • HOW  ▸ Sort by precedence, prefer longer spans, drop overlaps
*/

export type ProposalSource = 'noise' | 'lm' | 'context' | 'tone';

export interface Proposal {
  start: number;
  end: number;
  text: string;
  source: ProposalSource;
}

export interface ResolvedProposal {
  start: number;
  end: number;
  text: string;
}

const DEFAULT_PRECEDENCE: ProposalSource[] = ['noise', 'lm', 'context', 'tone'];

function overlaps(
  a: { start: number; end: number },
  b: { start: number; end: number },
): boolean {
  // Half-open intervals [start, end) to avoid zero-width corner cases
  return a.start < b.end && b.start < a.end;
}

export function resolveConflicts(
  proposals: Proposal[],
  precedence: ProposalSource[] = DEFAULT_PRECEDENCE,
): ResolvedProposal[] {
  if (proposals.length === 0) return [];

  // Sort by: precedence asc → longer span first → start asc
  const order = new Map(precedence.map((p, i) => [p, i] as const));
  const sorted = [...proposals].sort((a, b) => {
    const pa = order.get(a.source) ?? precedence.length;
    const pb = order.get(b.source) ?? precedence.length;
    if (pa !== pb) return pa - pb;
    const la = a.end - a.start;
    const lb = b.end - b.start;
    if (la !== lb) return lb - la; // prefer longer span inside same source
    return a.start - b.start;
  });

  const accepted: ResolvedProposal[] = [];
  for (const p of sorted) {
    const span = { start: p.start, end: p.end };
    let conflict = false;
    for (const a of accepted) {
      if (overlaps(span, a)) {
        conflict = true;
        break;
      }
    }
    if (!conflict) {
      accepted.push({ start: p.start, end: p.end, text: p.text });
    }
  }
  // Keep application order deterministic: ascending by start
  accepted.sort((x, y) => x.start - y.start || x.end - y.end);
  return accepted;
}
