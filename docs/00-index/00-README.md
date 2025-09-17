<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  M A S T E R   D O C U M E N T  ░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║   The authoritative, newcomer‑friendly entry point.          ║
  ║   Dense in facts, gentle in tone, with links to go deeper.   ║
  ║                                                              ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌                      ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
    • WHAT ▸ Master index + orientation for all documentation
    • WHY  ▸ One source of truth; everything links here and back
    • HOW  ▸ Short sections + cross‑links to deeper, canonical docs
-->

## Start here

- Master Plan & Tasks: see [`02-Implementation.md`](./02-implementation/02-Implementation.md)
- Product Requirements (PRD): see [`01-PRD.md`](./01-prd/01-PRD.md)
- Architecture (C4 + ADRs): see [`04-architecture/`](./04-architecture/), [`05-adr/`](./05-adr/)
- Developer Guides (Diátaxis): see [`06-guides`](./06-guides/)
- Quality & QA (BDD): see [`qa/`](./12-qa/qa/) and scenarios under [`qa/acceptance/`](./12-qa/qa/acceptance/)
- Principles: see [`03-System-Principles.md`](./03-system-principles/03-System-Principles.md)
- Accessibility: see [`08-a11y/`](./08-a11y/)

Tip (for the parents): If you only read two docs to grasp the build, read this page and `implementation.md`. Everything else is linked from those two.

## Folder purposes

- Root (this folder)
  - Canonical top‑level docs and indices: `PRD.md`, `implementation.md`, `system_principles.md`, `project_structure.md`.
  - Versioning policy: `versioning.md`. As of v0.6+, canonical content lives here and under `architecture/`, `guide/`, `qa/`. Any mirrors exist only for export.

- `architecture/`
  - System design and C4 views. Use `README.md` for the overview; `C1-context.md`, `C2-containers.md`, `C3-components.md` for deeper levels. ADRs live separately under `adr/`.

- `adr/`
  - Architectural Decision Records. Each ADR is a permanent, numbered record that links PRD requirements to code paths and consequences.

- `guide/`
  - Developer‑facing guidance using Diátaxis:
    - `how-to/` — step‑by‑step tasks (web demo server, mac app details, etc.)
    - `tutorials/` — learn by doing (try MindType in 5 min)
    - `reference/` — APIs and contracts (active region policy, injector, LM behavior, worker, rust merge, config flags)
    - `explanations/` — deeper rationale (e.g., why caret‑safe diffs)

- `qa/`
  - Quality gates and acceptance (BDD) scenarios; matrix mapping in `qa/README.md`.

- `a11y/`
  - Accessibility standards and checklists.

- `brand/`
  - Brand assets, specs, and guides (visual identity, tone, motion). Not product behavior.
  - See `brand/messaging.md` for the Vision Pitch (MindType) and long‑form messaging.


### Cross‑links (everything ↔ Master)

- Principles ↔ ADRs ↔ Architecture ↔ Guides ↔ QA form a closed loop:
  - Principles set behavior
  - ADRs lock consequential decisions
  - Architecture shows where behavior lives
  - Guides define exact contracts
  - QA verifies behavior continuously

Shortcuts:

- Back to Master (this page): `docs/00-index/00-README.md`
- Master Tasks: [`02-Implementation.md`](./02-implementation/02-Implementation.md)
- What’s New: [`06-guides/whats-new-v0.4.md`](./06-guides/whats-new-v0.4.md)

### Naming note

- Public‑facing name in messaging: “MindType”. Internal code and tests previously used “MindTyper”; docs now use MindType consistently.

## Glossary

- **Correction Marker**: Revolutionary visual system showing AI intelligence working alongside human creativity
- **Burst-Pause-Correct**: Natural typing rhythm where rapid bursts are followed by intelligent correction
- **Active Region**: Small neighborhood behind the caret (20 words) used for safe corrections
- **Listening Mode**: Correction Marker pulses with hypnotic braille animation while user types
- **Correction Mode**: Marker travels through text applying corrections with speed adaptation
- **Velocity Mode**: Revolutionary speed enhancement enabling 180+ WPM typing
- **Thought-Speed Typing**: Cognitive augmentation where users operate at the speed of neural firing
- **Seven Scenarios**: Revolutionary usage patterns from academic to speed typing to data analysis

## Conventions

- One canonical home per topic; avoid duplicates. If two docs drift or overlap, merge or link — don’t fork. If a mirror exists for export (e.g., NotebookLM), it must state clearly that it is non‑canonical and link back here.
- Cross‑link related content (PRD ↔ ADR ↔ architecture ↔ guides ↔ QA) for traceability.
- Keep Swiss‑grid headers; prefer concise files with hyperlinks over long monoliths.

## Where to edit what

- Explanatory specs (docs only): `docs/13-spec/spec/` (e.g., `docs/13-spec/spec/thresholds.yaml`).
- Live configuration (runtime): `config/defaultThresholds.ts`.
- Rule of thumb: docs/spec explains intent; config/ drives the running system.

---

## Orientation (plain language)

**MindType transforms typing from a mechanical skill into fluid expression of thought.** Through our revolutionary **Correction Marker** system, users achieve **thought-speed typing** with unprecedented accuracy and flow state preservation. 

The **Correction Marker** acts as an intelligent visual worker that travels through your text, applying corrections behind your cursor while you maintain unbroken typing rhythm. Experience the **Burst-Pause-Correct** methodology that trains your muscle memory for optimal typing flow.

**Seven Revolutionary Scenarios** demonstrate MindType's transformative power:
- **Academic Excellence**: PhD students with dyslexia achieve 50% faster writing
- **Multilingual Mastery**: Business analysts create documents 40% faster across languages  
- **Accessibility Champion**: Visually impaired researchers experience 60% fewer interruptions
- **Creative Flow**: Novelists increase daily word count by 35% with maintained quality
- **Professional Polish**: Working parents achieve 90% professional tone automatically
- **Speed Demon**: Former stenographers unlock 180+ WPM on standard keyboards
- **Data Whisperer**: Analysts process data 5× faster with intelligent formatting

- How it works: see Architecture overview → [`./04-architecture/README.md`](./04-architecture/README.md)
- Safety rules: see [`03-System-Principles.md`](./03-system-principles/03-System-Principles.md)
- Try it quickly: see Tutorial → [`./06-guides/06-01-tutorials/try-mindtype-in-5-min.md`](./06-guides/06-01-tutorials/try-mindtype-in-5-min.md)


<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:45:45Z -->
