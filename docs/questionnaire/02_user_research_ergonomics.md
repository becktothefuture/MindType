# User Research & Ergonomics
_MindTyper Deep-Dive Questionnaire — Section 2 of 14_

**Progress: 10/10 questions answered (100%)**

*This section was originally incomplete but has been updated with extracted content from archive files.*

This section defines MindTyper's ergonomic considerations, user research foundations, and interaction patterns.

---

**11. Baseline typing speed (WPM) of target users?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** Our target users typically type between 60–80 WPM, with some ranging down to 45 and others pushing 100+. The primary design focus will be users around 65–75 WPM—modern professionals for whom typing is second nature—but MindTyper will be equally accessible and helpful for slower typists.

To demonstrate value upfront, the web demo will include a simple before-and-after typing test—allowing users to feel the improvement in real time, not just be told about it. This reinforces the product's benefit from the very first interaction and helps users understand that MindTyper adapts to their personal rhythm and fluency, no matter their starting point.

---

**12. Initial keyboard layouts to support?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** MindTyper will launch with support for QWERTY (US and UK variants). This covers the vast majority of our initial user base. Additional layouts—such as AZERTY, QWERTZ, and Dvorak—are planned post-launch, but only if there's meaningful demand.

The system will be built with layout extensibility in mind from day one, so adding new configurations later will be smooth and low-friction—both technically and in terms of user onboarding.

---

**13. Haptic / audio feedback stance?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** No audio or haptic feedback will be included at launch. On macOS, MindTyper will rely purely on visual cues to communicate suggestions and corrections. Haptics may be explored later when developing a bespoke iOS keyboard, where tactile feedback is more appropriate. For now, simplicity and minimal system overhead take priority.

---

**14. Must-have accessibility accommodations?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** MindTyper will be built with accessibility as a first-class concern, aligned closely with Apple's own gold-standard frameworks. Rather than replacing native accommodations, we'll enhance them where it adds meaningful value—especially for users who rely on assistive input methods.

For example, the product will support VoiceOver, high contrast modes, and reduced motion preferences from day one. Input alternatives like dictation or switch control will be respected, but MindTyper's primary focus remains on enhancing the keyboard typing experience—transforming noisy, inconsistent input into clean, fluent text.

In short: we build on what Apple does brilliantly, and only add where it deepens clarity, control, or confidence at the keyboard.

---

**15. Telemetry comfort level?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** MindTyper will never transmit raw keystrokes or user-generated text—all core typing remains completely on-device and private. Any telemetry is strictly limited to content‑free performance data—things like latency percentiles, feature usage counters, crash reports, and correction accuracy proxies (e.g., undo rate).

This telemetry is opt‑in, fully anonymized, and compliant with EU privacy laws (GDPR) and global standards. We'll also make transparency a part of the experience: a clear privacy page showing what's collected, why it helps, and simple controls to opt in or out at any time. No tracking pixels.

This isn't just a backend policy—it's a trust-building feature and a core part of our brand. Users should feel safe knowing MindTyper runs quietly in the background, helping them—not watching them.

---

**16. Undo mental model (single ⌘Z vs granular)?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** MindTyper does not introduce its own parallel undo stack. It integrates with the host app’s native undo (⌘Z) by grouping its own atomic edits so they can be reverted cleanly. Users can always edit text directly; no special commands.

This preserves familiar mental models while guaranteeing safe reversal of any automatic change, reinforcing trust.

---

**17. Visual noise tolerance (particles, highlights)?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** MindTyper will maintain a low-visual-noise aesthetic. Corrections will be indicated with minimal, elegant effects—possibly a brief fade or subtle animation using Core Graphics to keep performance high. These cues will be gentle, quick, and designed to fade away, not distract.

No particles or ornamental animations will be used in the core typing experience. A "Focus Mode" may come later to remove even the subtle hints, but the default behavior will already lean toward clean, unobtrusive visual feedback.

The cursor itself may carry a soft visual signature—just enough to signal that MindTyper is active and enhancing input without demanding attention. The goal is to reinforce trust and calm precision, not visual flair.

---

**18. Auto-rewrite trust threshold (%).?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** MindTyper applies auto-rewrites without requiring user confirmation. The experience is designed as a continuous stream: users type freely, and a second, slightly delayed "denoising stream" follows behind, gently transforming noisy input into fluent, corrected text.

The system uses a high confidence threshold (likely 90–95%) for immediate rewrites, but it also tracks lower-confidence zones. As more context builds (within the sentence or document), the model may revisit these areas and refine them retroactively—always silently, always aiming to align with user intent.

There are no "accept or reject" interactions—just natural, adaptive transformation. The goal is to create a sense of trust and flow where users feel accompanied, not interrupted.

---

**19. Prediction vs correction timing rules.?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** MindTyper will not include completions in its core experience. The system is designed to amplify user input, not predict it. Preemptive suggestions risk disrupting flow and autonomy, and run counter to the product's principle of putting the human first.

Corrections will follow the user in real time with a small delay—just enough to process context and apply denoising. Over time, we may explore prediction as a feature flag or a more advanced layer, but only once the core interaction feels deeply trusted and frictionless.

For now, no mid-word or sentence completions, no flashing grey text—just quiet, confident refinement of what's already been typed.

---

**20. Multi-language handling strategy.?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** MindTyper will support multi-language typing from the start, taking inspiration from systems like Apple's dual-language keyboard. Users will be able to enable multiple active languages (e.g. English, German, French), and the system will intelligently detect the language in use based on input and context.

If a passage doesn't align with one language model, MindTyper will quietly test against the secondary language—only switching if the surrounding context supports it. The goal is to support natural code-switching without requiring manual toggles or confusing behavior.

That said, the first iteration will stay simple and focused, optimizing for two to three languages per session with minimal cognitive load and maximum clarity.

---

**21. Max onboarding length before users bail (sec).?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** The "Time to Magic" is critical. Onboarding must be under **30 seconds**, including any necessary OS permission grants. The core value proposition—seeing messy typing turn into clean text—must be demonstrated within the first **10 seconds** of typing in the web demo, and immediately upon installation of the app. We will front-load the "aha" moment and back-load any complex configuration into optional settings menus. The goal is near-instant gratification and trust-building.

---

**22. Fast feedback loop for bug reports?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** We will implement a frictionless, in-app bug reporting system. Users can trigger it via a simple command or from the settings menu. The report will automatically include anonymized system information and recent (non-sensitive) performance logs to aid debugging. We will aim for a **24-hour acknowledgment** of all reports and push critical fixes within **48-72 hours**. Transparency is key; we can use a public-facing board (like Canny or a simple GitHub project) to show what's being worked on, without exposing sensitive details. This builds trust and community.

---

 - Clarifier 2.6.a — Undo Grouping Granularity
   - Grouping: one atomic rewrite per word or punctuation boundary.
   - Exceptions: combined corrections across adjacent tokens are applied as a single group when executed within the same debounce window (≤ 12 ms).
   - Caret & ⌘Z: group boundaries align with the host app’s native undo stack; the caret never jumps unexpectedly. A single ⌘Z reverts the full MindTyper group; ⌘⇧Z restores it in one step.

---

**Navigation:**
[← Product Vision & Success Metrics](01_product_vision_success_metrics.md) | [Context Awareness & Personalization →](03_context_awareness_personalization.md)