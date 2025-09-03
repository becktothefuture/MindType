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
    • WHAT ▸ Repository versioning, tags, and branches for MindType
    • WHY  ▸ Keep v0.1 archived and advance v0.4 cleanly without drift
    • HOW  ▸ Lightweight semantic tags + long‑lived archive and dev branches
-->

### Policy

- **Release tags**: `vMAJOR.MINOR.PATCH` (pre‑1.0 uses 0.y.z). Example: `v0.4.0`, `v0.4.1`.
- **Archived baseline**: `archive/v0.1` branch created from `master@v0.1.0`. No new commits except hotfixes.
- **Active development**: `v0.4` is the active branch for the v0.4 release; merge via PRs. `master` mirrors the latest stable when applicable.
- **Hotfixes**: branch from tag (e.g., `hotfix/v0.1.1`), PR into `archive/v0.1`, tag `v0.1.1`, optionally cherry‑pick to `master` if applicable.

### Current state

- Tagged: `v0.1.0` (archived).
- Branches:
  - `archive/v0.1` — frozen baseline matching `v0.1.0`.
  - `master` — canonical default (unified).
  - `v0.4` — active development branch for v0.4.

### Directory conventions

- `docs/` root reflects v0.4. Prior versions remain discoverable via archive branch.

### Cursor workflow notes

- Keep `docs/implementation.md` aligned with `docs/v0.4/MindType v0.4-master guide.md` and the v0.4 architecture. Use doc citations to avoid stale snippets.
