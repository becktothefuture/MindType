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

### The Quiet Superpower for Writing

MindTyper turns messy, mid‑stream typing into clean, confident prose — in real time, on your device, and on your side. No flashing toolbars. No patronizing pop‑ups. Just your words, tidied and clarified as you go.

### What it feels like

- Invisible until it helps. You type. When you pause, small corrections land behind the caret — never where you’re actively writing.
- Calm, not cute. Minimal highlights. No dopamine tricks. Respect for your focus and your preferences, including reduced motion.
- Yours, not ours. Your text never leaves your device. Secure fields are off‑limits. Offline works fine.

### Who it’s for

- Writers and knowledge workers who value flow over fiddling.
- Non‑native speakers who want clarity without losing their voice.
- Anyone who wants fewer typos and cleaner sentences — without changing how they write.

### What it does (and what it won’t)

- Proposes tiny, reversible edits just behind your cursor (the “tidy sweep”).
- Backfills consistency when you’re idle — punctuation, capitalization, names.
- Groups fixes into a single undo step so you stay in control.
- Honors system accessibility settings; keeps visuals subtle.
- Won’t nag, won’t second‑guess, won’t touch secure fields, and won’t send your words to the cloud.

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
- Gentle highlights: A soft two‑word glow shows what changed, then fades.
- Undo grouping: One command to revert a whole sweep, not death‑by‑undo.
- System‑wide mindset: Designed to feel native across apps and editors.

### The vibe (by design)

- Swiss‑grid restraint: clean lines, no clutter, purpose over ornament.
- Cyber‑punk practical: high‑performance, local, resilient. Tools, not toys.
- Calm technology: respects attention; blends into your workflow.

### A note to skeptics

You’re right to question magic. So here’s the contract:

- If latency exceeds budget, we degrade gracefully and do less.
- If confidence is low, we do nothing.
- If you undo, we learn — and we make that one action easy.
- If a field is sensitive or an IME is active, we stand down.

No mystery, no hand‑waving. You can inspect the checks, the tests, and the rules behind every decision. The point isn’t to impress you — it’s to disappear while you work.

### Roadmap at a glance

- On‑device model path (Core ML) with the same safety rules.
- WebAssembly packaging of the Rust core for browser demos.
- Expanded consistency rules that remain reversible and subtle.

### Try it

Start typing. Pause. Watch tiny edits settle behind the caret. Then keep writing.

If it ever feels opinionated instead of helpful, tell us — or turn it off. Your writing, your rules.
