/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  U N D O   I S O L A T I O N   ( S Y S T E M )  ░░░░░░░░  ║
  ║                                                              ║
  ║   Buckets system-applied edits into short time windows       ║
  ║   (100–200ms) separate from user undo. Supports rollback.    ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Group engine diffs into isolated undo buckets
  • WHY  ▸ Keep system edits off the user's undo stack
  • HOW  ▸ Time-bucket groups; rollback APIs
*/

export interface SystemEdit {
  start: number;
  end: number;
  before: string; // original text slice
  after: string; // applied text slice
  appliedAt: number;
}

export interface UndoGroup {
  id: number;
  edits: SystemEdit[];
  startAt: number;
  endAt: number;
}

export class UndoIsolation {
  private groups: UndoGroup[] = [];
  private current: UndoGroup | null = null;
  private bucketMs: number;
  private nextId = 1;

  constructor(bucketMs = 150) {
    this.bucketMs = Math.max(50, Math.min(500, Math.floor(bucketMs)));
  }

  addEdit(edit: SystemEdit): void {
    const now = edit.appliedAt;
    if (!this.current || now - this.current.endAt > this.bucketMs) {
      // start a new group
      this.current = { id: this.nextId++, edits: [], startAt: now, endAt: now };
      this.groups.push(this.current);
    }
    this.current.edits.push(edit);
    this.current.endAt = now;
  }

  /** Returns the last bucket and removes it from the list */
  popLastGroup(): UndoGroup | null {
    const g = this.groups.pop() || null;
    this.current = this.groups[this.groups.length - 1] || null;
    return g;
  }

  getGroups(): readonly UndoGroup[] {
    return this.groups;
  }
}

