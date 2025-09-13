<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  N O T E B O O K L M   M I R R O R  ( E X P O R T )  ░░  ║
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
    • WHAT ▸ Export mirror for NotebookLM ingestion
    • WHY  ▸ Keep a single source of truth in docs/**
    • HOW  ▸ Link back to Master and re‑export when needed
-->

> Non‑canonical mirror. For latest truth, see `docs/README.md` in the repository.

## Folder purposes (mirrored)

- Root (this folder)
  - Top‑level product/plan docs and indices: `PRD.md`, `implementation.md`, `system_principles.md`, `project_structure.md`, `backlog.md`. Start here for the current plan and principles.
  - Versioning policy: see `docs/versioning.md`. As of v0.4, all canonical PRD/architecture content is consolidated in root docs and `docs/architecture/*`; previous `docs/v0.4/*` files were merged or removed to prevent drift.

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
