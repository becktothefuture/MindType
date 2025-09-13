<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  E 2 E   T E S T I N G   G U I D E  ░░░░░░░░░░░░░  ║
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
    • WHAT ▸ Complete guide for running Playwright e2e tests
    • WHY  ▸ Ensure consistent testing across demos and web-demo
    • HOW  ▸ DEMO_URL patterns, setup, and test execution
-->

# E2E Testing with Playwright 🎭

This directory contains end-to-end tests for MindTyper using Playwright. Tests cover both the main web-demo application and standalone HTML demos.

## Quick Start

```bash
# Install dependencies
cd e2e
pnpm install

# Run all tests (starts web-demo automatically)
pnpm test

# Run tests in headed mode (see browser)
pnpm playwright test --headed

# Run specific test file
pnpm playwright test tests/smoke.spec.ts

# Debug mode (step through tests)
pnpm playwright test --debug
```

## Test Structure

### Web Demo Tests
Tests that run against the main React application at `http://localhost:5173`:
- `web-demo-tone-controls.spec.ts` - Tone transformer controls
- `smoke.spec.ts` - Basic functionality smoke tests
- `caret-status.spec.ts` - Caret monitoring and status
- `v2.spec.ts` - Version 2 specific features

### Standalone Demo Tests
Tests that run against static HTML demos using `DEMO_URL` pattern:
- `demo-band-swap.spec.ts` - Band swap animation demo

## DEMO_URL Pattern 🔗

For standalone HTML demos, use this pattern to construct file URLs:

```typescript
import path from 'path';
import { pathToFileURL } from 'url';

// Point to demo directory relative to test file
const demoPath = path.resolve(__dirname, '..', '..', '..', 'demo', 'band-swap', 'index.html');
const DEMO_URL = pathToFileURL(demoPath).href;

test('demo functionality', async ({ page }) => {
  await page.goto(DEMO_URL);
  // Test demo-specific functionality...
});
```

### Available Demo URLs

Current standalone demos available for testing:

| Demo | Path | Purpose |
|------|------|---------|
| Band Swap | `demo/band-swap/index.html` | Visual band animation and noise rendering |
| Braille Animation | `demo/mt-braille-animation-v1/index.html` | Braille character animations |
| Scroll Animation | `demo/mt-scroll-anim-v1/index.html` | Scroll-based animations with controls |

## Configuration

### Playwright Config (`playwright.config.ts`)

Key settings:
- **Base URL**: `http://localhost:5173` (web-demo)
- **Browsers**: Chromium, WebKit (Safari)
- **Parallel**: Enabled for faster execution
- **Retries**: 2 on CI, 0 locally
- **Timeouts**: 5s actions, 10s navigation
- **Auto-start**: Web-demo server on port 5173

### Environment Variables

```bash
# Run in CI mode (affects retries, parallel workers)
CI=true pnpm test

# Custom demo URL (override default localhost)
DEMO_URL=http://custom-host:8080 pnpm test
```

## Writing Tests

### Web Demo Test Template

```typescript
import { test, expect } from '@playwright/test';

test('feature description', async ({ page }) => {
  // Navigate to web-demo (baseURL is set)
  await page.goto('/');
  
  // Test web-demo React components
  const control = page.locator('[data-testid="tone-control"]');
  await expect(control).toBeVisible();
});
```

### Standalone Demo Test Template

```typescript
import { test, expect } from '@playwright/test';
import path from 'path';
import { pathToFileURL } from 'url';

const demoPath = path.resolve(__dirname, '..', '..', '..', 'demo', 'your-demo', 'index.html');
const DEMO_URL = pathToFileURL(demoPath).href;

test('demo feature', async ({ page }) => {
  await page.goto(DEMO_URL);
  
  // Test demo-specific functionality
  const element = page.locator('#demo-element');
  await expect(element).toBeVisible();
});
```

## Common Patterns

### Waiting for Animations
```typescript
// Wait for animation frame updates
await page.waitForTimeout(120);

// Wait for specific element state
await expect(element).toBeVisible({ timeout: 5000 });
```

### Testing Canvas/Animation
```typescript
// Get bounding box for layout stability
const rect1 = await element.boundingBox();
await page.waitForTimeout(150);
const rect2 = await element.boundingBox();

expect(rect1?.width).toBeGreaterThan(0);
expect(rect2?.width).toBeCloseTo(rect1!.width!, 0);
```

### Accessing Window Objects
```typescript
// Evaluate JavaScript in page context
const result = await page.evaluate(() => window.yourGlobal?.method?.());
```

## Debugging

### Visual Debugging
```bash
# See tests run in browser
pnpm playwright test --headed

# Slow down execution
pnpm playwright test --headed --slowMo=1000
```

### Debug Mode
```bash
# Step through tests with inspector
pnpm playwright test --debug

# Debug specific test
pnpm playwright test tests/smoke.spec.ts --debug
```

### Trace Viewer
```bash
# Generate traces on failure
pnpm playwright test --trace=on

# View trace files
pnpm playwright show-trace trace.zip
```

## Reports

### HTML Report
```bash
# Generate and open HTML report
pnpm playwright show-report
```

Report includes:
- Test results with screenshots
- Failed test traces
- Performance metrics
- Browser console logs

### CI Integration

Tests run automatically with:
- 2 retries on failure
- Single worker (no parallel)
- HTML reporter for artifacts
- Trace collection on retry

## Troubleshooting

### Common Issues

**Port conflicts:**
```bash
# Kill processes on port 5173
lsof -ti:5173 | xargs kill -9
```

**File URL issues:**
- Ensure demo paths are correct relative to test file
- Use `pathToFileURL()` for cross-platform compatibility

**Timeout errors:**
- Increase timeouts in config for slow systems
- Add explicit waits for dynamic content

**Flaky tests:**
- Add proper waits instead of fixed timeouts
- Use `toBeCloseTo()` for floating-point comparisons
- Check for race conditions in animations

### Getting Help

1. Check test output for specific error messages
2. Use `--headed` mode to see what's happening visually  
3. Add `await page.pause()` to stop execution and inspect
4. Review HTML report for screenshots and traces
5. Consult [Playwright documentation](https://playwright.dev/docs/intro)

## Test Coverage Goals

- ✅ Web-demo core functionality
- ✅ Standalone demo rendering
- ✅ Animation stability
- ⏳ Accessibility features
- ⏳ Performance benchmarks
- ⏳ Cross-browser compatibility
