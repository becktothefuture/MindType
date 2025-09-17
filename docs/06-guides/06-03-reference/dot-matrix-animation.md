<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  D O T   M A T R I X   A N I M A T I O N  ░░░░░░  ║
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
    • WHAT ▸ Visual specification for correction animations
    • WHY  ▸ Subtle, elegant feedback for text corrections
    • HOW  ▸ Word-by-word dot matrix wave effect
-->

# Dot Matrix Wave Animation Specification

## Overview

The dot matrix wave animation provides subtle visual feedback when Mind⠶Flow applies corrections. It creates a wave-like effect that propagates through corrected words, giving users gentle awareness of improvements without disrupting their flow.

## Visual Design

### Animation Concept

Imagine a LED dot matrix display where each character position can transition between states. When a correction occurs, a wave propagates through the affected text, causing characters to briefly "flip" to their corrected state.

```
Before: "helloo thr weathfr"
Wave:   [→→→→→→][→→→][→→→→→→→]  (propagation direction)
After:  "hello the weather"
```

### Animation Phases

#### Phase 1: Wave Initiation (0-100ms)
- Wave starts at the first character of the correction
- Initial acceleration from 0 to peak velocity
- Subtle glow/highlight appears

#### Phase 2: Character Transition (100-300ms per word)
- Each character "flips" in sequence
- Dot matrix effect: old character fades while new character materializes
- Timing: ~20ms per character
- Wave velocity: ~50 characters/second

#### Phase 3: Wave Completion (300-400ms)
- Wave decelerates as it reaches the end
- Glow/highlight fades out
- Text settles into final state

## Technical Implementation

### CSS Animation

```css
.dot-matrix-correction {
  position: relative;
  display: inline-block;
}

.dot-matrix-char {
  display: inline-block;
  transition: all 0.02s ease-out;
  transform-origin: center;
}

.dot-matrix-char.transitioning {
  animation: dotMatrixFlip 0.3s ease-in-out;
}

@keyframes dotMatrixFlip {
  0% {
    transform: rotateX(0deg) scale(1);
    opacity: 1;
  }
  40% {
    transform: rotateX(90deg) scale(0.95);
    opacity: 0.6;
  }
  60% {
    transform: rotateX(-90deg) scale(0.95);
    opacity: 0.6;
  }
  100% {
    transform: rotateX(0deg) scale(1);
    opacity: 1;
  }
}

.dot-matrix-wave {
  position: absolute;
  top: 0;
  left: 0;
  width: 0;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(100, 200, 255, 0.1) 50%,
    transparent 100%
  );
  animation: wavePropagate 0.4s ease-in-out;
}

@keyframes wavePropagate {
  from {
    width: 0;
    left: 0;
  }
  to {
    width: 100%;
    left: 100%;
  }
}
```

### JavaScript Controller

```typescript
interface DotMatrixAnimation {
  // Start animation for a correction
  animate(correction: Correction): Promise<void>;
  
  // Configuration
  config: {
    waveSpeed: number;        // characters per second (default: 50)
    charDelay: number;        // ms between characters (default: 20)
    waveIntensity: number;    // 0-1, visual prominence (default: 0.3)
    enableGlow: boolean;      // subtle glow effect (default: true)
  };
}

class DotMatrixAnimator implements DotMatrixAnimation {
  async animate(correction: Correction): Promise<void> {
    const element = this.getElement(correction);
    const chars = this.splitIntoChars(element);
    
    // Apply wave effect
    element.classList.add('dot-matrix-wave-active');
    
    // Animate each character in sequence
    for (let i = 0; i < chars.length; i++) {
      await this.delay(this.config.charDelay);
      await this.flipCharacter(chars[i], correction.replacement[i]);
    }
    
    // Clean up
    element.classList.remove('dot-matrix-wave-active');
  }
  
  private async flipCharacter(element: HTMLElement, newChar: string): Promise<void> {
    element.classList.add('transitioning');
    
    // Mid-flip, change the character
    await this.delay(150);
    element.textContent = newChar;
    
    // Complete flip
    await this.delay(150);
    element.classList.remove('transitioning');
  }
}
```

