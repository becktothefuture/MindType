## Overview

The Workbench is a collapsible panel in the web demo for monitoring and testing LM behavior. Access via the 🔧 Workbench button (top-right).

## Tabs

### ▶️ Live

- Stage previews: Buffer, After Noise, After Context, After Tone
- Real-time view of the pipeline transformations
- All outputs have `data-testid` for E2E testing

### 🧠 LM

- Backend info (WebGPU/WASM/CPU)
- Token counts and last latency
- Deterministic mode toggle (rules-only for reproducible tests)

### 📋 Logs

- Last 50 process log entries with timestamps
- Filterable by type (STATUS, LM, etc.)

### 📊 Metrics

- Total LM runs, average latency, token counts
- Export session button (downloads JSON with metrics + logs)

### ✨ Presets

- Quick-load test sentences for validation
- One-click population of main textarea

## Usage

1. Click 🔧 Workbench to open
2. Switch tabs to view different aspects
3. Use Deterministic mode for consistent testing
4. Export sessions for analysis or bug reports

## Testing

- All components have `data-testid` attributes
- Workbench state persists across sessions
- Export includes full context for reproduction
