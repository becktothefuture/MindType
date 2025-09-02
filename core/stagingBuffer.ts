/*╔══════════════════════════════════════════════════════════╗
  ║  ░  STAGINGBUFFER  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ Confidence gating across pipeline stages
  • WHY  ▸ REQ-CONFIDENCE-GATE
  • HOW  ▸ See linked contracts and guides in docs
*/

import type { ConfidenceScore } from './confidenceGate';

export type ProposalState = 'hold' | 'commit' | 'discard' | 'rollback';

export interface Proposal {
  id: string;
  start: number;
  end: number;
  text: string;
  createdAt: number;
  state: ProposalState;
  score?: ConfidenceScore;
}

export interface StagingBufferOptions {
  maxProposals?: number;
  ttlMs?: number; // time-to-live for stale proposals
}

export class StagingBuffer {
  private items: Proposal[] = [];
  private opts: Required<StagingBufferOptions>;
  constructor(opts?: StagingBufferOptions) {
    this.opts = {
      maxProposals: Math.max(1, Math.min(256, opts?.maxProposals ?? 64)),
      ttlMs: Math.max(1, Math.min(600000, opts?.ttlMs ?? 3000)),
    };
  }

  list(): readonly Proposal[] {
    return this.items;
  }

  add(
    p: Omit<Proposal, 'createdAt' | 'state'> & Partial<Pick<Proposal, 'state'>>,
  ): Proposal {
    const now = Date.now();
    // Evict if too many
    if (this.items.length >= this.opts.maxProposals) this.items.shift();
    const next: Proposal = {
      id: p.id,
      start: p.start,
      end: p.end,
      text: p.text,
      createdAt: now,
      state: p.state ?? 'hold',
      score: undefined,
    };
    this.items.push(next);
    return next;
  }

  updateScore(
    id: string,
    score: ConfidenceScore,
    decision: ProposalState,
  ): Proposal | null {
    const item = this.items.find((x) => x.id === id) || null;
    if (!item) return null;
    item.score = score;
    item.state = decision;
    return item;
  }

  // Caret moved into active region → rollback any active proposals overlapping caret
  onCaretMove(caret: number): number {
    let rolled = 0;
    for (const p of this.items) {
      if (p.state === 'commit' || p.state === 'hold') {
        if (p.start <= caret && caret <= p.end) {
          p.state = 'rollback';
          rolled += 1;
        }
      }
    }
    return rolled;
  }

  // Cleanup old/discarded proposals
  cleanup(now = Date.now()): void {
    this.items = this.items.filter((p) => {
      if (p.state === 'discard') return false;
      if (now - p.createdAt > this.opts.ttlMs) return false;
      return true;
    });
  }

  // Pop next item ready to commit
  nextCommit(): Proposal | null {
    const i = this.items.findIndex((p) => p.state === 'commit');
    if (i === -1) return null;
    return this.items.splice(i, 1)[0];
  }
}
