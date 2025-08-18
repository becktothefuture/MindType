export interface DemoScenario {
  id: string;
  title: string;
  raw: string;
  corrected: string;
}

export const SCENARIOS: DemoScenario[] = [
  {
    id: 'typos-basic',
    title: 'Basic typos & spacing',
    raw: 'MindTyper is nto a tooll . It   fixs teh txt as you type.',
    corrected: 'MindTyper is not a tool. It fixes the text as you type.',
  },
  {
    id: 'punctuation-cap',
    title: 'Punctuation & capitalization',
    raw: 'this is a test—it checks spacing , punctuation and caps.',
    corrected: 'This is a test — it checks spacing, punctuation and caps.',
  },
  {
    id: 'grammar-lite',
    title: 'Light grammar (LM-worthy)',
    raw: 'The cat sit on the mat and walk to the door.',
    corrected: 'The cat sits on the mat and walks to the door.',
  },
];


