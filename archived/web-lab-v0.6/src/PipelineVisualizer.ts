/*╔══════════════════════════════════════════════════════╗
  ║  ░  P I P E L I N E   V I S U A L I Z E R  ░░░░░░░░  ║
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
  • WHAT ▸ Real-time visualization of pipeline state
  • WHY  ▸ Debug PDF-aligned behaviour visually
  • HOW  ▸ Canvas/SVG + event listeners → update UI
*/

import type { PipelineEvent } from './PipelineLogger';

export interface PipelineState {
  stage: 'idle' | 'streaming' | 'noise' | 'context' | 'tone' | 'complete';
  activeRegion: { start: number; end: number } | null;
  caret: number;
  frontier: number;
  lmStatus: {
    deviceTier: 'webgpu' | 'wasm' | 'cpu' | 'unknown';
    tokenLimit: number;
    latency: number | null;
  };
  confidence: {
    score: number | null;
    thresholds: Record<string, number>;
    decision: 'hold' | 'commit' | 'discard' | null;
  };
  performance: {
    totalLatency: number | null;
    stageLatencies: Record<string, number>;
  };
}

export class PipelineVisualizer {
  private container: HTMLElement;
  private state: PipelineState = {
    stage: 'idle',
    activeRegion: null,
    caret: 0,
    frontier: 0,
    lmStatus: { deviceTier: 'unknown', tokenLimit: 0, latency: null },
    confidence: { score: null, thresholds: {}, decision: null },
    performance: { totalLatency: null, stageLatencies: {} },
  };

  constructor(container: HTMLElement) {
    this.container = container;
    this.render();
  }

  /**
   * Update state from pipeline event
   */
  update(event: PipelineEvent): void {
    // Update stage
    if (event.type === 'typing') {
      this.state.stage = 'streaming';
      if (event.data && typeof event.data === 'object' && 'caret' in event.data) {
        this.state.caret = event.data.caret as number;
      }
    } else if (event.type === 'noise') {
      this.state.stage = 'noise';
    } else if (event.type === 'context') {
      this.state.stage = 'context';
    } else if (event.type === 'tone') {
      this.state.stage = 'tone';
    } else if (event.type === 'sweep' && event.message.includes('complete')) {
      this.state.stage = 'complete';
    }

    // Update Active Region
    if (event.type === 'activeRegion' && event.data) {
      const data = event.data as any;
      if (data.start !== undefined && data.end !== undefined) {
        this.state.activeRegion = { start: data.start, end: data.end };
        this.state.frontier = data.frontier || 0;
      }
    }

    // Update LM status
    if (event.type === 'lm' && event.data) {
      const data = event.data as any;
      if (data.deviceTier) this.state.lmStatus.deviceTier = data.deviceTier;
      if (data.tokenLimit) this.state.lmStatus.tokenLimit = data.tokenLimit;
      if (data.latency) this.state.lmStatus.latency = data.latency;
    }

    // Update confidence
    if (event.type === 'confidence' && event.data) {
      const data = event.data as any;
      this.state.confidence.score = data.score || null;
      this.state.confidence.thresholds = data.thresholds || {};
      this.state.confidence.decision = data.decision || null;
    }

    // Update performance
    if (event.data && typeof event.data === 'object' && 'latency' in event.data) {
      const data = event.data as any;
      if (event.module.includes('noise')) {
        this.state.performance.stageLatencies.noise = data.latency;
      } else if (event.module.includes('context')) {
        this.state.performance.stageLatencies.context = data.latency;
      } else if (event.module.includes('tone')) {
        this.state.performance.stageLatencies.tone = data.latency;
      }
      
      // Compute total
      const latencies = Object.values(this.state.performance.stageLatencies).filter((v): v is number => typeof v === 'number');
      if (latencies.length > 0) {
        this.state.performance.totalLatency = latencies.reduce((a, b) => a + b, 0);
      }
    }

    this.render();
  }

  /**
   * Render visualization
   */
  private render(): void {
    const s = this.state;
    
    this.container.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px;">
        <div class="viz-panel">
          <h3 style="margin: 0 0 8px 0; font-size: 14px;">Stage</h3>
          <div class="stage-indicator" data-stage="${s.stage}">${s.stage}</div>
        </div>
        <div class="viz-panel">
          <h3 style="margin: 0 0 8px 0; font-size: 14px;">LM Tier</h3>
          <div>${s.lmStatus.deviceTier}</div>
        </div>
        <div class="viz-panel">
          <h3 style="margin: 0 0 8px 0; font-size: 14px;">Latency</h3>
          <div>${s.performance.totalLatency ? `${s.performance.totalLatency.toFixed(1)}ms` : '—'}</div>
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px;">Active Region</h3>
        <div style="font-family: ui-monospace; font-size: 12px; padding: 8px; background: #f5f5f5; border-radius: 4px;">
          ${s.activeRegion 
            ? `start: ${s.activeRegion.start}, end: ${s.activeRegion.end}, size: ${s.activeRegion.end - s.activeRegion.start} chars`
            : '—'}
          <br/>
          Caret: ${s.caret}, Frontier: ${s.frontier}
        </div>
      </div>

      <div style="margin-bottom: 16px;">
        <h3 style="margin: 0 0 8px 0; font-size: 14px;">Confidence Gate</h3>
        <div style="font-family: ui-monospace; font-size: 12px; padding: 8px; background: #f5f5f5; border-radius: 4px;">
          Score: ${s.confidence.score !== null ? s.confidence.score.toFixed(3) : '—'}<br/>
          Decision: ${s.confidence.decision || '—'}<br/>
          Thresholds: ${Object.keys(s.confidence.thresholds).length > 0 ? JSON.stringify(s.confidence.thresholds) : '—'}
        </div>
      </div>

      <div>
        <h3 style="margin: 0 0 8px 0; font-size: 14px;">Stage Latencies</h3>
        <div style="font-family: ui-monospace; font-size: 12px; padding: 8px; background: #f5f5f5; border-radius: 4px;">
          ${Object.entries(s.performance.stageLatencies).map(([k, v]) => `${k}: ${v.toFixed(1)}ms`).join('<br/>') || '—'}
        </div>
      </div>
    `;

    // Inject styles
    if (!document.getElementById('viz-styles')) {
      const style = document.createElement('style');
      style.id = 'viz-styles';
      style.textContent = `
        .viz-panel { padding: 8px; background: #f9f9f9; border-radius: 4px; }
        .stage-indicator {
          font-weight: 600;
          padding: 4px 8px;
          border-radius: 4px;
          display: inline-block;
        }
        .stage-indicator[data-stage="idle"] { background: #e0e0e0; color: #666; }
        .stage-indicator[data-stage="streaming"] { background: #e3f2fd; color: #1976d2; }
        .stage-indicator[data-stage="noise"] { background: #fff3e0; color: #f57c00; }
        .stage-indicator[data-stage="context"] { background: #e8f5e8; color: #388e3c; }
        .stage-indicator[data-stage="tone"] { background: #f3e5f5; color: #7b1fa2; }
        .stage-indicator[data-stage="complete"] { background: #e0f2f1; color: #00796b; }
      `;
      document.head.appendChild(style);
    }
  }

  /**
   * Get current state
   */
  getState(): PipelineState {
    return { ...this.state };
  }
}

