/*╔══════════════════════════════════════════════════════════╗
  ║  ░  LANGUAGEDETECTION  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ English-only gating for full pipeline (Noise for others)
  • WHY  ▸ REQ-LANGUAGE-GATING
  • HOW  ▸ See linked contracts and guides in docs
*/

export type LanguageCode = 'en' | 'other';

const EN_STOPWORDS = new Set([
  'the',
  'and',
  'to',
  'of',
  'in',
  'is',
  'you',
  'that',
  'it',
  'for',
  'on',
  'with',
]);

export function detectLanguage(text: string): LanguageCode {
  const sample = text.slice(0, 500).toLowerCase();
  const alpha = (sample.match(/[a-z]/g) || []).length;
  const nonLatin = (sample.match(/[^\x00-\x7f]/g) || []).length;
  const words = sample.match(/[a-z']+/g) || [];
  let enHits = 0;
  for (const w of words) if (EN_STOPWORDS.has(w)) enHits++;
  // Basic rules: mostly ASCII letters and some English stopwords → en
  if (alpha > 0 && nonLatin / (alpha + 1) < 0.05 && enHits >= 1) return 'en';
  // Relaxed rule: short ASCII text without stopwords still treated as English
  if (alpha >= 5 && nonLatin / (alpha + 1) < 0.05) return 'en';
  return 'other';
}
