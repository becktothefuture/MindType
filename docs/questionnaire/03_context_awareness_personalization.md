# Context Awareness & Personalization
_MindTyper Deep-Dive Questionnaire — Section 3 of 14_

**Progress: 10/10 questions answered (100%)**

This section defines how MindTyper adapts to individual users, learns from context, and personalizes the typing experience.

---

**23. What personal data should MindTyper remember to improve over time?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** MindTyper will store a basic layer of personalization data locally, including:
- Common correction patterns
- Typing speed and fluency baselines
- High-frequency vocabulary or phrases

This allows the system to improve accuracy over time for each user, without compromising privacy or needing constant cloud access. Over time, this local memory will help MindTyper adapt to each user's natural voice and typing quirks.

Optional cloud sync will allow this personalization data to follow the user across devices, but by default, everything runs and stays locally.

In future iterations, we plan to expand personalization to include tone preferences, domain-specific vocabulary, and longer-term writing tendencies—always with transparency and user control in mind.

---

**24. Should users be able to tag corrections as "wrong"?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** MindTyper will not include a feedback mechanism for tagging corrections as "wrong." The system is designed to be trustworthy by design, not dependent on user monitoring. There are no hovers, undo buttons, or interaction popups—if a correction doesn't feel right, the user simply edits the text like they normally would.

This reflects the core philosophy: MindTyper is a denoising stream, not a guessing machine. Errors are rare by design, and when they happen, they're seen as a moment for adaptation, not frustration. Over time, the model learns passively from how users continue typing, without requiring explicit tagging.

---

**25. Should users be able to teach MindTyper custom words?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** MindTyper will support custom word learning automatically, without requiring manual input. If the system encounters an unfamiliar word that appears confidently typed—based on full-sentence context and consistency—it will quietly add it to a personal dictionary.

If a user reverts or overrides a correction, that interaction becomes a learning signal: MindTyper remembers that moment and uses it to refine future behavior. Over time, this makes the system more fluent in the user's personal vocabulary—industry terms, names, slang—without requiring any friction.

A passive dictionary UI will be available in settings for users to view or remove learned words, but day-to-day interaction is completely invisible and seamless.

---

**26. Should MindTyper adjust to each app's tone, formatting, or context?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** MindTyper will not adapt tone based on app context. Instead, tone and formatting will be set manually and universally by the user through a lightweight, intuitive interaction.

By holding down the Caps Lock key, users summon a subtle, cursor-attached modal (rendered with Core Graphics) that lets them select tone or style preferences on the fly. This only appears after holding for two to three seconds, offering tactile-like visual feedback and vanishing as soon as it's released or tone is set.

This keeps the interface clean, elegant, and non-disruptive, while giving users total control over how their words come through—without requiring app-specific logic or settings bloat.

MindTyper enhances what's typed—it doesn't try to guess the voice. That's the user's job. We just help make it shine.

---

**27. Should tone adaptation be passive or user-led?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** Tone adaptation in MindTyper will be user-led by default, with a neutral baseline that passively learns and adjusts based on the user's ongoing writing style. If users write casually, MindTyper will tidy up while preserving that casual tone. If the input is formal, technical, or structured, the system will reinforce that clarity and consistency—without exaggeration or dilution.

Behind the scenes, MindTyper uses a sentiment and tone matrix to classify and reinforce the natural tone of the user's writing. This system operates invisibly, supporting the user's voice rather than shaping it.

For users who want explicit control, the Caps Lock summon interaction lets them adjust tone manually at any time via a visual matrix or selector—offering flexibility without clutter or disruption.

---

**28. Should MindTyper offer writing "moods" or presets (e.g. punchy, poetic, polite)?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** Yes—MindTyper will offer optional tone presets or "moods", surfaced through the Caps Lock summon interaction. These presets act as gentle modifiers to phrasing style—such as neutral, professional, casual, persuasive, or poetic—but they never override or replace the user's voice.

By default, tone is detected passively from the user's own writing. The tone matrix that powers this analysis can also be used visually within the tone modal for users who want more control. These presets are optional, non-sticky unless chosen, and designed to feel playful yet purposeful.

MindTyper's mission is to amplify intent—not to inject artificial flair. These moods are simply shortcuts for users who know what they want to say and want a little extra clarity or confidence in delivering it.

---

**29. Should MindTyper suggest vocabulary refinements (e.g. "bigger" → "larger")?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** Yes—MindTyper may refine vocabulary silently when confident that a replacement improves clarity, fluency, or tone without altering meaning. For example, it might change "bigger" to "larger" if the surrounding sentence supports a more formal tone, or if the change improves flow.

These refinements are applied automatically, within a confidence threshold and in alignment with the user's expressed or inferred tone. They are subtle, context-aware, and designed to preserve the user's voice—not flatten or rewrite it.

---

**30. Should MindTyper handle grammar correction (e.g. verb tense, subject–verb agreement)?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** Yes—MindTyper will automatically handle grammar correction as part of its denoising stream. This includes things like verb tense, subject–verb agreement, passive voice cleanup, and punctuation alignment. All corrections happen invisibly and in real time—no prompts, no confirmations, no grading.

The goal is to make users feel like their writing is simply clearer and more precise, not corrected or critiqued. Grammar support is there to amplify fluency, never to make the user feel watched or wrong.

---

**31. Should MindTyper infer sentence boundaries and resegment input as needed?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** Yes—but only with strong contextual awareness. MindTyper will infer sentence boundaries and restructure fragments when it's clear that the user intends structured text. But if the user types in a more fluid, informal, or punctuation-free style—common in messaging or among younger users—it will respect that rhythm and avoid over-structuring the output.

MindTyper will learn from the user's capitalization, punctuation habits, app context, and writing tone to decide whether to add structure like periods, break up run-ons, or stitch fragments into full thoughts. This decision happens silently and only when confidence is high.

The goal is to match the user's expressive intent, not impose grammatical conventions. Structure should feel invisible, natural, and appropriate to the space the user is in.

---

**32. Should MindTyper detect and remove filler words ("just", "like", "very")?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** MindTyper will not automatically remove filler words like "just," "like," or "very" unless they clearly detract from meaning or readability. These words often carry intentional nuance, rhythm, or tone—and removing them can flatten the user's voice.

Instead, MindTyper treats filler words as stylistic cues. If used deliberately or sparingly, they stay. If they pile up or break the user's flow, the system may gently streamline them—only when context, pacing, and tone all support the decision.

The priority is always to preserve the writer's natural voice while making the message feel clean, fluent, and intentional.

---

 - Clarifier 3.14.a — Personalization Storage Caps & Compaction
   - Cap: store per‑user personalization deltas (e.g., LoRA adapters, lexicon boosts, preference deltas) up to 5 MB on disk.
   - Compaction: weekly background compaction; vacuum and merge small fragments.
   - Eviction: when exceeding the cap, evict oldest entries via LRU while preserving the most recent high‑impact adaptations.
   - Controls: expose "Compact now" and "Reset personalization" buttons in settings. Reset returns to base model/lexicon; compact reclaims space without losing recent learning.

---

**Navigation:**
[← User Research & Ergonomics](02_user_research_ergonomics.md) | [Typing Engine — Core Functionality →](04_typing_engine_core.md)