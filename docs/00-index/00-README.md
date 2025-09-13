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
  - Canonical top‑level docs and indices: `PRD.md`, `implementation.md`, `system_principles.md`, `project_structure.md`, `backlog.md`.
  - Versioning policy: `versioning.md`. As of v0.4+, canonical content lives here and under `architecture/`, `guide/`, `qa/`. Any mirrors exist only for export.

- `architecture/`
  - System design and C4 views. Use `README.md` for the overview; `C1-context.md`, `C2-containers.md`, `C3-components.md` for deeper levels. ADRs live separately under `adr/`.

- `adr/`
  - Architectural Decision Records. Each ADR is a permanent, numbered record that links PRD requirements to code paths and consequences.

- `guide/`
  - Developer‑facing guidance using Diátaxis:
    - `how-to/` — step‑by‑step tasks (web demo server, mac app details, etc.)
    - `tutorials/` — learn by doing (try Mind::Type in 5 min)
    - `reference/` — APIs and contracts (band policy, injector, LM behavior, worker, rust merge, config flags)
    - `explanations/` — deeper rationale (e.g., why caret‑safe diffs)

- `qa/`
  - Quality gates and acceptance (BDD) scenarios; matrix mapping in `qa/README.md`.

- `a11y/`
  - Accessibility standards and checklists.

- `brand/`
  - Brand assets, specs, and guides (visual identity, tone, motion). Not product behavior.
  - See `brand/messaging.md` for the Vision Pitch (Mind::Type) and long‑form messaging.

- `questionnaire/`
  - Product questionnaire sections and live `questions.md` (clarifications). Treat as the primary Q&A surface; deprecated `questions-incomplete.md` has been removed.

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

- Public‑facing name in messaging: “Mind::Type”. Internal code and tests previously used “MindTyper”; docs now use Mind::Type consistently.

## Glossary

- Caret: The text insertion cursor in an editor.
- Active region: Small neighborhood behind the caret used for safe corrections.
- Sweep: Lightweight pass that tidies recent input without heavy model calls.

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

Mind::Type improves what you type, silently and safely. It fixes small slips immediately (Noise), repairs sentences when you pause (Context), and can adjust tone on demand (Tone). It never edits at or after your caret.

- How it works: see Architecture overview → [`./04-architecture/README.md`](./04-architecture/README.md)
- Safety rules: see [`03-System-Principles.md`](./03-system-principles/03-System-Principles.md)
- Try it quickly: see Tutorial → [`./06-guides/06-01-tutorials/try-mindtype-in-5-min.md`](./06-guides/06-01-tutorials/try-mindtype-in-5-min.md)

