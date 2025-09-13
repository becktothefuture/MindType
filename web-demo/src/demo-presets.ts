/*╔══════════════════════════════════════════════════════╗
  ║  ░  D E M O   P R E S E T S  ░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║   Curated fuzzy text examples for instant demos.    ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Prefilled fuzzy text examples for demo "wow" factor
  • WHY  ▸ Instant demonstration of correction capabilities
  • HOW  ▸ Curated examples with known correction patterns
*/

export interface DemoPreset {
  name: string;
  description: string;
  text: string;
  expectedCorrections: string[];
}

export const DEMO_PRESETS: DemoPreset[] = [
  {
    name: "User's Example",
    description: "The original fuzzy text example",
    text: "heya ha ve you hgeard there was a n icre cream trk outside that';s kinda cool right",
    expectedCorrections: [
      "heya → hey",
      "ha ve → have", 
      "hgeard → heard",
      "a n icre → an ice",
      "trk → truck",
      "that';s → that's"
    ]
  },
  {
    name: "Common Typos",
    description: "Typical typing errors and autocorrect failures",
    text: "The teh quick brown fox jumps ovr the lazy dog. Its a beatiful day outsdie.",
    expectedCorrections: [
      "teh → the",
      "ovr → over", 
      "Its → It's",
      "beatiful → beautiful",
      "outsdie → outside"
    ]
  },
  {
    name: "Grammar & Punctuation",
    description: "Grammar issues and missing punctuation",
    text: "i think its going to rain today so we should bring an umbrella dont you think",
    expectedCorrections: [
      "i → I",
      "its → it's",
      "Missing periods and commas",
      "dont → don't"
    ]
  },
  {
    name: "Spacing Issues",
    description: "Missing and extra spaces",
    text: "Thequick brownfox jumpedover thelazy dog.It wasreally fast andimpressive tosee.",
    expectedCorrections: [
      "Thequick → The quick",
      "brownfox → brown fox",
      "jumpedover → jumped over",
      "thelazy → the lazy",
      "dog.It → dog. It",
      "wasreally → was really",
      "andimpressive → and impressive",
      "tosee → to see"
    ]
  },
  {
    name: "Transpositions",
    description: "Character order errors and swapped letters",
    text: "The recieve was form the manger who workde in the ofice last week.",
    expectedCorrections: [
      "recieve → receive",
      "form → from",
      "manger → manager", 
      "workde → worked",
      "ofice → office"
    ]
  }
];

export const DEFAULT_PRESET = DEMO_PRESETS[0]; // User's example

export function getRandomPreset(): DemoPreset {
  return DEMO_PRESETS[Math.floor(Math.random() * DEMO_PRESETS.length)];
}

export function getPresetByName(name: string): DemoPreset | undefined {
  return DEMO_PRESETS.find(preset => preset.name === name);
}
