<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  V E R S I O N I N G  &  B R A N C H I N G  P O L I C Y  ░  ║
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
    • WHAT ▸ Repository versioning, tags, and branches for Mind⠶Flow
    • WHY  ▸ Keep legacy archived and advance v0.6+ revolutionary vision cleanly
    • HOW  ▸ Lightweight semantic tags + long‑lived archive and dev branches
-->

### Policy

- **Release tags**: `vMAJOR.MINOR.PATCH` (pre‑1.0 uses 0.y.z). Example: `v0.4.0`, `v0.4.1`.
- **Archived baseline**: `archive/v0.1` branch created from `master@v0.1.0`. No new commits except hotfixes.
- **Active development**: `v0.6` is the active branch for the revolutionary release; merge via PRs. `master` mirrors the latest stable when applicable.
- **Hotfixes**: branch from tag (e.g., `hotfix/v0.1.1`), PR into `archive/v0.1`, tag `v0.1.1`, optionally cherry‑pick to `master` if applicable.

### Current state

- Tagged: `v0.1.0` (archived).
- Branches:
  - `archive/v0.1` — frozen baseline matching `v0.1.0`.
  - `master` — canonical default (unified).
  - `v0.6` — active development branch for revolutionary vision.

### Directory conventions

- `docs/` root reflects v0.6+ revolutionary vision. Prior versions remain discoverable via archive branch.
- Demo lives at `playground/` (renamed from `web-demo/` for revolutionary positioning).

### Implementation workflow notes

- Use `docs/02-implementation/02-Implementation.md` as the canonical source for implementation tasks and phases.
- Maintain alignment between PRD scenarios and architecture specifications via cross-links.

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:46:38Z -->
