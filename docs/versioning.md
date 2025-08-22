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
    • WHAT ▸ Repository versioning, tags, and branches for MindTyper
    • WHY  ▸ Keep v0.1 archived and advance v0.2 cleanly without drift
    • HOW  ▸ Lightweight semantic tags + long‑lived archive and dev branches
-->

### Policy

- **Release tags**: `vMAJOR.MINOR.PATCH` (pre‑1.0 uses 0.y.z). Example: `v0.1.0`, `v0.2.0-alpha`.
- **Archived baseline**: `archive/v0.1` branch created from `main@v0.1.0`. No new commits except hotfixes.
- **Active development**: `main` stays releasable; create `v0.2-dev` for ongoing v0.2 work; merge to `main` via PRs.
- **Hotfixes**: branch from tag (e.g., `hotfix/v0.1.1`), PR into `archive/v0.1`, tag `v0.1.1`, optionally cherry‑pick to `main` if applicable.

### Current state

- Tagged: `v0.1.0` (pre‑v0.2 switch).
- Branches:
  - `archive/v0.1` — frozen baseline matching `v0.1.0`.
  - `main` — will carry v0.2 scaffolding and doc updates.
  - `v0.2-dev` — feature integration branch for v0.2.

### Directory conventions

- `docs/v0.2/` — PRD and architecture for v0.2.
- `docs/` root indices link to the active version; prior docs remain discoverable via archive branch.

### Cursor workflow notes

- Update `docs/implementation.md` to explicitly state v0.2 scope and checklists.
- All code references in discussions should use Context7 doc citations to avoid stale code snippets.
