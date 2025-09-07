<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  L M   T R O U B L E S H O O T I N G  ░░░░░░░░░░░  ║
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
    • WHAT ▸ Comprehensive troubleshooting guide for LM functionality
    • WHY  ▸ Help users diagnose and fix common LM issues quickly
    • HOW  ▸ Symptom-based diagnosis with step-by-step solutions
-->

# LM Troubleshooting Guide

This guide helps diagnose and fix common issues with the Language Model (LM) functionality in MindType.

## Quick Diagnostic Checklist

Before diving into specific issues, check these basics:

- [ ] **Click-to-Activate**: Have you clicked or focused on the text area?
- [ ] **Browser Console**: Are there any error messages in the console?
- [ ] **Workbench LM Tab**: What does the LM status show?
- [ ] **Network Tab**: Are there any failed network requests?
- [ ] **Text Input**: Have you typed text with errors to correct?

## Common Issues and Solutions

### 1. LM Not Initializing

**Symptoms:**
- Workbench LM tab shows "Context: 🔴 Not initialized"
- No LM-related console messages
- Text corrections not happening

**Diagnosis Steps:**
1. Open browser console (F12)
2. Look for `[LOG LM] enabled: worker` message
3. Check for `[LOG LM] Initializing LM context on focus` when clicking text area

**Solutions:**

#### Solution A: Click-to-Activate Not Triggered
```javascript
// In browser console, check if context manager exists:
console.log('Context Manager:', (globalThis as any).__mtContextManager);
```

**Fix:** Click or focus on the main text area to trigger initialization.

#### Solution B: Context Manager Not Created
**Check:** Look for errors during context manager creation.
**Fix:** Refresh the page and check for JavaScript errors during load.

### 2. Worker Creation Failures

**Symptoms:**
- Console error: "Failed to create worker"
- Workbench shows "Worker: 🔴 Inactive"
- LM processing never starts

**Diagnosis Steps:**
1. Check browser console for worker-related errors
2. Look for `[WorkerAdapter]` prefixed messages
3. Check if Web Workers are supported: `typeof Worker !== 'undefined'`

**Solutions:**

#### Solution A: Browser Compatibility
```javascript
// Check Web Worker support
if (typeof Worker === 'undefined') {
  console.error('Web Workers not supported in this browser');
}
```

**Fix:** Use a modern browser that supports Web Workers (Chrome 4+, Firefox 3.5+, Safari 4+).

#### Solution B: Worker Script Loading Issues
**Check:** Network tab for failed worker script requests.
**Fix:** Ensure the worker script is accessible and CORS is properly configured.

### 3. WASM Loading Issues

**Symptoms:**
- Console error: "ort-wasm-simd-threaded.jsep.mjs not found"
- Network errors for WASM files
- LM worker fails to initialize

**Diagnosis Steps:**
1. Check Network tab for failed WASM requests
2. Look for CORS errors
3. Check if CDN is accessible

**Solutions:**

#### Solution A: CDN Access Issues
```javascript
// Test CDN accessibility
fetch('https://cdn.jsdelivr.net/npm/onnxruntime-web@1.19.2/dist/ort-wasm-simd-threaded.jsep.mjs')
  .then(r => console.log('CDN accessible:', r.ok))
  .catch(e => console.error('CDN blocked:', e));
```

**Fix:** If CDN is blocked, use local WASM files:
1. Copy WASM files to `web-demo/public/wasm/`
2. Set `MT_LM_AVAILABLE=local` environment variable

#### Solution B: MIME Type Issues
**Check:** Server serves `.wasm` files with correct MIME type.
**Fix:** Configure server to serve `.wasm` files as `application/wasm`.

### 4. Context Transformer Not Processing

**Symptoms:**
- No `[ContextTransformer] Function called` messages
- Text changes but no LM corrections
- LM runs: 0 in workbench

**Diagnosis Steps:**
1. Check if context transformer receives LM adapter
2. Look for sweep scheduler messages
3. Verify context manager is globally available

**Solutions:**

#### Solution A: Missing LM Adapter Integration
```javascript
// Check if LM adapter is available
console.log('LM Adapter available:', typeof getLMAdapter === 'function');
```

**Fix:** Ensure `getLMAdapter` is properly configured in the application.

#### Solution B: Context Manager Not Global
```javascript
// Check global context manager
console.log('Global Context Manager:', (globalThis as any).__mtContextManager);
```

**Fix:** Ensure context manager is exposed globally in `App.tsx`.

### 5. Proposal Validation Failures

**Symptoms:**
- Console message: "LM proposal rejected by validation"
- LM generates output but corrections not applied
- Context output appears but doesn't update text

**Diagnosis Steps:**
1. Check validation logs in console
2. Look for length change warnings
3. Verify proposal content

**Solutions:**

#### Solution A: Length Change Too Large
**Issue:** Proposal changes text length by >50%.
**Fix:** This is expected behavior to prevent hallucination. Try shorter text spans.

#### Solution B: Empty Proposals
**Issue:** LM returns empty text for non-empty spans.
**Fix:** Check LM model performance or try different prompts.

