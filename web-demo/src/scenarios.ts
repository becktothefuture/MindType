export interface DemoScenarioStep {
  text: string;
  caretAfter?: number;
}

export interface DemoScenario {
  id: string;
  name: string;
  steps: DemoScenarioStep[];
}

export const SCENARIOS: DemoScenario[] = [
  {
    id: 'typos-basic',
    name: 'Basic typos & spacing',
    steps: [
      { text: 'Mind::Type is nto a tooll . It   fixs teh txt as you type.' },
    ],
  },
  {
    id: 'punctuation-cap',
    name: 'Punctuation & capitalization',
    steps: [
      { text: 'this is a test—it checks spacing , punctuation and caps.' },
    ],
  },
  {
    id: 'grammar-lite',
    name: 'Light grammar (LM-worthy)',
    steps: [
      { text: 'The cat sit on the mat and walk to the door.' },
    ],
  },
];