## Accessibility

### Reduced Motion Support

When `prefers-reduced-motion: reduce` is active:
- Instant character replacement (no animation)
- No wave effect
- Optional subtle opacity change (0.8 → 1.0)

```css
@media (prefers-reduced-motion: reduce) {
  .dot-matrix-char {
    animation: none !important;
    transition: opacity 0.1s ease-in-out;
  }
  
  .dot-matrix-char.transitioning {
    opacity: 0.8;
  }
  
  .dot-matrix-wave {
    display: none;
  }
}
```

### Screen Reader Announcements

- Single announcement per correction batch: "Text corrected"
- No per-character announcements
- Respects ARIA live region politeness settings

## Performance Considerations

### Optimization Strategies

1. **Batch Corrections**: Group nearby corrections into single animation
2. **Frame Rate**: Target 60fps, degrade gracefully on slower devices
3. **GPU Acceleration**: Use `transform` and `opacity` for hardware acceleration
4. **Throttling**: Maximum 3 concurrent animations
5. **Cancellation**: Abort animation if user types during animation

### Performance Budgets

- Animation initialization: < 5ms
- Per-character transition: < 1ms CPU time
- Total animation memory: < 10MB
- GPU memory usage: < 20MB

## Visual Variants

### Subtle Mode (Default)
- Light wave effect
- Minimal character rotation
- 30% opacity glow
- Duration: 400ms total

### Enhanced Mode (Optional)
- More pronounced wave
- Full character flip
- 50% opacity glow
- Duration: 600ms total

### Minimal Mode (Low Performance)
- Simple fade transition
- No wave effect
- No rotation
- Duration: 200ms total

## Platform-Specific Considerations

### Web (Browser)
- Use CSS animations for performance
- RequestAnimationFrame for timing
- Intersection Observer for viewport optimization

### macOS (Native)
- Core Animation for effects
- NSAnimationContext for timing
- CALayer transformations

### iOS (Native)
- UIView animations
- CADisplayLink for synchronization
- Respect system animation speed

## Configuration API

```typescript
interface DotMatrixConfig {
  // Animation timing
  waveSpeed: number;          // 20-100 chars/sec
  characterDelay: number;     // 10-50ms
  totalDuration: number;      // 200-800ms
  
  // Visual properties
  waveIntensity: number;      // 0.1-1.0
  glowEnabled: boolean;       // true/false
  rotationAngle: number;      // 0-180 degrees
  
  // Performance
  maxConcurrent: number;      // 1-5 animations
  gpuAccelerated: boolean;    // true/false
  throttleRate: number;       // 16-33ms (60-30fps)
  
  // Accessibility
  respectReducedMotion: boolean;  // true/false
  announceCorrections: boolean;   // true/false
}
```

## Testing Checklist

- [ ] Animation runs at 60fps on target devices
- [ ] Characters transition smoothly without flicker
- [ ] Wave propagates at consistent speed
- [ ] Reduced motion mode works correctly
- [ ] Screen readers announce appropriately
- [ ] Animation cancels on user input
- [ ] Memory usage stays within budget
- [ ] Cross-browser compatibility verified
- [ ] Performance degrades gracefully

## Examples

### Basic Correction
```typescript
const animator = new DotMatrixAnimator({
  waveSpeed: 50,
  characterDelay: 20,
  waveIntensity: 0.3
});

await animator.animate({
  start: 10,
  end: 16,
  original: "helloo",
  replacement: "hello"
});
```

### Multiple Word Correction
```typescript
await animator.animate({
  start: 0,
  end: 18,
  original: "teh quick browm",
  replacement: "the quick brown"
});
```

## Design Rationale

The dot matrix wave animation was chosen because it:
- Provides clear visual feedback without being distracting
- Resembles classic LED displays, giving a technical yet friendly feel
- Scales well from single characters to full sentences
- Maintains readability during animation
- Works across all platforms with consistent appearance
- Degrades gracefully for accessibility and performance

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:45:45Z -->
