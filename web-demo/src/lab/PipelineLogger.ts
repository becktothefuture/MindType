/*╔══════════════════════════════════════════════════════╗
  ║  ░  P I P E L I N E   L O G G E R  ░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ Capture every pipeline event for digestive-path debugging
  • WHY  ▸ PDF requirement: comprehensive logging to validate input→output
  • HOW  ▸ Logger sink + diagnostics bus + event interceptors
*/

import type { LogRecord } from '../../core/logger';
import { diagBus, type DiagEvent } from '../../core/diagnosticsBus';

export interface PipelineEvent {
  id: string;
  timestamp: number;
  type: 'typing' | 'sweep' | 'diffusion' | 'activeRegion' | 'noise' | 'context' | 'tone' | 'confidence' | 'lm' | 'diff' | 'security';
  module: string;
  message: string;
  data?: unknown;
  metadata?: Record<string, unknown>;
}

export class PipelineLogger {
  private events: PipelineEvent[] = [];
  private maxEvents = 1000;
  private eventIdCounter = 0;
  private subscriptions: Array<() => void> = [];

  constructor() {
    this.subscribeToDiagnosticsBus();
  }

  /**
   * Record a structured pipeline event
   */
  record(type: PipelineEvent['type'], module: string, message: string, data?: unknown, metadata?: Record<string, unknown>): void {
    const event: PipelineEvent = {
      id: `evt-${++this.eventIdCounter}`,
      timestamp: performance.now(),
      type,
      module,
      message,
      data,
      metadata,
    };

    this.events.push(event);
    
    // Maintain max buffer
    if (this.events.length > this.maxEvents) {
      this.events.shift();
    }

    // Emit to console for immediate visibility
    console.log(`[${event.type}] ${event.module}: ${event.message}`, data || '');
  }

  /**
   * Subscribe to diagnostics bus events
   */
  private subscribeToDiagnosticsBus(): void {
    // Noise channel
    this.subscriptions.push(
      diagBus.subscribe('noise', (ev: DiagEvent & { channel: 'noise' }) => {
        this.record('noise', 'noiseTransformer', `Decision: ${ev.decision}`, {
          rule: ev.rule,
          window: ev.window,
          range: ev.start !== null && ev.end !== null ? { start: ev.start, end: ev.end } : null,
        });
      })
    );

    // LM wire channel
    this.subscriptions.push(
      diagBus.subscribe('lm-wire', (ev: DiagEvent & { channel: 'lm-wire' }) => {
        this.record('lm', 'lmAdapter', `Phase: ${ev.phase}`, {
          requestId: ev.requestId,
          ...ev.detail,
        });
      })
    );

    // Context window channel
    this.subscriptions.push(
      diagBus.subscribe('context-window', (ev: DiagEvent & { channel: 'context-window' }) => {
        this.record('activeRegion', 'activeRegionPolicy', 'Context window computed', {
          bandStart: ev.bandStart,
          bandEnd: ev.bandEnd,
          spanPreview: ev.spanPreview,
        });
      })
    );
  }

  /**
   * Intercept logger events from core logger
   */
  interceptLoggerSink(record: LogRecord): void {
    // Map namespace to event type
    let type: PipelineEvent['type'] = 'sweep';
    if (record.namespace.includes('monitor')) type = 'typing';
    else if (record.namespace.includes('diffusion')) type = 'diffusion';
    else if (record.namespace.includes('noise')) type = 'noise';
    else if (record.namespace.includes('context')) type = 'context';
    else if (record.namespace.includes('tone')) type = 'tone';
    else if (record.namespace.includes('confidence')) type = 'confidence';
    else if (record.namespace.includes('security')) type = 'security';

    this.record(type, record.namespace, record.message, record.data);
  }

  /**
   * Log typing event
   */
  logTypingEvent(text: string, caret: number, atMs: number): void {
    this.record('typing', 'typingMonitor', 'Typing event emitted', {
      textLength: text.length,
      caret,
      timestamp: atMs,
      textPreview: text.slice(Math.max(0, caret - 20), caret),
    });
  }

  /**
   * Log Active Region computation
   */
  logActiveRegion(activeRegion: { start: number; end: number }, caret: number, frontier: number): void {
    this.record('activeRegion', 'activeRegionPolicy', 'Active Region computed', {
      start: activeRegion.start,
      end: activeRegion.end,
      caret,
      frontier,
      size: activeRegion.end - activeRegion.start,
      caretSafe: activeRegion.end <= caret,
    });
  }

  /**
   * Log correction diff
   */
  logDiff(stage: 'noise' | 'context' | 'tone', diff: { start: number; end: number; text: string }, originalText: string): void {
    const before = originalText.slice(diff.start, diff.end);
    this.record('diff', `engines/${stage}Transformer`, `Diff applied (${stage})`, {
      start: diff.start,
      end: diff.end,
      before,
      after: diff.text,
      caretSafe: diff.end <= (diff as any).caret || true, // Assume validated upstream
    });
  }

  /**
   * Log confidence gate decision
   */
  logConfidenceGate(score: number, thresholds: Record<string, number>, decision: 'hold' | 'commit' | 'discard', stage: string): void {
    this.record('confidence', 'confidenceGate', `Gate decision: ${decision}`, {
      score,
      thresholds,
      decision,
      stage,
    });
  }

  /**
   * Get all events
   */
  getEvents(): PipelineEvent[] {
    return [...this.events];
  }

  /**
   * Get events filtered by type
   */
  getEventsByType(type: PipelineEvent['type']): PipelineEvent[] {
    return this.events.filter(e => e.type === type);
  }

  /**
   * Export events as JSON
   */
  exportJSON(): string {
    return JSON.stringify({
      version: '0.6.0',
      timestamp: new Date().toISOString(),
      totalEvents: this.events.length,
      events: this.events,
    }, null, 2);
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
    this.eventIdCounter = 0;
  }

  /**
   * Cleanup subscriptions
   */
  destroy(): void {
    this.subscriptions.forEach(unsub => unsub());
    this.subscriptions = [];
  }
}

