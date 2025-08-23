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

## Purpose (a new way to type)

- Type forward; the line behind you gets better. That’s the shift.
- Fewer micro‑stops, more finished thoughts. Your voice, just clearer.
- Help lives where you write—quiet, instant, and private on your device.

## Brand claim (primary)

- Type forward. The line behind you gets better.

## Pitch (three lengths)

### Short

- A calm writing companion that improves the last few words you typed— as you type—without getting in the way.

### Medium

- MindTyper makes typing feel like thinking. While you move forward, it quietly improves the line just behind your cursor so your thoughts land cleanly—fewer typos, tidier sentences, calmer edits. No pop‑ups, no tab‑hopping, and your text stays on your device.

### Long

- MindTyper removes human–computer friction so your attention stays on the idea. It keeps a short strip of text behind your cursor “active,” gently cleaning and clarifying it while you type. Older text is safe; nothing jumps; control is always yours. It works right where you write, keeps your text on your device, and adapts to your computer so it always feels smooth.

## Main selling points

- Stay in flow: fewer stops, more momentum.
- Clearer text, same voice.
- No pop‑ups, no switching apps.
- Private by default (on‑device).
- Works wherever you type.

## How it works (plain)

- We keep a tiny area behind your cursor active; only it can change.
- Small, on‑device models and rules make light, reversible edits.
- No interruptions—just type forward.

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

## Brand claim (technical variant)

- The on‑device, real‑time human–computer writing aid that turns messy typing into clear text.

## Product descriptions (technical)

### Short

- Real‑time, on‑device refinement of the text just behind your caret—no pop‑ups, no slowdown.

### Medium

- MindTyper is a live human–computer interaction utility for text. As you
  type, a small active region just behind your cursor receives
  streaming, on‑device improvements—grammar, clarity, tone—without
  interrupts or mode switches. It’s reversible, private by default, and
  tuned to your hardware for a calm, coherent writing loop.

### Long

- MindTyper eliminates human–computer friction so you can think at full
  bandwidth. It pairs your forward intent with a constrained, on‑device
  model that edits only where it’s safe: a short, visible active region
  behind the caret. A Rust‑first core orchestrates streaming merges with
  confidence gating, reversible rollbacks, and newline‑safe ranges, so
  layout never jumps and rhythm never breaks. Hosts (web, macOS,
  Windows) render understated cues from events like `mindtyper:activeRegion`
  and `highlight`, while device‑tier policies adapt cadence and token
  budgets across WebGPU, WASM, or CPU. The result is a live, closed‑loop
  writing aid: you move forward; MindTyper quietly lifts the text behind
  you.

## Glossary (plain words)

- Human–computer interaction: how you and your computer work together while you type.
- Noise to signal: turning messy, half‑formed words into clear, readable sentences.

## Words to avoid in public copy

- HMI/HCI, SNR, tokens, WebGPU/WASM/ABI (use “on‑device” and “adapts to your computer”).

## Positioning (Noise → Signal, HMI)

- Human‑machine interaction utility that turns typing into a closed‑loop
  system: human intent in, on‑device signal out.

## Audiences and why they care

- Writers & knowledge workers: stay in flow; get clarity without context
  switching.
- Engineers & technical users: on‑device by default, deterministic
  merges, privacy, and portable APIs.
- Executives & operators: more signal per minute—cleaner docs, fewer
  revisions, calmer teams.
- Students & learners: immediate guidance that preserves your voice; less
  second‑guessing.
- Neurodiverse users: fewer micro‑interruptions; reduced working‑memory
  tax; smoother momentum.
- Security‑sensitive orgs: no text leaves the machine unless explicitly
  opted‑in.

## The three whys (asked backwards)

1. Why MindTyper? To remove typing friction so progress feels
   continuous.
2. Why remove friction? To protect attention and working memory—the
   scarce resource.
3. Why protect attention? Because better attention yields better
   thinking, which compounds into clearer communication and better
   outcomes.

## Skeptic’s FAQ (convince the cynic)

- Isn’t this just autocorrect? No—suggestions stream into a bounded
  active region; semantics first, no modal jumps.
- Will it slow me down? No—device‑tier policies keep cadence smooth;
  edits wait behind you, never ahead of you.
- What about privacy? On‑device by default; remote models require
  explicit, per‑session opt‑in.
- Will it change my voice? You set intensity and domains; the system
  favors clarity over style unless asked.
- Why not Grammarly? Different goal: MindTyper is live HMI for thinking
  while typing, not a post‑hoc checker.

## Reasons to believe (proof points)

- On‑device LM path with Transformers.js; Rust orchestrator; no outbound
  text by default.
- Active‑region constraint: safe, newline‑aware ranges prevent layout
  shifts and surprises.
- Confidence gating + rollback: merges are reversible the instant you
  need control.
- Portable interfaces: C/WASM ABI for native hosts; events for web;
  consistent feel across devices.

## Micro‑taglines

- Noise → Signal
- Type forward
- Live writing loop
- Flow, not friction
- Real‑time text clarity
