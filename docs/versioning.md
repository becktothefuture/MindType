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

- **Release tags**: `vMAJOR.MINOR.PATCH` (pre‑1.0 uses 0.y.z). Example: `v0.1.0`, `v0.3.0-alpha`.
- **Archived baseline**: `archive/v0.1` branch created from `master@v0.1.0`. No new commits except hotfixes.
- **Active development**: `master` is canonical default. Create `v0.3` for the v0.3 migration and ongoing work; merge via PRs.
- **Hotfixes**: branch from tag (e.g., `hotfix/v0.1.1`), PR into `archive/v0.1`, tag `v0.1.1`, optionally cherry‑pick to `master` if applicable.

### Current state

- Tagged: `v0.1.0` (archived).
- Branches:
  - `archive/v0.1` — frozen baseline matching `v0.1.0`.
  - `master` — canonical default (unified).
  - `v0.3` — active development branch for v0.3 migration.

### Directory conventions

- `docs/` root reflects v0.3. Prior versions remain discoverable via archive branch.

### Cursor workflow notes

- Update `docs/implementation.md` to explicitly state v0.2 scope and checklists.
- All code references in discussions should use Context7 doc citations to avoid stale code snippets.
