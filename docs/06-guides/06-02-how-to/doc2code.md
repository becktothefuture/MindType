<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  D O C  →  C O D E   G U I D E  ░░░░░░░░░░░░░░░░░  ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
    • WHAT ▸ How to author SPEC blocks and run sync
    • WHY  ▸ Docs are the master; code mirrors the docs
    • HOW  ▸ Add SPEC blocks, run pnpm doc:sync, open PR
-->

### What is this?

Doc2Code keeps the repo aligned with the docs. You write small SPEC blocks in Markdown; the tool updates file headers and emits a machine‑readable traceability map.

### How to author a SPEC block

- In a doc, add an HTML comment with YAML:

```md
<!-- SPEC_DEMO:REQ
id: REQ-EXAMPLE
title: Short user-facing requirement
modules:
  - core/someModule.ts
acceptance:
  - docs/12-qa/qa/acceptance/some.feature#SCEN-SOMETHING-001
tests:
  - tests/some.spec.ts
-->
```

### Commands

- `pnpm doc:check`: verifies references and whether headers are in sync.
- `pnpm doc:sync`: writes headers and `docs/traceability.json`.

### Simple language summary

- You write the truth in docs. The tool copies helpful info onto files so future readers know why a file exists and what rules it follows.

### Prompting tips (for working with the AI)

- Start with the REQ or CONTRACT ID if you have one.
- Say what changed in the doc and ask to run `pnpm doc:sync`.
- If adding a new feature, ask to draft a SPEC block and place it in the right doc.
