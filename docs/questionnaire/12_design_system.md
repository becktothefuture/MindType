# Design System & UI/UX Guidelines
_MindTyper Deep-Dive Questionnaire — Section 12 of 13_

**Progress: 10/10 questions (100%)**

This section defines MindTyper's visual design language, interaction patterns, and user experience guidelines.

---

**190. Visual Design Philosophy?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

- Philosophy: Calm precision. Invisible utility that respects focus and privacy. macOS‑native first, elegant, and fair.
- Principles: clarity over cleverness, minimal surface, content‑first, humane feedback, zero dark patterns.
- Aesthetic: clean typographic UI, subtle depth, restrained color; trust signals are quiet (not shouty).
- Behavior: never distract from typing; visuals support comprehension, not decoration.
 - Materials: embrace native macOS “liquid glass” via NSVisualEffectView materials (sidebar/toolbar/titlebar) with vibrancy used sparingly to reinforce hierarchy; never at the expense of text legibility. Respect Reduce Transparency/Increase Contrast and auto‑degrade to solid surfaces when needed.

---

**191. Typography & Text Hierarchy?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

- App UI: San Francisco (system font) for macOS for the most native feel. Web/marketing may use Inter for parity with design docs.
- Sizes (minimums): Title 20–24, Section 17–20, Body 14–16, Caption 12. Line height 1.4–1.6.
- Hierarchy: two‑level max in settings; emphasize with weight/size, not color alone.
- Accessibility: honor user font size settings; WCAG AA contrast; avoid condensed faces.
- Multilingual: system font fallbacks; test diacritics, CJK, RTL; avoid truncation.

---

**192. Color System & Accessibility?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

- Palette: neutral grays for surfaces, a single primary accent, functional feedback colors (success, warning, error, info).
- Modes: automatic light/dark with tokenized colors; identical semantics across modes.
- Contrast: WCAG 2.1 AA minimum; aim for AAA on body text.
- Color‑blind safety: avoid sole reliance on color; pair with icon/shape/state text.
- Motion/States: focus rings and highlights are subtle; no high‑chroma flashes.
 - Materials & vibrancy: use macOS materials appropriate to context (e.g., .sidebar for side panels, .titlebar for headers, .hudWindow for overlays). Overlays and chrome may use vibrancy; content surfaces stay opaque enough to keep AA contrast. Always honor system Reduce Transparency by switching to solid tokens.

 - Clarifier 12.2.b — NSVisualEffectView Materials Map
   - Titlebar: `.titlebar`
   - Sidebar: `.sidebar`
   - HUD/Overlay: `.hudWindow`
   - Popover: `.popover`
   - Fallbacks: when Reduce Transparency or Increase Contrast is enabled, or on low‑end hardware, degrade to solid color tokens with identical hierarchy and contrast.

---

**193. Iconography & Visual Elements?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

- Icons: SF Symbols where possible for platform consistency; otherwise minimal line icons on a 24px grid, 2px stroke.
- Consistency: fixed stroke, corner radii, and padding; avoid metaphor‑laden or culture‑specific symbols.
- Assets: vector (PDF/SVG) with dynamic rendering for light/dark; test at 1x/2x/3x.
 - Rendering: prefer Core Graphics/Quartz vector rendering for crispness; avoid bitmap scaling artifacts; snap to pixel grid on small sizes.

---

**194. Animation & Motion Design?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

- Purpose: motion only to clarify state, acknowledge input, or improve perceived performance.
- Performance: 60fps target; animate transform/opacity only; respect `prefers-reduced-motion`.
- Durations: micro 150–200ms; component transitions 200–300ms; avoid blocking typing.
- Cases: suggestion apply pulse (≤150ms), error underline fade (≈200ms), modal scale+fade (200ms in, 150ms out).
 - Materials in motion: avoid animating blur radius; transition material surfaces via opacity/scale only. Disable live‑blur animations on Low Power Mode or older Intel hardware.

---

**195. Interaction Patterns & Behaviors?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

- macOS conventions: standard menus, keyboard shortcuts, focus handling, sheets.
- Progressive disclosure: advanced settings tucked behind “Show advanced”.
- Safeguards: undo is universal; per‑app scopes clearly indicated; never alter secure fields/IME contexts.
- Feedback: immediate, quiet confirmations; clear error copy; no toast spam.
 - Effects guidance: prefer NSVisualEffectView and system materials over custom shaders; fall back to solid backgrounds if performance/legibility suffers.

- Clarifier 12.6.a — Caps Lock Interaction Timing
  - Set long‑press threshold to 600 ms by default; expose a user setting (400–800 ms).
  - Show a subtle progress ring near the cursor during hold; cancel instantly on release.

---

**196. Layout & Spacing System?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

- Grid: 8px rhythm on top of a 4px base unit for fine control (tokens: 4/8/16/24/32/48/64).
- Spacing: generous white space; single column in settings; two‑column at ≥ 1024px.
- Alignment: left‑aligned labels, consistent paddings; avoid dense groupings.
- Min sizes: settings window ≥ 640×480; controls ≥ 40px min hit area.

---

**197. Accessibility & Inclusive Design?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

- Keyboard: full tab order, visible focus states, shortcut legends.
- Screen readers: labeled controls, dynamic updates announced; avoid meaningless icons without labels.
- Vision/motion: high‑contrast option, reduced‑motion compliant, color‑blind safe charts.
- Cognitive: simple language, consistent placement, predictable outcomes; no surprise dialogs.

---

**198. Responsive Design Strategy?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

- macOS: resizable settings with fluid panels; adapt to external displays and different pixel densities.
- Components: scale with typography tokens; avoid hard‑coded widths.
- Future platforms: reuse tokens and components; native shells keep platform idioms.

---

**199. Design System Documentation?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

- Source of truth: Figma component library (light/dark), mapped to design tokens in code.
- Tokens: JSON/Swift enums for color/space/type; single place updates.
- Previews: SwiftUI previews for components; snapshot tests for visual regressions.
- Guidelines: contribution rules, do/don’t examples, accessibility checklists; versioned docs in repo.
 - Materials reference: document specific NSVisualEffectView materials, Core Graphics usage patterns, and accessibility fallbacks (Reduce Transparency/Increase Contrast) in the style guide.

---

**Navigation:**
[← Testing & QA](11_testing_qa.md) | [Launch & Success Metrics →](13_launch_metrics.md)