<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  D O C S   I N D E X  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
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
    • WHAT ▸ Overview and folder purposes for documentation
    • WHY  ▸ Keep navigation clear; avoid duplication and drift
    • HOW  ▸ Short descriptions + links to canonical locations
-->

## Folder purposes

- Root (this folder)
  - Top‑level product/plan docs and indices: `PRD.md`, `implementation.md`, `system_principles.md`, `project_structure.md`, `backlog.md`. Start here for the current plan and principles.
  - Versioning policy: see `docs/versioning.md`. Active PRD/architecture for v0.2 live under `docs/v0.2/`.

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
  - See `brand/messaging.md` for the v0.2 Vision Pitch (Mind::Type) and long‑form messaging.

- `questionnaire/`
  - Product questionnaire sections and live `questions.md` (clarifications). Treat as the primary Q&A surface; deprecated `questions-incomplete.md` has been removed.

### Cross‑links

- Principles ↔ ADRs ↔ Architecture ↔ Guides ↔ QA form a closed loop:
  - Principles set behavior
  - ADRs lock consequential decisions
  - Architecture shows where behavior lives
  - Guides define exact contracts
  - QA verifies behavior continuously

### Naming note

- Public‑facing name in messaging: “Mind::Type”. Internal code and tests previously used “MindTyper”; docs now use Mind::Type consistently.

## Glossary

- Caret: The text insertion cursor in an editor.
- Active region: Small neighborhood behind the caret used for safe corrections.
- Sweep: Lightweight pass that tidies recent input without heavy model calls.

## Conventions

- One canonical home per topic; avoid duplicates. If two docs drift or overlap, merge or link — don’t fork.
- Cross‑link related content (PRD ↔ ADR ↔ architecture ↔ guides ↔ QA) for traceability.
- Keep Swiss‑grid headers; prefer concise files with hyperlinks over long monoliths.
