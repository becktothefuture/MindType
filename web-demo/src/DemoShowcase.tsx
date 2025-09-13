/*╔══════════════════════════════════════════════════════╗
  ║  ░  D E M O   S H O W C A S E  ░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║   Organized card-based showcase for all demos.      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Card-based demo showcase with descriptions and screenshots
  • WHY  ▸ Better organization and visual presentation of demos
  • HOW  ▸ Responsive grid layout with hover effects and navigation
*/

import './demo-showcase.css';

export interface DemoCard {
  id: string;
  title: string;
  description: string;
  url: string;
  category: 'main' | 'visual' | 'animation' | 'lab';
  features: string[];
  status: 'stable' | 'beta' | 'experimental';
  screenshot?: string;
  technologies: string[];
}

export const DEMO_CARDS: DemoCard[] = [
  {
    id: 'correction-flux',
    title: 'Correction Flux',
    description: 'Animated dot‑matrix correction entity with independent timing and rich controls, including 2D pads and a manual progress slider.',
    url: '/demo/correction-flux/',
    category: 'animation',
    features: [
      'Dot‑matrix correction entity',
      'Independent animation timing',
      '2D matrix sliders',
      'Manual progress control',
      'Reduced‑motion support'
    ],
    status: 'experimental',
    technologies: ['HTML', 'CSS', 'Vanilla JS']
  },
  {
    id: 'typing-lm',
    title: '01. Typing Demo',
    description: 'The flagship interactive demo showcasing real-time text correction with AI language models. Experience the future of typing with prefilled fuzzy text examples, one-click corrections, and elegant braille animation feedback.',
    url: '/#/',
    category: 'main',
    features: [
      'Real-time LM corrections',
      'Braille animation feedback',
      'Prefilled fuzzy text presets',
      'One-click correction CTA',
      'Dual-context processing',
      'Full accessibility support',
      'Local-only processing'
    ],
    status: 'stable',
    technologies: ['React', 'TypeScript', 'ONNX Runtime Web', 'WebGPU']
  },
  {
    id: 'lm-lab',
    title: '02. LM Lab (technical)',
    description: 'Advanced language model testing laboratory with direct model interaction, prompt engineering tools, and performance diagnostics.',
    url: '/#/lab',
    category: 'lab',
    features: [
      'Direct LM interaction',
      'Prompt engineering',
      'Performance metrics',
      'Model diagnostics',
      'Context window testing',
      'Token analysis'
    ],
    status: 'beta',
    technologies: ['React', 'TypeScript', 'Transformers.js', 'Web Workers']
  },
  {
    id: 'band-swap',
    title: '03. Band-Swap (visual)',
    description: 'Visual demonstration of the active region concept with animated noise clusters and band swapping mechanics. Shows how text corrections flow through the processing pipeline.',
    url: '/demo/band-swap/',
    category: 'visual',
    features: [
      'Active region visualization',
      'Noise cluster animation',
      'Band swap mechanics',
      'Processing pipeline demo',
      'Real-time parameter controls'
    ],
    status: 'stable',
    technologies: ['Vanilla JS', 'Canvas API', 'CSS Animations']
  },
  {
    id: 'braille-animation',
    title: '04. Braille Animation v1 (visual)',
    description: 'Showcase of Unicode braille character animations and patterns. Demonstrates the visual feedback system used in text correction indicators.',
    url: '/demo/mt-braille-animation-v1/',
    category: 'animation',
    features: [
      'Unicode braille patterns',
      'Animation presets',
      'Visual parameter controls',
      'Reduced motion support',
      'Accessibility compliance'
    ],
    status: 'experimental',
    technologies: ['Vanilla JS', 'Canvas API', 'Unicode Braille']
  },
  {
    id: 'scroll-animation',
    title: '05. Scroll Animation v1 (visual)',
    description: 'GSAP-powered scroll-triggered text animations with smooth scrolling and reveal effects. Demonstrates advanced typography and motion design principles.',
    url: '/demo/mt-scroll-anim-v1/',
    category: 'animation',
    features: [
      'GSAP scroll triggers',
      'Smooth scroll (Lenis)',
      'Text reveal animations',
      'Airport-style typography',
      'Parameter panel controls'
    ],
    status: 'experimental',
    technologies: ['GSAP', 'ScrollTrigger', 'Lenis', 'Vanilla JS']
  }
];

// kept for future styling if needed
// const categoryColors = { main: '#7ce0b8', lab: '#4db8ff', visual: '#ff6b9d', animation: '#ffa726' };
// const statusColors = { stable: '#4caf50', beta: '#ff9800', experimental: '#9c27b0' };

export function DemoShowcase() {
  return (
    <div className="demo-showcase">
      <header className="showcase-header">
        <h1>Mind⠶Type — Demo Showcase</h1>
        <p>Open a demo below.</p>

        {/* Main (technical) */}
        <div className="quick-access">
          <h3>🚀 Main</h3>
          <div className="quick-links">
            <a href="/#/" className="quick-link main">
              <span className="quick-icon">🎯</span>
              <div>
                <strong>01. Typing Demo</strong>
                <small>Real-time corrections</small>
              </div>
            </a>
            <a href="/#/lab" className="quick-link lab">
              <span className="quick-icon">🔬</span>
              <div>
                <strong>02. LM Lab (technical)</strong>
                <small>Model/test instrumentation</small>
              </div>
            </a>
          </div>
        </div>

        {/* Visual / Animation */}
        <div className="quick-access">
          <h3>🎨 Visual / ✨ Animation</h3>
          <div className="quick-links">
            <a href="/demo/band-swap/" className="quick-link">
              <span className="quick-icon">🎨</span>
              <div>
                <strong>03. Band-Swap (visual)</strong>
                <small>Active region concept</small>
              </div>
            </a>
            <a href="/demo/mt-braille-animation-v1/" className="quick-link">
              <span className="quick-icon">✨</span>
              <div>
                <strong>04. Braille Animation v1</strong>
                <small>Unicode braille visuals</small>
              </div>
            </a>
            <a href="/demo/mt-scroll-anim-v1/" className="quick-link">
              <span className="quick-icon">✨</span>
              <div>
                <strong>05. Scroll Animation v1</strong>
                <small>GSAP scroll reveal</small>
              </div>
            </a>
          </div>
        </div>
      </header>
      
    </div>
  );
}

export default DemoShowcase;
