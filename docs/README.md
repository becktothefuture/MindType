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

- `architecture/`
  - System design and C4 views. Use `README.md` for the overview; `C1-context.md`, `C2-containers.md`, `C3-components.md` for deeper levels. ADRs live separately under `adr/`.

- `adr/`
  - Architectural Decision Records. Each ADR is a permanent, numbered record that links PRD requirements to code paths and consequences.

- `guide/`
  - Developer‑facing guidance using Diátaxis:
    - `how-to/` — step‑by‑step tasks (web demo server, mac app details, etc.)
    - `tutorials/` — learn by doing (try MindTyper in 5 min)
    - `reference/` — APIs and contracts (band policy, injector, LM behavior, worker, rust merge, config flags)
    - `explanations/` — deeper rationale (e.g., why caret‑safe diffs)

- `qa/`
  - Quality gates and acceptance (BDD) scenarios; matrix mapping in `qa/README.md`.

- `a11y/`
  - Accessibility standards and checklists.

- `brand/`
  - Brand assets, specs, and guides (visual identity, tone, motion). Not product behavior.

- `questionnaire/`
  - Product questionnaire sections and live `questions.md` (clarifications). Treat as the primary Q&A surface; deprecated `questions-incomplete.md` has been removed.

## Conventions

- One canonical home per topic; avoid duplicates. If two docs drift or overlap, merge or link — don’t fork.
- Cross‑link related content (PRD ↔ ADR ↔ architecture ↔ guides ↔ QA) for traceability.
- Keep Swiss‑grid headers; prefer concise files with hyperlinks over long monoliths.
