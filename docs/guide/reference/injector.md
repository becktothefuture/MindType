<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  I N J E C T O R   ( H O S T   C O N T R A C T )  ░░  ║
  ║                                                      ║
  ║   How hosts apply caret‑safe diffs consistently.     ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
    • WHAT ▸ One interface: apply one tiny diff
    • WHY  ▸ Keep hosts thin; ensure single undo step
    • HOW  ▸ Web (textarea) vs macOS (AX APIs) adapters
-->

## Interface

```
type Diff = { start: number; end: number; text: string };
interface Injector {
  applyDiff(input: { diff: Diff; caret: number }): { nextCaret: number };
}
```

## Web Injector

- Update textarea value using `insertText`/value slicing; restore caret.
- Group as a single undo step.

## macOS Injector

- Use Accessibility insertion APIs where supported.
- Clipboard fallback (copy corrected span → Cmd‑V) if needed.

## Tests

- Caret stable after injection
- Single undo step reverts the entire change

See also: `core/diffusionController.ts` and `utils/diff.ts`.

<!-- Alignment: Injector should listen to `mindtype:activeRegion` and `mindtype:highlight`; no references to `validationBand` remain. -->

## Events listened

- `mindtype:activeRegion`
- `mindtype:highlight`
