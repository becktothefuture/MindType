/*╔══════════════════════════════════════════════════════════╗
  ║  ░  SWEEPSCHEDULER  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ Integrate Noise → Context → Tone pipeline with staging buffer; English-only gating for full pipeline (Noise for others)
  • WHY  ▸ REQ-THREE-STAGE-PIPELINE, REQ-LANGUAGE-GATING
  • HOW  ▸ See linked contracts and guides in docs
*/

import { SHORT_PAUSE_MS, getTypingTickMs } from '../config/defaultThresholds';
import { noiseTransform } from '../engines/noiseTransformer';
import { backfillConsistency } from '../engines/backfillConsistency';
import type { TypingMonitor, TypingEvent } from './typingMonitor';
import { createDiffusionController } from './diffusionController';
import type { LMAdapter } from './lm/types';
import { createLogger } from './logger';
import type { SecurityContext } from './security';
import { contextTransform } from '../engines/contextTransformer';
import {
  detectBaseline,
  planAdjustments,
  type ToneOption,
} from '../engines/toneTransformer';
import { detectLanguage } from './languageDetection';
import { StagingBuffer } from './stagingBuffer';
import {
  applyThresholds,
  computeConfidence,
  computeInputFidelity,
  type ConfidenceInputs,
} from './confidenceGate';

export interface SweepScheduler {
  start(): void;
  stop(): void;
  setOptions(opts: Partial<PipelineOptions>): void;
}

export interface PipelineOptions {
  toneEnabled?: boolean;
  toneTarget?: ToneOption; // 'None' | 'Casual' | 'Professional'
}

export function createSweepScheduler(
  monitor?: TypingMonitor,
  security?: SecurityContext,
  getLMAdapter?: () => LMAdapter | null,
  pipeline?: PipelineOptions,
): SweepScheduler {
  let lastEvent: TypingEvent | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let typingInterval: ReturnType<typeof setInterval> | null = null;
  const diffusion = createDiffusionController(undefined, getLMAdapter);
  const log = createLogger('sweep');
  const sb = new StagingBuffer();
  const opts: Required<PipelineOptions> = {
    toneEnabled: pipeline?.toneEnabled ?? false,
    toneTarget: pipeline?.toneTarget ?? 'None',
  };

  function clearIntervals() {
    if (timer) clearTimeout(timer);
    if (typingInterval) clearInterval(typingInterval);
    timer = null;
    typingInterval = null;
  }

  function onEvent(ev: TypingEvent) {
    if (security?.isSecure?.() || security?.isIMEComposing?.()) {
      // In secure contexts, stop timers and ignore events
      clearIntervals();
      log.debug('event dropped due to security/ime');
      return;
    }
    lastEvent = ev;
    log.debug('onEvent', { caret: ev.caret, textLen: ev.text.length });
    diffusion.update(ev.text, ev.caret);
    // Caret moved; mark overlapping proposals for rollback; apply rollback of last system bucket
    try {
      const rolled = sb.onCaretMove(ev.caret);
      if (rolled > 0) {
        // Roll back last system edits group to keep caret region safe
        // @ts-expect-error internal method available on controller
        (diffusion as any).rollbackLastSystemGroup?.();
      }
    } catch {}
    if (timer) clearTimeout(timer);
    // schedule pause catch-up
    timer = setTimeout(() => runSweeps(), SHORT_PAUSE_MS);
    // ensure streaming tick during active typing
    if (!typingInterval) {
      typingInterval = setInterval(() => {
        try {
          diffusion.tickOnce();
          log.trace('tickOnce');
        } catch {
          // fail-safe: stop streaming to avoid runaway loops
          clearIntervals();
          log.warn('tickOnce threw; cleared intervals');
        }
      }, getTypingTickMs());
    }
  }

  async function runSweeps() {
    if (!lastEvent) return;
    // Final catch-up of streamed diffusion on pause with safety cap
    try {
      let steps = 0;
      const MAX_STEPS = 200; // cap to avoid infinite loops in edge cases
      while (
        diffusion.getState().frontier < diffusion.getState().caret &&
        steps < MAX_STEPS
      ) {
        await diffusion.catchUp();
        steps += 1;
        log.debug('catchUp step', { steps, frontier: diffusion.getState().frontier });
      }
    } catch {
      // swallow to keep UI responsive
      log.warn('catchUp threw; continuing');
    }
    // Legacy engines can still run after catch-up
    noiseTransform({ text: lastEvent.text, caret: lastEvent.caret });
    backfillConsistency({ text: lastEvent.text, caret: lastEvent.caret });

    // v0.4 pipeline: Context → Tone (English-only) under confidence gating
    try {
      const st = diffusion.getState();
      const lang = detectLanguage(st.text);
      if (lang === 'en') {
        // Context stage
        const ctx = contextTransform({ text: st.text, caret: st.caret });
        for (const p of ctx.proposals) {
          const sample = st.text.slice(
            Math.max(0, p.start - 80),
            Math.min(st.caret, p.end + 80),
          );
          const inputs: ConfidenceInputs = {
            inputFidelity: computeInputFidelity(sample),
            transformationQuality: p.text === st.text.slice(p.start, p.end) ? 0 : 0.95,
            contextCoherence: 0.8,
            temporalDecay: 1,
          };
          const score = computeConfidence(inputs);
          const decision = applyThresholds(score);
          sb.updateScore(`ctx-${p.start}-${p.end}`, score, decision);
          if (decision === 'commit') {
            diffusion.applyExternal(p);
          }
        }

        // Tone stage (optional)
        if (opts.toneEnabled && opts.toneTarget !== 'None') {
          const updated = diffusion.getState();
          const baseline = detectBaseline(updated.text);
          const tProps = planAdjustments(
            baseline,
            opts.toneTarget,
            updated.text,
            updated.caret,
          );
          for (const p of tProps) {
            const sample = updated.text.slice(
              Math.max(0, p.start - 80),
              Math.min(updated.caret, p.end + 80),
            );
            const inputs: ConfidenceInputs = {
              inputFidelity: computeInputFidelity(sample),
              transformationQuality:
                p.text === updated.text.slice(p.start, p.end) ? 0 : 0.9,
              contextCoherence: 0.75,
              temporalDecay: 1,
            };
            const score = computeConfidence(inputs);
            const decision = applyThresholds(score, undefined, { requireTone: true });
            sb.updateScore(`tone-${p.start}-${p.end}`, score, decision);
            if (decision === 'commit') {
              diffusion.applyExternal(p);
            }
          }
        }
      }
    } catch (err) {
      log.warn('v0.4 pipeline run failed', { err: (err as Error).message });
    } finally {
      sb.cleanup();
    }
  }

  let unsubscribe: (() => void) | null = null;
  return {
    start() {
      if (!monitor) return;
      unsubscribe = monitor.on(onEvent);
    },
    stop() {
      if (unsubscribe) unsubscribe();
      clearIntervals();
    },
    setOptions(next) {
      if (typeof next.toneEnabled === 'boolean') opts.toneEnabled = next.toneEnabled;
      if (next.toneTarget) opts.toneTarget = next.toneTarget;
    },
  };
}
