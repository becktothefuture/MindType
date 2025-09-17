<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  M I N D T Y P E R   M A N I F E S T O  ░░░░░░░░░  ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║           ╌╌  P L A C E  H O L D E R  ╌╌             ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
    • WHAT ▸ Product narrative: vision, feel, and proof points
    • WHY  ▸ Inspire non‑technical readers; convince skeptics
    • HOW  ▸ Story first, with measurable, verifiable claims
-->

### The Revolutionary Cognitive Augmentation Tool

**MindType transforms typing from a mechanical skill into fluid expression of thought.** Through our revolutionary **Correction Marker** system and **Burst-Pause-Correct** methodology, users achieve **thought-speed typing** with unprecedented accuracy and flow state preservation.

The **Correction Marker**—an intelligent visual worker that travels through text—represents a breakthrough in human-computer collaboration, enabling everything from PhD students with dyslexia to former stenographers to unlock typing speeds previously impossible.

### What it feels like

- **Revolutionary Visual Experience**: The **Correction Marker** pulses with hypnotic braille animation (⠂ → ⠄ → ⠆ → ⠠ → ⠢ → ⠤ → ⠦ → ⠰ → ⠲ → ⠴ → ⠶) during **Listening Mode**, then transforms into an intelligent worker that travels through text during **Correction Mode**.
- **Burst-Pause-Correct Rhythm**: Natural typing rhythm where rapid bursts trigger the marker to hold position, then travel and correct during natural pauses—training muscle memory for optimal flow.
- **Thought-Speed Typing**: Experience cognitive augmentation where the boundary between human intention and digital execution dissolves into pure creative flow.
- **Seven Revolutionary Scenarios**: From academic excellence to speed mastery to data analysis—each scenario unlocks previously impossible typing capabilities.
- **Privacy-First Architecture**: Your text never leaves your device. Secure fields are off‑limits. On-device processing with optional encrypted remote.

### Who it's for (Seven Revolutionary Scenarios)

- **Academic Excellence**: PhD students with dyslexia achieving 50% faster writing with scientific terminology support
- **Multilingual Mastery**: Business analysts creating documents 40% faster across languages with cross-linguistic error detection
- **Accessibility Champions**: Visually impaired researchers experiencing 60% fewer interruptions with silent corrections
- **Creative Flow States**: Novelists increasing daily word count by 35% with stream-of-consciousness typing support
- **Professional Polish**: Working parents achieving 90% professional tone automatically in stolen typing moments
- **Speed Demons**: Former stenographers unlocking 180+ WPM on standard keyboards through Velocity Mode
- **Data Whisperers**: Analysts processing data 5× faster with custom dialect understanding and intelligent formatting

### What it does (and what it won’t)

- Proposes tiny, reversible edits just behind your cursor (NoiseWorker).
- Backfills consistency across stable zones — punctuation, capitalization, names.
- Groups fixes into a single undo step so you stay in control.
- Honors system accessibility settings; keeps visuals subtle.
- Won’t nag, won’t second‑guess, won’t touch secure fields, and won’t send your words to the cloud without explicit opt‑in.

### Why believe it

- Performance targets: p95 ≤ 15 ms on modern Macs; ≤ 30 ms on older Intel. Typical memory ≤ 150 MB, cap ≤ 200 MB.
- Safety guarantees: Never edits at or after the caret. Returns “no change” when unsure. All edits are reversible in one undo.
- Privacy by design: 100% on‑device. Secure fields disabled. IME composition respected.
- Quality gates in the open: Lint, format, tests, and Rust checks run in CI on every change.
- Traceable requirements: Product rules map to tests and acceptance scenarios.

### Signature features

- Caret‑safe diffs: Edits happen only in the stable zone behind your cursor.
- NoiseWorker: A forward pass that fixes small errors within a short window.
- Backfill Consistency: A reverse pass that polishes with context when you pause.
- Local Intelligence: Small on‑device language models handle semantic and grammatical corrections, falling back gracefully to rule‑based fixes. No cloud by default, no data retention, no latency spikes. Optional remote runs via encrypted channels with explicit opt‑in. First target: Qwen2.5‑0.5B‑Instruct via Transformers.js with q4 quantization and WebGPU acceleration (privacy‑preserving, fast, text‑centric).
- Gentle visuals: Mechanical swap only with an optional braille‑like marker at swap sites; announce once per batch via screen reader when enabled. Honors reduced‑motion with instant swaps.
- Undo grouping: One command to revert a whole correction cycle, not death‑by‑undo.
- System‑wide mindset: Designed to feel native across apps and editors.

### The vibe (by design)

- Swiss‑grid restraint: clean lines, no clutter, purpose over ornament.
- Cyber‑punk practical: high‑performance, local, resilient. On-device intelligence that never phones home. Tools, not toys.
- Calm technology: respects attention; blends into your workflow.

### A note to skeptics

You’re right to question magic. So here’s the contract:

- If latency exceeds budget, we degrade gracefully and do less.
- If confidence is low, we do nothing.
- If you undo, we learn — and we make that one action easy.
- If a field is sensitive or an IME is active, we stand down.

No mystery, no hand‑waving. You can inspect the checks, the tests, and the rules behind every decision. The point isn’t to impress you — it’s to disappear while you work.

### The promise (near‑term)

- Backspace‑less flow: your thoughts land as you intend, while tiny fixes settle quietly behind you.
- Visual testing ground: live controls for timing, active region size (up to 20 words), and correction aggressiveness, so we can tune the feel together.
- Confidence‑gated intelligence: when unsure, it does nothing; when certain, it draws in the correction with a subtle shimmer.

### Roadmap at a glance

- TypeScript streaming pipeline (today) with planned on‑device model via Transformers.js (Qwen2.5‑0.5B‑Instruct, q4) under the same safety rules.
- Web demo “Flow State” playground with real‑time controls and metrics; reduced‑motion compliance.
- WebAssembly packaging of the Rust core (later) for shared algorithms and performance portability.
- Expanded consistency rules that remain reversible and subtle.

### Try it

Start typing. Pause. Watch tiny edits settle behind the caret. Then keep writing.

If it ever feels opinionated instead of helpful, tell us — or turn it off. Your writing, your rules.

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:45:45Z -->
