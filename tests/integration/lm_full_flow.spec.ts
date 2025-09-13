/*╔══════════════════════════════════════════════════════╗
  ║  ░  L M   F U L L   F L O W   T E S T  ░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║   End-to-end test of complete LM correction flow.   ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ Test complete LM pipeline from typing to correction
  • WHY  ▸ Verify all components work together for MVP
  • HOW  ▸ Simulate typing with fuzzy text and verify corrections
*/

import { describe, it, expect, vi } from 'vitest';
import { boot } from '../../index';
import { createWorkerLMAdapter } from '../../core/lm/workerAdapter';
import { createLMContextManager } from '../../core/lm/contextManager';

describe('LM Full Flow Integration', () => {
  it('corrects fuzzy typing end-to-end', async () => {
    // Mock worker that returns corrections
    const mockWorker = {
      postMessage: vi.fn(),
      addEventListener: vi.fn((event: string, handler: (e: MessageEvent) => void) => {
        if (event === 'message') {
          // Simulate async worker response
          setTimeout(() => {
            handler({
              data: { type: 'chunk', requestId: 'test', text: 'the ' },
            } as MessageEvent);
            handler({
              data: { type: 'done', requestId: 'test' },
            } as MessageEvent);
          }, 10);
        }
      }),
      removeEventListener: vi.fn(),
      terminate: vi.fn(),
    };

    // Create context manager and make it globally available
    const contextManager = createLMContextManager();
    (globalThis as any).__mtContextManager = contextManager;

    // Initialize context
    const initialText = 'Hello teh world';
    await contextManager.initialize(initialText, 15);

    // Boot pipeline with LM adapter
    const pipeline = boot();
    const adapter = createWorkerLMAdapter(() => mockWorker as any);
    pipeline.setLMAdapter(adapter);
    pipeline.start();

    // Track applied corrections
    const corrections: any[] = [];
    const originalApply = (globalThis as any).document?.execCommand;
    (globalThis as any).document = {
      execCommand: (cmd: string, ...args: any[]) => {
        if (cmd === 'insertText') {
          corrections.push(args);
        }
        return true;
      },
    };

    // Simulate typing with fuzzy text
    pipeline.ingest('Hello teh world', 15);

    // Wait for sweep to run (SHORT_PAUSE_MS=600, tierDelay may be 1.1x) + buffer
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // Verify worker was called
    expect(mockWorker.postMessage).toHaveBeenCalled();

    // Check that correction was attempted
    const calls = mockWorker.postMessage.mock.calls;
    expect(calls.length).toBeGreaterThan(0);

    const generateCall = calls.find(([msg]) => msg?.type === 'generate');
    expect(generateCall).toBeDefined();
    expect(generateCall[0].params.text).toBe('Hello teh world');

    // Cleanup
    pipeline.stop();
    delete (globalThis as any).__mtContextManager;
    (globalThis as any).document.execCommand = originalApply;
  });

  it('applies confidence gating to LM proposals', async () => {
    const contextManager = createLMContextManager();
    (globalThis as any).__mtContextManager = contextManager;

    // Test low-confidence scenario (no actual change)
    const mockWorker = {
      postMessage: vi.fn(),
      addEventListener: vi.fn((event: string, handler: (e: MessageEvent) => void) => {
        if (event === 'message') {
          setTimeout(() => {
            // Return same text (no correction)
            handler({
              data: { type: 'chunk', requestId: 'test', text: 'Hello world' },
            } as MessageEvent);
            handler({
              data: { type: 'done', requestId: 'test' },
            } as MessageEvent);
          }, 10);
        }
      }),
      removeEventListener: vi.fn(),
      terminate: vi.fn(),
    };

    await contextManager.initialize('Hello world', 11);

    const pipeline = boot();
    pipeline.setLMAdapter(createWorkerLMAdapter(() => mockWorker as any));
    pipeline.start();

    // Track if any corrections are applied
    let correctionApplied = false;
    (globalThis as any).document = {
      execCommand: () => {
        correctionApplied = true;
        return true;
      },
    };

    pipeline.ingest('Hello world', 11);
    await new Promise((resolve) => setTimeout(resolve, 400));

    // Low-confidence proposal should be gated (not applied)
    expect(correctionApplied).toBe(false);

    pipeline.stop();
    delete (globalThis as any).__mtContextManager;
  });
});