### 6. Performance Issues

**Symptoms:**
- Slow LM responses (>10 seconds)
- Browser becomes unresponsive
- High memory usage

**Diagnosis Steps:**
1. Check Performance tab in browser dev tools
2. Monitor memory usage in Task Manager
3. Look for backend degradation messages

**Solutions:**

#### Solution A: Backend Degradation
```javascript
// Check current backend
console.log('LM Backend:', /* check workbench LM tab */);
```

**Fix:** 
- WebGPU → WASM → CPU degradation is automatic
- Reduce context window size (2-3 sentences instead of 4-5)
- Use shorter text documents

#### Solution B: Memory Issues
**Fix:**
- Refresh the page to clear memory
- Close other browser tabs
- Use a device with more RAM

### 7. Network and Connectivity Issues

**Symptoms:**
- Intermittent LM failures
- Timeout errors after 30 seconds
- CDN loading failures

**Diagnosis Steps:**
1. Check network connectivity
2. Test CDN accessibility
3. Look for timeout messages

**Solutions:**

#### Solution A: Network Timeouts
**Fix:** 
- Check internet connection
- Try refreshing the page
- Use local WASM files if CDN is unreliable

#### Solution B: Firewall/Proxy Issues
**Fix:**
- Configure firewall to allow CDN access
- Use local assets in corporate environments

## Advanced Debugging

### Browser Developer Tools

#### Console Commands
```javascript
// Check LM system status
console.log('LM Context Manager:', (globalThis as any).__mtContextManager);
console.log('Worker Support:', typeof Worker !== 'undefined');

// Test context initialization
const cm = (globalThis as any).__mtContextManager;
if (cm) {
  console.log('Initialized:', cm.isInitialized());
  console.log('Context Window:', cm.getContextWindow());
}

// Monitor worker messages
// (Check Network tab for worker script loading)
```

#### Performance Profiling
1. Open Performance tab in dev tools
2. Start recording
3. Type text to trigger LM processing
4. Stop recording and analyze worker thread activity

#### Memory Analysis
1. Open Memory tab in dev tools
2. Take heap snapshot before and after LM usage
3. Look for memory leaks in worker or context manager

### Log Analysis

#### Key Log Prefixes
- `[LOG LM]`: General LM system messages
- `[lm.context]`: Context manager operations
- `[ContextTransformer]`: LM integration in transformer pipeline
- `[WorkerAdapter]`: Worker communication and errors

#### Important Messages to Look For
```
✅ Good:
[LOG LM] enabled: worker
[LOG LM] Initializing LM context on focus
[lm.context] [ContextManager] Initialization complete
[ContextTransformer] LM processing with dual-context

❌ Problems:
[WorkerAdapter] Worker creation failed
[ContextTransformer] LM processing failed
[lm.context] Proposal rejected by validation
```

## Environment-Specific Issues

### Development Environment
- Ensure dev server is running on correct port
- Check for hot reload issues affecting worker
- Verify source maps for debugging

### Production Environment
- Check asset paths and CDN configuration
- Verify CORS headers for worker scripts
- Test with minified code

### CI/CD Environment
- Use `MT_LM_AVAILABLE=false` to skip LM tests
- Ensure WASM files are included in build artifacts
- Test with headless browsers

## Performance Optimization

### Context Window Tuning
- Start with 2-3 sentences per side
- Increase only if corrections are too narrow
- Monitor token count in workbench

### Document Size Limits
- Wide context truncated to 2000 characters for performance
- Consider document chunking for very large texts
- Monitor memory usage with large documents

### Backend Selection
- WebGPU: Best performance, requires modern GPU
- WASM: Good performance, broader compatibility
- CPU: Fallback option, slower but universal

## Getting Help

### Information to Collect
When reporting LM issues, include:

1. **Browser and Version**: Chrome 120, Firefox 115, etc.
2. **Console Logs**: Copy relevant error messages
3. **Workbench Status**: Screenshot of LM tab
4. **Network Tab**: Any failed requests
5. **Reproduction Steps**: Exact steps to reproduce the issue
6. **Text Sample**: The text that's not being corrected (if safe to share)

### Useful Console Commands
```javascript
// System information
console.log('Browser:', navigator.userAgent);
console.log('WebGPU Support:', navigator.gpu !== undefined);
console.log('WASM Support:', typeof WebAssembly !== 'undefined');

// LM system status
const cm = (globalThis as any).__mtContextManager;
console.log('Context Manager Status:', {
  exists: !!cm,
  initialized: cm?.isInitialized(),
  contextWindow: cm?.getContextWindow()
});
```

### Common Solutions Summary

| Issue | Quick Fix |
|-------|-----------|
| LM not initializing | Click on text area |
| Worker not starting | Refresh page, check console |
| WASM loading fails | Check network, use local files |
| No corrections | Verify text has errors, check validation |
| Slow performance | Reduce context window, check backend |
| Memory issues | Refresh page, close other tabs |

This troubleshooting guide covers the most common LM issues. For additional help, check the browser console logs and workbench status for specific error messages.
