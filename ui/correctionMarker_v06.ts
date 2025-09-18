/*╔══════════════════════════════════════════════════════╗
  ║  ░  C O R R E C T I O N   M A R K E R   V 0 6  ░░░░░  ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Revolutionary Correction Marker with two-mode operation
  • WHY  ▸ Visual intelligence showing AI working alongside human creativity
  • HOW  ▸ Listening mode (braille pulse) → Correction mode (traveling wave)
*/

// Braille symbols for Listening Mode animation
export const LISTENING_SEQUENCE = ['⠂', '⠄', '⠆', '⠠', '⠢', '⠤', '⠦', '⠰', '⠲', '⠴', '⠶'] as const;

// Processing patterns for Correction Mode
export const PROCESSING_PATTERNS = {
  noise: ['⠁', '⠂', '⠄', '⠈'],
  context: ['⠃', '⠆', '⠌'],
  tone: ['⠷', '⠿', '⠷'],
} as const;

export type MarkerMode = 'listening' | 'correcting' | 'idle';
export type ProcessingType = 'noise' | 'context' | 'tone';

export interface CorrectionMarkerState {
  mode: MarkerMode;
  position: number;
  targetPosition: number;
  animationFrame: number;
  processingType?: ProcessingType;
}

export class CorrectionMarkerRenderer {
  private element: HTMLElement | null = null;
  private state: CorrectionMarkerState = {
    mode: 'idle',
    position: 0,
    targetPosition: 0,
    animationFrame: 0,
  };
  private animationId: number | null = null;
  private reducedMotion = false;

  constructor(container: HTMLElement) {
    this.element = document.createElement('span');
    this.element.className = 'correction-marker';
    this.element.setAttribute('aria-hidden', 'true');
    container.appendChild(this.element);

    // Check for reduced motion preference
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  enterListeningMode(position: number): void {
    this.state = {
      mode: 'listening',
      position,
      targetPosition: position,
      animationFrame: 0,
    };
    this.startAnimation();
  }

  enterCorrectionMode(fromPosition: number, toPosition: number, processingType: ProcessingType): void {
    this.state = {
      mode: 'correcting',
      position: fromPosition,
      targetPosition: toPosition,
      animationFrame: 0,
      processingType,
    };
    this.startAnimation();
  }

  idle(): void {
    this.state.mode = 'idle';
    this.stopAnimation();
    if (this.element) {
      this.element.textContent = '';
      this.element.style.opacity = '0';
    }
  }

  private startAnimation(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.animate();
  }

  private stopAnimation(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private animate = (): void => {
    if (!this.element || this.state.mode === 'idle') return;

    if (this.reducedMotion) {
      // Static display for reduced motion
      this.renderStatic();
      return;
    }

    if (this.state.mode === 'listening') {
      this.renderListeningMode();
    } else if (this.state.mode === 'correcting') {
      this.renderCorrectionMode();
    }

    this.state.animationFrame++;
    this.animationId = requestAnimationFrame(this.animate);
  };

  private renderListeningMode(): void {
    if (!this.element) return;

    // Hypnotic braille pulse (200ms per symbol, 2.4s cycle)
    const symbolIndex = Math.floor(this.state.animationFrame / 12) % LISTENING_SEQUENCE.length;
    this.element.textContent = LISTENING_SEQUENCE[symbolIndex];
    this.element.style.opacity = '0.8';
    this.element.style.color = '#3cc5cc';
  }

  private renderCorrectionMode(): void {
    if (!this.element || !this.state.processingType) return;

    // Processing indicators based on stage
    const patterns = PROCESSING_PATTERNS[this.state.processingType];
    const symbolIndex = Math.floor(this.state.animationFrame / 8) % patterns.length;
    
    this.element.textContent = patterns[symbolIndex];
    this.element.style.opacity = '1';
    this.element.style.color = '#ff8f00';

    // Simulate travel toward target (simplified)
    const progress = Math.min(1, this.state.animationFrame / 60);
    this.state.position = this.state.position + (this.state.targetPosition - this.state.position) * progress * 0.1;
  }

  private renderStatic(): void {
    if (!this.element) return;

    if (this.state.mode === 'listening') {
      this.element.textContent = '⠶';
      this.element.style.opacity = '0.6';
    } else if (this.state.mode === 'correcting') {
      this.element.textContent = '⠿';
      this.element.style.opacity = '0.8';
    }
  }

  destroy(): void {
    this.stopAnimation();
    if (this.element?.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

