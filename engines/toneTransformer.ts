/*╔══════════════════════════════════════════════════════════╗
  ║  ░  TONETRANSFORMER  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ Tone transformer with baseline detection and selectable tone
  • WHY  ▸ REQ-TONE-TRANSFORMER
  • HOW  ▸ See linked contracts and guides in docs
*/

export type ToneOption = 'None' | 'Casual' | 'Professional';

export interface ToneVector {
  formality: number; // 0..1 (higher = more formal)
  friendliness: number; // 0..1 (higher = more casual/friendly)
}

export interface ToneProposal {
  start: number;
  end: number;
  text: string;
}

export interface ToneInput {
  text: string;
  caret: number;
  target: ToneOption;
  scopeSentences: number; // 10 for CPU, up to 20 for WebGPU/WASM
}

export function detectBaseline(document: string): ToneVector {
  // Heuristics: punctuation density, contractions, slang tokens
  const len = document.length || 1;
  const commas = (document.match(/[,;]/g) || []).length / len;
  const contractions = (
    document.match(/\b(I'm|you're|we're|it's|can't|won't|don't)\b/gi) || []
  ).length;
  const slang = (document.match(/\b(gonna|wanna|cool|hey|yup|nah)\b/gi) || []).length;
  const formality = Math.max(
    0,
    Math.min(1, 0.6 + commas * 5 - contractions * 0.05 - slang * 0.05),
  );
  const friendliness = Math.max(0, Math.min(1, 0.4 + contractions * 0.05 + slang * 0.08));
  return { formality, friendliness };
}

export function planAdjustments(
  baseline: ToneVector,
  target: ToneOption,
  text: string,
  caret: number,
): ToneProposal[] {
  if (target === 'None') return [];
  // Operate on last sentences before the caret only (caret-safe)
  const upto = caret;
  const span = text.slice(0, upto);
  // Minimalistic strategies
  const proposals: ToneProposal[] = [];
  if (target === 'Professional' && baseline.formality < 0.7) {
    // Expand common contractions
    const rep: Array<[RegExp, string]> = [
      [/\bcan't\b/gi, 'cannot'],
      [/\bwon't\b/gi, 'will not'],
      [/\bdon't\b/gi, 'do not'],
      [/\bit's\b/gi, 'it is'],
      [/\bI'm\b/g, 'I am'],
      [/\byou're\b/gi, 'you are'],
      [/\bwe're\b/gi, 'we are'],
    ];
    let updated = span;
    for (const [re, to] of rep) updated = updated.replace(re, to);
    if (updated !== span) proposals.push({ start: 0, end: upto, text: updated });
  }
  if (target === 'Casual' && baseline.friendliness < 0.6) {
    // Introduce contractions lightly (only a couple of patterns)
    let updated = span;
    updated = updated.replace(/\bit is\b/gi, "it's");
    updated = updated.replace(/\bwe are\b/gi, "we're");
    updated = updated.replace(/\byou are\b/gi, "you're");
    if (updated !== span) proposals.push({ start: 0, end: upto, text: updated });
  }
  return proposals;
}
