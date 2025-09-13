### The Quiet Superpower for Writing

Mind::Type is a smart typing layer that quietly fixes mistakes and smooths your words as you write — for anyone who types, especially neurodivergent thinkers, who want a faster, more natural way to express themselves. It turns noisy keystrokes into clean, well‑formed sentences that still sound like you, without getting in the way.

### What it feels like

- Invisible until it helps. You type. A subtle active region trails your cursor, quietly diffusing noisy input into clean text word‑by‑word behind the caret. When you pause, the region catches up — never touching where you’re actively writing.
- Calm, not cute. Mechanical swap only (optional braille marker ⠿). No highlights/underlines. Respect for your focus and your preferences, including reduced motion (instant swap).
- Yours, not ours. Your text never leaves your device. Secure fields are off‑limits. Offline works fine. When remote is used, it’s encrypted and explicitly opted‑in.

### Who it’s for

- Writers and knowledge workers who value flow over fiddling.
- Non‑native speakers who want clarity without losing their voice.
- Anyone who wants fewer typos and cleaner sentences — without changing how they write.

### What it does (and what it won’t)

- Proposes tiny, reversible edits just behind your cursor (the “tidy sweep”).
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
- Tidy Sweep: A forward pass that fixes small errors within a short window.
- Backfill Consistency: A reverse pass that polishes with context when you pause.
- Local Intelligence: Small on‑device language models handle semantic and grammatical corrections, falling back gracefully to rule‑based fixes. No cloud by default, no data retention, no latency spikes. Optional remote runs via encrypted channels with explicit opt‑in. First target: Qwen2.5‑0.5B‑Instruct via Transformers.js with q4 quantization and WebGPU acceleration (privacy‑preserving, fast, text‑centric).
- Gentle visuals: Mechanical swap only with an optional braille‑like marker at swap sites; announce once per batch via screen reader when enabled. Honors reduced‑motion with instant swaps.
- Undo grouping: One command to revert a whole sweep, not death‑by‑undo.
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
- Visual testing ground: live controls for timing, active region size (3–8 words), and correction aggressiveness, so we can tune the feel together.
- Confidence‑gated intelligence: when unsure, it does nothing; when certain, it draws in the correction with a subtle shimmer.

### Roadmap at a glance

- TypeScript streaming pipeline (today) with planned on‑device model via Transformers.js (Qwen2.5‑0.5B‑Instruct, q4) under the same safety rules.
- Web demo “Flow State” playground with real‑time controls and metrics; reduced‑motion compliance.
- WebAssembly packaging of the Rust core (later) for shared algorithms and performance portability.
- Expanded consistency rules that remain reversible and subtle.

### Try it

Start typing. Pause. Watch tiny edits settle behind the caret. Then keep writing.

If it ever feels opinionated instead of helpful, tell us — or turn it off. Your writing, your rules.
