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
    title: 'Typing LM Demo',
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
    title: 'LM Lab',
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
    title: 'Band-Swap Demo',
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
    title: 'Braille Animation v1',
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
    title: 'Scroll Animation v1',
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

const categoryColors = {
  main: '#7ce0b8',
  lab: '#4db8ff', 
  visual: '#ff6b9d',
  animation: '#ffa726'
};

const statusColors = {
  stable: '#4caf50',
  beta: '#ff9800',
  experimental: '#9c27b0'
};

export function DemoShowcase() {
  // Group demos by category for better organization
  const demosByCategory = DEMO_CARDS.reduce((acc, demo) => {
    if (!acc[demo.category]) acc[demo.category] = [];
    acc[demo.category].push(demo);
    return acc;
  }, {} as Record<string, DemoCard[]>);

  const categoryInfo = {
    main: { title: 'Main Demos', description: 'Core typing correction experiences', icon: '🚀' },
    lab: { title: 'Development Lab', description: 'Advanced testing and diagnostics', icon: '🔬' },
    visual: { title: 'Visual Demos', description: 'Concepts and processing visualization', icon: '🎨' },
    animation: { title: 'Animation Showcase', description: 'Typography and motion design', icon: '✨' }
  };

  return (
    <div className="demo-showcase">
      <header className="showcase-header">
        <h1>Mind⠶Type — Demo Showcase</h1>
        <p>Explore interactive demonstrations of real-time text correction, visual feedback systems, and advanced typography animations.</p>
        
        {/* Quick Access to Main Demos */}
        <div className="quick-access">
          <h3>🚀 Quick Start</h3>
          <div className="quick-links">
            <a href="/#/" className="quick-link main">
              <span className="quick-icon">🎯</span>
              <div>
                <strong>Try the Demo</strong>
                <small>Experience real-time corrections</small>
              </div>
            </a>
            <a href="/#/lab" className="quick-link lab">
              <span className="quick-icon">🔬</span>
              <div>
                <strong>LM Lab</strong>
                <small>Advanced model testing</small>
              </div>
            </a>
          </div>
        </div>

        <div className="category-overview">
          {Object.entries(categoryInfo).map(([key, info]) => (
            <div key={key} className="category-chip" style={{ borderColor: categoryColors[key as keyof typeof categoryColors] }}>
              <span className="category-icon">{info.icon}</span>
              <span className="category-name">{info.title}</span>
            </div>
          ))}
        </div>
      </header>

      <main className="showcase-content">
        {Object.entries(demosByCategory).map(([category, demos]) => {
          const info = categoryInfo[category as keyof typeof categoryInfo];
          return (
            <section key={category} className="category-section">
              <div className="category-header">
                <h2 style={{ color: categoryColors[category as keyof typeof categoryColors] }}>
                  <span className="category-icon">{info.icon}</span>
                  {info.title}
                </h2>
                <p className="category-description">{info.description}</p>
              </div>
              
              <div className="demos-grid">
                {demos.map((demo) => (
          <article 
            key={demo.id} 
            className={`demo-card ${demo.category}`}
            onClick={() => window.open(demo.url, demo.url.startsWith('http') ? '_blank' : '_self')}
            style={{ cursor: 'pointer' }}
          >
            <div className="card-header">
              <div className="card-title-row">
                <h2>{demo.title}</h2>
                <div className="card-badges">
                  <span 
                    className="category-badge"
                    style={{ backgroundColor: categoryColors[demo.category] }}
                  >
                    {demo.category}
                  </span>
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: statusColors[demo.status] }}
                  >
                    {demo.status}
                  </span>
                </div>
              </div>
            </div>

            <div className="card-screenshot">
              {demo.screenshot ? (
                <img 
                  src={demo.screenshot} 
                  alt={`Screenshot of ${demo.title}`}
                  loading="lazy"
                />
              ) : (
                <div className="screenshot-placeholder">
                  <div className="placeholder-icon">🎯</div>
                  <span>Screenshot Coming Soon</span>
                </div>
              )}
            </div>

            <div className="card-content">
              <p className="card-description">{demo.description}</p>

              <div className="card-features">
                <h4>Key Features</h4>
                <ul>
                  {demo.features.map((feature, index) => (
                    <li key={index}>{feature}</li>
                  ))}
                </ul>
              </div>

              <div className="card-technologies">
                <h4>Technologies</h4>
                <div className="tech-tags">
                  {demo.technologies.map((tech, index) => (
                    <span key={index} className="tech-tag">{tech}</span>
                  ))}
                </div>
              </div>
            </div>

            <div className="card-footer">
              <a 
                href={demo.url}
                className="demo-link"
                style={{ borderColor: categoryColors[demo.category] }}
                target={demo.url.startsWith('http') ? '_blank' : '_self'}
                rel={demo.url.startsWith('http') ? 'noopener noreferrer' : undefined}
                onClick={(e) => e.stopPropagation()} // Prevent card click interference
              >
                <span>Open Demo</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M7 17L17 7M17 7H7M17 7V17"/>
                </svg>
              </a>
            </div>
          </article>
                ))}
              </div>
            </section>
          );
        })}
      </main>

      <footer className="showcase-footer">
        <p>
          <strong>Mind⠶Type</strong> transforms typing from a mechanical process into fluid, 
          intelligent text input. All processing happens locally on your device with full privacy.
        </p>
        <div className="footer-links">
          <a href="https://github.com/mindtype" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href="/docs" target="_blank" rel="noopener noreferrer">
            Documentation
          </a>
          <a href="/#/" className="back-to-main">
            ← Back to Main Demo
          </a>
        </div>
      </footer>
    </div>
  );
}

export default DemoShowcase;
