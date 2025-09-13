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
  computeDynamicThresholds,
  computeInputFidelity,
  type ConfidenceInputs,
} from './confidenceGate';
import {
  resolveConflicts,
  type Proposal as ResolvedInput,
} from '../engines/conflictResolver';
import { defaultActiveRegionPolicy } from './activeRegionPolicy';

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
  let isPauseRunning = false; // single-flight guard for pause sweeps
  // Provide default sentence/word-based policy for consistent context windows
  const diffusion = createDiffusionController(defaultActiveRegionPolicy, getLMAdapter);
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
    isPauseRunning = false;
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
      const d = diffusion as unknown as { rollbackLastSystemGroup?: () => void };
      if (rolled > 0 && typeof d.rollbackLastSystemGroup === 'function') {
        d.rollbackLastSystemGroup();
      }
    } catch {}
    if (timer) clearTimeout(timer);
    // schedule pause catch-up with anti-thrash buffer per tier
    // Use device-tier aware debounce: WebGPU fastest, CPU slowest
    const baseDelay = SHORT_PAUSE_MS;
    let tierDelay = baseDelay;
    try {
      const nav = navigator as Navigator & { gpu?: unknown };
      if (typeof nav.gpu !== 'undefined')
        tierDelay = baseDelay; // webgpu
      else if (typeof WebAssembly !== 'undefined')
        tierDelay = Math.round(baseDelay * 1.1); // wasm
      else tierDelay = Math.round(baseDelay * 1.3); // cpu
    } catch {
      tierDelay = baseDelay;
    }
    timer = setTimeout(() => {
      if (isPauseRunning) return; // guard overlapping sweeps
      isPauseRunning = true;
      runSweeps().finally(() => {
        isPauseRunning = false;
      });
    }, tierDelay);
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
      log.info('pause collected', { steps });
    } catch {
      // swallow to keep UI responsive
      log.warn('catchUp threw; continuing');
    }
    // Collect proposals from engines for deterministic resolution
    const noise = noiseTransform({ text: lastEvent.text, caret: lastEvent.caret });
    const collected: ResolvedInput[] = [];
    if (noise.diff) {
      collected.push({ ...noise.diff, source: 'noise' });
      // Emit stage preview
      try {
        const preview =
          lastEvent.text.slice(0, noise.diff.start) +
          noise.diff.text +
          lastEvent.text.slice(noise.diff.end);
        (globalThis as unknown as { __mtStagePreview?: unknown }).__mtStagePreview = { noise: preview } as unknown;
      } catch {}
    }
    backfillConsistency({ text: lastEvent.text, caret: lastEvent.caret });

    // v0.4 pipeline: Context → Tone (English-only) under confidence gating
    try {
      const st = diffusion.getState();
      const lang = detectLanguage(st.text);
      if (lang === 'en') {
        // Context stage (with LM integration)
        const lmAdapter = getLMAdapter?.();
        const ctx = await contextTransform(
          { text: st.text, caret: st.caret },
          lmAdapter ?? undefined,
          // Get context manager from global if available
          (globalThis as unknown as { __mtContextManager?: import('./lm/contextManager').LMContextManager }).__mtContextManager,
        );
        let contextPreview = st.text;
        for (const p of ctx.proposals) {
          collected.push({ ...p, source: 'context' });
          // Build preview with this proposal applied
          try {
            contextPreview =
              contextPreview.slice(0, p.start) + p.text + contextPreview.slice(p.end);
          } catch {}
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
          const dyn = computeDynamicThresholds({
            caret: st.caret,
            start: p.start,
            end: p.end,
            editType: 'context',
          });
          const decision = applyThresholds(score, dyn);
          sb.updateScore(`ctx-${p.start}-${p.end}`, score, decision);
          // Defer actual application until conflicts are resolved below
        }
        try {
          (globalThis as unknown as { __mtStagePreview?: { buffer?: string; context?: string } }).__mtStagePreview = {
            ...((globalThis as unknown as { __mtStagePreview?: { buffer?: string; context?: string } }).__mtStagePreview || {}),
            buffer: st.text.slice(Math.max(0, st.caret - 48), st.caret),
            context: contextPreview,
          };
        } catch {}

        // LM processing is now integrated into the context transformer above
        // const lmAdapter = getLMAdapter?.(); // Removed - duplicate declaration
        // LM processing is now handled within the context transformer

        // Tone stage (optional)
        if (opts.toneEnabled && opts.toneTarget !== 'None') {
          const updated = diffusion.getState();
          const baseline = detectBaseline(updated.text);
          // Device-tier scope: CPU:10, WebGPU/WASM:20
          const w: unknown = (globalThis as unknown as { navigator?: { gpu?: unknown } }).navigator;
          const hasWebGPU = Boolean((w as { gpu?: unknown })?.gpu);
          const hasWASM = typeof WebAssembly !== 'undefined';
          const scopeN = hasWebGPU || hasWASM ? 20 : 10;
          const textForTone = (() => {
            const full = updated.text.slice(0, updated.caret);
            const parts = full.split(/(?<=[.!?])\s+/);
            const tail = parts.slice(Math.max(0, parts.length - scopeN));
            return tail.join(' ');
          })();
          const caretForTone = textForTone.length;
          const tProps = planAdjustments(
            baseline,
            opts.toneTarget,
            textForTone,
            caretForTone,
          );
          let tonePreview = textForTone;
          for (const p of tProps) {
            collected.push({ ...p, source: 'tone' });
            const sample = textForTone.slice(
              Math.max(0, p.start - 80),
              Math.min(caretForTone, p.end + 80),
            );
            const inputs: ConfidenceInputs = {
              inputFidelity: computeInputFidelity(sample),
              transformationQuality:
                p.text === textForTone.slice(p.start, p.end) ? 0 : 0.9,
              contextCoherence: 0.75,
              temporalDecay: 1,
            };
            const score = computeConfidence(inputs);
            const dyn = computeDynamicThresholds({
              caret: caretForTone,
              start: p.start,
              end: p.end,
              editType: 'tone',
            });
            const decision = applyThresholds(score, dyn, { requireTone: true });
            sb.updateScore(`tone-${p.start}-${p.end}`, score, decision);
            // Defer actual application until conflicts are resolved below
            try {
              tonePreview =
                tonePreview.slice(0, p.start) + p.text + tonePreview.slice(p.end);
            } catch {}
          }
          try {
            (globalThis as unknown as { __mtStagePreview?: { tone?: string } }).__mtStagePreview = {
              ...((globalThis as unknown as { __mtStagePreview?: { tone?: string } }).__mtStagePreview || {}),
              tone: tonePreview,
            };
          } catch {}
        }
      }
    } catch (err) {
      log.warn('v0.4 pipeline run failed', { err: (err as Error).message });
    } finally {
      try {
        const st2 = diffusion.getState();
        (globalThis as unknown as { __mtStagePreview?: { buffer?: string } }).__mtStagePreview = {
          ...((globalThis as unknown as { __mtStagePreview?: { buffer?: string } }).__mtStagePreview || {}),
          buffer: st2.text.slice(Math.max(0, st2.caret - 48), st2.caret),
        };
      } catch {}
      // After collecting, resolve conflicts per precedence and apply
      try {
        log.info('pause proposals', { collected: collected.length });
        const resolved = resolveConflicts(collected);
        log.info('pause resolved', { resolved: resolved.length });
        for (const p of resolved) {
          // Translate tone proposals' relative offsets if needed: proposals are pre-caret
          // Our collected includes only pre-caret spans; apply directly
          diffusion.applyExternal(p);
        }
      } catch {}
      sb.cleanup();
      // resume micro tick if still typing (next onEvent will ensure interval)
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
