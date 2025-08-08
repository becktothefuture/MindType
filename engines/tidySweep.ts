


/*  ║▓▒░  T I D Y S W E E P   E N G I N E  ░▒▓║
╔════════════════════════════════════════════════════════════════╗
║ █ Forward cleanup (<80 chars) with caret-safe diffs █          ║
╚════════════════════════════════════════════════════════════════╝
WHAT ▸ Real-time polish behind the caret
WHY  ▸ Converts noisy input to clarity fast
HOW  ▸ Extract window → rules/LM → minimal diff */

export interface SweepInput { text: string; caret: number; }
export interface SweepResult { diff: {start: number; end: number; text: string}|null; }

export function tidySweep(input: SweepInput): SweepResult {
  /* ⟢ TODO: rule stubs; never cross the caret */
  return { diff: null };
}