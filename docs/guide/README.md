<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  G U I D E S   I N D E X  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                              ║
  ║  How‑to, tutorials, references, and explanations for devs.   ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
    • WHAT ▸ Diátaxis structure for developer docs
    • WHY  ▸ Predictable navigation + single sources of truth
    • HOW  ▸ Each subfolder has a clear purpose (below)
-->

## Structure

- `how-to/` — Task‑oriented guides (e.g., web demo server, mac app details, fine‑tune Qwen).
- `tutorials/` — Learn‑by‑doing walkthroughs (e.g., try MindTyper in 5 minutes).
- `reference/` — Stable contracts and APIs (band policy, injector, LM behavior, worker, rust merge, config flags).
- `explanations/` — Rationale and deep dives (e.g., why caret‑safe diffs).

Rules:

- If a document specifies “how”, it belongs in `how-to/`.
- If it defines an API/contract/canonical behavior, it belongs in `reference/`.
- If it teaches via a project, it belongs in `tutorials/`.
- If it answers “why”, it belongs in `explanations/`.
