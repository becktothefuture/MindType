/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  T I D Y   S W E E P   E N G I N E  ░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   Forward cleanup (<80 chars) with caret-safe diffs.         ║
  ║   Works on the live TYPING ZONE just behind the caret.       ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Computes minimal DIFF proposals behind the caret
  • WHY  ▸ Keeps text clean in real time without crossing CARET
  • HOW  ▸ Receives keystream from TypingMonitor; returns one diff
*/

export interface SweepInput {
  text: string;
  caret: number;
}
export interface SweepResult {
  diff: { start: number; end: number; text: string } | null;
}

export function tidySweep(_input: SweepInput): SweepResult {
  /* ⟢ TODO: rule stubs; never cross the caret */
  return { diff: null };
}
