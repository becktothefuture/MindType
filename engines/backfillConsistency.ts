/*  ║▓▒░  B A C K F I L L   C O N S I S T E N C Y  ░▒▓║
╔════════════════════════════════════════════════════════════════╗
║ █ Reverse pass aligns earlier text using new context █         ║
╚════════════════════════════════════════════════════════════════╝
WHAT ▸ Fix name/term inconsistencies
WHY  ▸ Keeps document coherent as context grows
HOW  ▸ Idle scans of the stable zone; caret-safe apply */

export interface BackfillInput { text: string; caret: number; }
export interface BackfillResult { diffs: Array<{start:number; end:number; text:string}>; }

export function backfillConsistency(_input: BackfillInput): BackfillResult {
  /* ⟢ TODO: pattern index & proposal generation */
  return { diffs: [] };
}