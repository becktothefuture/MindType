<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  B R A N D   M E S S A G I N G  ░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌                      ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
    • WHAT ▸ Positioning, claims, and plain-language explanations
    • WHY  ▸ Align brand voice with the active-region HMI model
    • HOW  ▸ Progressive explanations; claims in three lengths
-->

## Ten ways to explain MindTyper (beginner → expert)

1. Beginner (what it does)

- MindTyper quietly cleans and improves what you just typed so it reads right, without pop‑ups or pauses.

2. Beginner+ (how it feels)

- It keeps a small area behind your cursor “active” and steadily polishes it while you keep typing.

3. Intermediate (why it's different)

- Instead of interrupting you, it streams fixes into a short active region behind the caret, so your flow never breaks.

4. Intermediate+ (what you see)

- A subtle shimmer shows where the system is refining text—the active region—without jumping lines or modal dialogs.

5. Technical (how it works)

- On‑device language models and rules propose tiny edits; only the active region can change, older text is locked.

6. Technical+ (safety)

- A diffusion controller schedules merges with confidence gating and instant rollback if the caret re‑enters the region.

7. Advanced (algorithms)

- Streaming token suggestions are diffed and applied under a bounded delay; newline‑safe ranges prevent layout shifts.

8. Advanced+ (performance)

- Device‑tier policies (WebGPU / WASM / CPU) tune cadence, token caps, and active‑region size to match your hardware.

9. Expert (architecture)

- A Rust‑first orchestrator exposes a C/WASM ABI; hosts render `mindtyper:activeRegion` and `highlight` events for visuals.

10. Expert+ (signal)

- By constraining edits to near‑field context, it increases text SNR—turning input noise into signal in real time.

## Brand claim (primary)

- Live human‑machine typing utility—on‑device, caret‑safe, noise → signal

## Product descriptions (three lengths)

### Short

- Turn typing noise into signal. MindTyper refines a small active region behind your cursor—on‑device, in real time, without interruptions.

### Medium

- MindTyper is a live human‑machine interaction utility for text. As you type, a short active region behind the caret receives streaming, on‑device improvements—grammar, clarity, and tone—without pop‑ups or broken flow. It’s caret‑safe, reversible, and tuned to your device for smooth, subtle guidance.

### Long

- MindTyper turns typing noise into signal by pairing your intent with a constrained, on‑device model that edits only where it’s safe: a short, visible active region behind the caret. The Rust‑first core orchestrates streaming merges with confidence gating, reversible rollbacks, and newline‑safe ranges, so text never jumps and your rhythm never breaks. Hosts (web, macOS, Windows) render understated cues from events like `mindtyper:activeRegion` and `highlight`, while device‑tier policies adapt cadence and token budgets for consistent feel on WebGPU, WASM, or CPU. The result is a calm, precise writing loop: you type forward; MindTyper quietly raises the signal behind you.
