/*╔══════════════════════════════════════════════════════╗
  ║  ░  W E B   L A B   E N T R Y   V 0 . 6  ░░░░░░░░░░  ║
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
  • WHAT ▸ Boot pipeline and log every event (digestive path)
  • WHY  ▸ Debug PDF-aligned behaviour end-to-end
  • HOW  ▸ Global logger sink → UI; simple typing ingestion
*/

import { boot, setLoggerConfig, type LogRecord } from '../../core/logger';
import { PipelineLogger } from './PipelineLogger';
import { PipelineVisualizer } from './PipelineVisualizer';

// Configure logger to use PipelineLogger sink
function configureGlobalLogger(pipelineLogger: PipelineLogger) {
  setLoggerConfig({
    enabled: true,
    level: 'debug',
    sink: (record: LogRecord) => {
      pipelineLogger.interceptLoggerSink(record);
      // Also log to console for immediate visibility
      const method = record.level === 'error' ? 'error' : record.level === 'warn' ? 'warn' : 'log';
      console[method](`[${record.namespace}] ${record.message}`, record.data || '');
    },
  });
}

function main() {
  const ta = document.getElementById('input') as HTMLTextAreaElement;
  const logEl = document.getElementById('logs') as HTMLDivElement;
  const exportBtn = document.getElementById('export') as HTMLButtonElement;
  const resetBtn = document.getElementById('reset') as HTMLButtonElement;
  const reduced = document.getElementById('reduced') as HTMLInputElement;

  // Initialize pipeline logger and visualizer
  const pipelineLogger = new PipelineLogger();
  const vizContainer = document.createElement('div');
  vizContainer.id = 'viz-container';
  document.body.insertBefore(vizContainer, document.body.firstChild);
  const visualizer = new PipelineVisualizer(vizContainer);

  // Subscribe visualizer to logger events
  const originalRecord = pipelineLogger.record.bind(pipelineLogger);
  pipelineLogger.record = function(...args) {
    originalRecord(...args);
    const events = pipelineLogger.getEvents();
    if (events.length > 0) {
      visualizer.update(events[events.length - 1]);
    }
  };

  configureGlobalLogger(pipelineLogger);

  // Display logs in UI
  function updateLogDisplay() {
    const events = pipelineLogger.getEvents();
    logEl.innerHTML = '';
    events.slice(-500).forEach(ev => {
      const div = document.createElement('div');
      div.style.padding = '2px 0';
      div.style.fontSize = '12px';
      div.style.fontFamily = 'ui-monospace, monospace';
      div.innerHTML = `<span style="color: #999;">[${ev.timestamp.toFixed(1)}ms]</span> <span style="color: #666;">[${ev.type}]</span> <strong>${ev.module}</strong>: ${ev.message}`;
      if (ev.data) {
        const pre = document.createElement('pre');
        pre.style.margin = '2px 0 2px 20px';
        pre.style.fontSize = '11px';
        pre.style.color = '#444';
        pre.textContent = JSON.stringify(ev.data, null, 2).slice(0, 200);
        div.appendChild(pre);
      }
      logEl.appendChild(div);
    });
    logEl.scrollTop = logEl.scrollHeight;
  }

  // Update log display periodically
  setInterval(updateLogDisplay, 100);

  // Reduced motion flag (propagate to CSS/host as needed)
  reduced.addEventListener('change', () => {
    document.documentElement.dataset.reduced = reduced.checked ? '1' : '';
  });

  // Hook into pipeline events via custom events
  document.addEventListener('mindtype:activeRegion', ((e: CustomEvent<{ start: number; end: number }>) => {
    pipelineLogger.logActiveRegion(e.detail, ta.selectionStart || 0, (globalThis as any).__mtLastLMSelection?.frontier || 0);
  }) as EventListener);

  // Boot pipeline
  let pipeline: any | null = null;
  try {
    const api = (await import('../../index.ts')).boot;
    pipeline = api({ toneEnabled: false, toneTarget: 'None' });
    
    // Intercept pipeline methods for logging
    const originalIngest = pipeline.ingest.bind(pipeline);
    pipeline.ingest = (text: string, caret: number, atMs?: number) => {
      pipelineLogger.logTypingEvent(text, caret, atMs || Date.now());
      return originalIngest(text, caret, atMs);
    };

    // Hook into monitor for additional events
    if (pipeline.monitor) {
      const unsubscribe = pipeline.monitor.on((ev: any) => {
        pipelineLogger.record('typing', 'typingMonitor', 'Event emitted', {
          caret: ev.caret,
          textLength: ev.text.length,
          timestamp: ev.atMs,
        });
      });
      // Keep reference for cleanup if needed
      (pipeline as any)._unsubscribeMonitor = unsubscribe;
    }

    pipeline.start();
  } catch (e) {
    console.warn('Failed to boot pipeline in lab:', e);
  }

  // Ingest typing
  ta.addEventListener('input', () => {
    if (!pipeline) return;
    const caret = ta.selectionStart ?? ta.value.length;
    const atMs = Date.now();
    
    // Log typing event
    pipelineLogger.logTypingEvent(ta.value, caret, atMs);
    
    // Ingest into pipeline
    pipeline.ingest(ta.value, caret, atMs);
  });

  // Export logs
  exportBtn.addEventListener('click', () => {
    const json = pipelineLogger.exportJSON();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mindflow-web-lab-logs-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  });

  resetBtn.addEventListener('click', () => {
    ta.value = '';
    ta.focus();
    logEl.innerHTML = '';
    pipelineLogger.clear();
    visualizer.update({
      id: 'reset',
      timestamp: performance.now(),
      type: 'sweep',
      module: 'lab',
      message: 'Reset',
    });
  });
}

main();


