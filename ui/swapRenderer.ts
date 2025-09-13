/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  M E C H A N I C A L   S W A P   R E N D E R E R  ░░░░░░░  ║
  ║                                                              ║
  ║   Renders corrections via mechanical letter-swap animation   ║
  ║   with optional braille marker. Replaces highlight system.  ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Mechanical swap renderer with braille markers and SR announcements
  • WHY  ▸ REQ-VISUAL-SWAP, FT-307
  • HOW  ▸ Listens for corrections; animates character swaps; respects reduced-motion
*/

interface MinimalCustomEventCtor {
  new (type: string, eventInitDict?: { detail?: unknown }): Event;
}

interface MinimalGlobal {
  dispatchEvent?(event: Event): boolean;
  CustomEvent?: MinimalCustomEventCtor;
}

export interface SwapConfig {
  // Marker glyph to show at swap sites (default: '⠿')
  markerGlyph?: string;
  // Duration for swap animation in ms (0 for instant/reduced-motion)
  swapDurationMs?: number;
  // Whether to show the braille marker
  showMarker?: boolean;
  // Whether to announce to screen readers
  announceToSR?: boolean;
}

export interface SwapSite {
  start: number;
  end: number;
  originalText: string;
  correctedText: string;
  appliedAtMs: number;
}

const DEFAULT_CONFIG: Required<SwapConfig> = {
  markerGlyph: '⠿',
  swapDurationMs: 200,
  showMarker: true,
  announceToSR: true,
};

let CURRENT_CONFIG: Required<SwapConfig> = { ...DEFAULT_CONFIG };

export function setSwapConfig(next: Partial<SwapConfig>): void {
  CURRENT_CONFIG = { ...CURRENT_CONFIG, ...next } as Required<SwapConfig>;
}

export function getSwapConfig(): Required<SwapConfig> {
  return CURRENT_CONFIG;
}

// ⟢ Batch announcements to avoid SR spam
let pendingAnnouncements: SwapSite[] = [];
let announcementTimer: ReturnType<typeof setTimeout> | null = null;

function announceSwaps(sites: SwapSite[], config: Required<SwapConfig>) {
  if (!config.announceToSR || sites.length === 0) return;

  const g = globalThis as unknown as MinimalGlobal;
  if (!g.dispatchEvent || !g.CustomEvent) return;

  // Single announcement per batch: "text updated behind cursor"
  const event = new g.CustomEvent('mindtype:swapAnnouncement', {
    detail: {
      message: 'text updated behind cursor',
      count: sites.length,
      sites: sites.map((s) => ({
        from: s.originalText,
        to: s.correctedText,
      })),
    },
  });
  g.dispatchEvent(event);
}

function scheduleAnnouncement(site: SwapSite, config: Required<SwapConfig>) {
  pendingAnnouncements.push(site);

  if (announcementTimer) clearTimeout(announcementTimer);

  // Batch announcements over 100ms window
  announcementTimer = setTimeout(() => {
    announceSwaps([...pendingAnnouncements], config);
    pendingAnnouncements = [];
    announcementTimer = null;
  }, 100);
}

export function renderMechanicalSwap(
  range: { start: number; end: number; text: string },
  config: SwapConfig = {},
) {
  const cfg = { ...CURRENT_CONFIG, ...config };

  // ⟢ Check for reduced-motion preference
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

  const swapDuration = reducedMotion ? 0 : cfg.swapDurationMs;

  const site: SwapSite = {
    start: range.start,
    end: range.end,
    originalText: '', // Would be computed from previous state
    correctedText: range.text,
    appliedAtMs: Date.now(),
  };

  // ⟢ Emit swap event for UI layer to handle
  const g = globalThis as unknown as MinimalGlobal;
  if (g.dispatchEvent && g.CustomEvent) {
    const event = new g.CustomEvent('mindtype:mechanicalSwap', {
      detail: {
        start: range.start,
        end: range.end,
        text: range.text,
        markerGlyph: cfg.showMarker ? cfg.markerGlyph : null,
        durationMs: swapDuration,
        instant: swapDuration === 0,
      },
    });
    g.dispatchEvent(event);
  }

  // Schedule screen reader announcement
  scheduleAnnouncement(site, cfg);
}

// ⟢ Replace the old highlight system
export function emitSwap(range: { start: number; end: number; text: string }) {
  renderMechanicalSwap(range);
}

// ⟢ Compatibility function to gradually replace renderHighlight calls
export function renderHighlight(range: { start: number; end: number; text?: string }) {
  if (range.text) {
    renderMechanicalSwap({ ...range, text: range.text });
  }
}
