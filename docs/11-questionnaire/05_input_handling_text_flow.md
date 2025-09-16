# Input Handling & Text Flow

_MindTyper Deep-Dive Questionnaire — Section 5 of 16_

**Progress: 30/30 questions answered (100%)**

This section defines how MindTyper processes and handles different types of input, from partial words to special characters and formatting.

---

**59. How should MindTyper handle partial words?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** MindTyper never edits the word at the caret. Once a word boundary appears (space/punctuation), that word becomes eligible for streamed correction in the trailing zone. Diffusion proceeds word‑by‑word behind the caret while typing continues, preserving flow and intent.

Spaces, capitalization, and phrasing cues are input signals, but the system looks at full linguistic + temporal context to decide when a word is complete and ready for diffusion.

---

**60. How does MindTyper handle repeated or deleted characters (e.g. "goooood" or "helppp")?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** MindTyper will preserve repeated letters by default, treating them as intentional expressions of tone, emotion, or rhythm. In informal or expressive contexts—like chats, personal notes, or casual writing—these repetitions are respected and passed through untouched.

The system evaluates letter repetition against both the user's chosen tone (via the Caps Lock modal) and the ambient tone inferred from context. If the setting is formal or technical, and the repetition appears unintentional, it may quietly normalize the spelling—but only with high confidence.

The goal is never to flatten expression, but to enhance it when appropriate.

---

**61. Should MindTyper automatically insert missing punctuation (e.g. periods, commas)?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** MindTyper will automatically insert missing punctuation only when tone and context support it. If a user begins writing with structured punctuation and capitalization, the system will enhance that clarity—adding commas, periods, and sentence flow refinements as needed.

But if the user writes in a more casual or unpunctuated style, MindTyper will preserve that rhythm and hold back on inserting punctuation. As with tone and repetition, the system learns from how the user types and adapts silently in the background.

Capitalization is treated the same way: if the user's flow is lowercase by design, MindTyper respects it. When clarity is needed, it enhances—but never intrudes.

---

**62. Should MindTyper reflow or rewrap text for readability?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** Yes—MindTyper will reflow or rewrap text for readability, but only when the user's intent clearly supports it. If the user types longer content with structural markers like line breaks, paragraph spacing, or sentence cadence, the system will reinforce that formatting by helping create natural breaks and spacing.

It does not rely on app type to determine formatting—because users may write long-form text even in places like WhatsApp or Slack. Instead, it looks at length, rhythm, and user formatting behavior to guide whether and how to rewrap content.

If the user doesn't add breaks or prefers dense, casual flow, MindTyper respects that and avoids unnecessary structure.

---

**63. Should MindTyper pause corrections mid-thought (e.g. while user pauses to think)?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** Corrections stream word‑by‑word behind the caret even while typing. A short pause (~500 ms) simply allows diffusion to catch up faster until the active region reaches the caret. We never edit at/after the caret, so drafting remains uninterrupted.

---

**64. Should users be able to rewind or scrub through recent input?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** No separate timeline UI. MindTyper relies on the host app’s native undo (⌘Z), grouping its automatic edits into coherent steps so users can rewind cleanly if needed. No extra history UI.

This keeps the experience fluid and minimal while preserving safe reversibility.

---

**65. Should MindTyper support voice dictation as an input source?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** Not at first—MindTyper is focused entirely on keyboard input. Voice dictation support may be added later as a separate layer, with its own correction model and interface considerations. The core experience is built around enhancing and streamlining typed input, not voice.

---

**66. Should MindTyper detect and adapt to keyboard layout (e.g. QWERTY, AZERTY)?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** Yes—MindTyper will automatically detect the user's keyboard layout during setup and adjust its correction model to match. This ensures typo detection and input interpretation are tailored to layout-specific quirks (e.g. AZERTY vs. QWERTY).

Users will also have the option to manually override or switch layouts in the settings if needed, but the system defaults to the detected layout for maximum accuracy.

---

**67. Should MindTyper account for mobile vs desktop input differences?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** Yes—MindTyper will account for input differences between mobile and desktop platforms. While the initial focus is desktop, the correction model is designed to eventually adapt to mobile-specific input patterns, like thumb typing, higher typo frequency, and gesture-based input.

On mobile, the system will apply more aggressive denoising and typo correction, while still preserving user tone and intent. This ensures consistency across devices without flattening input style.

---

**68. Should MindTyper correct emoji use, spelling, or placement?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** MindTyper will not correct or modify emoji use in any way. Emojis are treated as intentional expressions, not errors. Even when misspelled or misused, they are left untouched in the current version.

Emoji correction or enhancement may be explored in future releases, but for now, MindTyper prioritizes preserving user voice and emotional tone over intervention.

---

**69. Should MindTyper treat numerals, dates, and times differently than regular words?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** Yes—MindTyper will treat numerals, dates, and times as special cases, but only intervene when clarity or consistency is at risk. If a user types something ambiguous (like "03/09/21"), the system may quietly standardize it based on local format settings or inferred context.

However, if the formatting is clear and intentional, MindTyper will leave it as-is. The goal is to avoid confusion, not impose rigid formatting rules.

---

**70. Should MindTyper help convert shorthand or abbreviations (e.g. "asap" → "as soon as possible")?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** MindTyper will preserve abbreviations and shorthand exactly as typed—no automatic expansion. These compact forms are part of tone, rhythm, and intent.

However, if a shorthand is misspelled—like "assap" instead of "asap"—MindTyper will silently correct it to the intended abbreviation, not expand it. The goal is to clean the input without diluting the voice.

---

**71. Should MindTyper reformat numbers (e.g. "1000" → "1,000")?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** Yes—MindTyper will apply light, region-aware formatting to numbers when it clearly improves readability. For example, large numbers like "1000000" may be formatted as "1.000.000" or "1,000,000" depending on the user's locale, and phone numbers may get soft spacing to enhance clarity.

This formatting is subtle and non-intrusive—it does not alter meaning or structure, and respects the user's regional preferences without drawing attention to itself.

---

**72. Should MindTyper adjust spacing after punctuation (e.g. "word. Next" → "word. Next")?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** Yes—MindTyper will silently correct spacing around punctuation to keep text clean and readable. It removes unnecessary double spaces (e.g. "word. Next") and adds missing spaces when punctuation is followed directly by another word (e.g. "word.Next" becomes "word. Next").

However, if the user is writing in a stylistic format—like poetic lines or deliberately compact phrasing—the system respects those choices and avoids imposing standard spacing.

---

**73. Should MindTyper normalize capitalization (e.g. fixing "i" to "I", "this Is" to "This is")?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** MindTyper will normalize capitalization only when it aligns with the user's tone and intent. If the user is clearly writing in standard sentence case, the system will fix things like a lowercase "i" or inconsistent capitalization ("this Is" → "This is").

But if the user types intentionally in all lowercase—as part of a casual or stylistic voice—MindTyper will respect that and leave it untouched. The goal is to support clarity without flattening expression.

---

**74. Should MindTyper detect and fix homophones (e.g. "their" vs "there")?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** Yes—MindTyper will silently correct homophones like "their" vs "there" only when context makes the intended meaning unmistakably clear. If confidence is low or the sentence could reasonably support multiple meanings, the word is left unchanged.

This approach ensures that users aren't second-guessed, while still cleaning up obvious slip-ups with high confidence.

---

**75. Should MindTyper auto-correct contractions (e.g. "dont" → "don't")?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** Yes—MindTyper will silently correct contractions when the intent is clear and the fix improves clarity or flow. For example, "dont" becomes "don't" automatically when used in a sentence like "I dont know."

However, if a user consistently omits apostrophes as a stylistic choice, MindTyper will learn from that and respect the tone—similar to how it handles lowercase voice or informal writing.

The goal is to reduce friction for users who make fast or casual errors, without overwriting intentional informality.

---

**76. Should MindTyper preserve or clean up slang and internet-speak (e.g. "lol," "gonna," "idk")?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** MindTyper will preserve slang and internet-speak like "lol," "gonna," or "idk" when it's clearly part of the user's tone. These expressions are part of how people communicate and reflect individual style and context.

MindTyper only attempts to clean up or formalize slang when the surrounding tone strongly suggests a polished, professional context—and even then, only with high confidence.

The default is to let it flow naturally, without overcorrecting.

---

**77. Should MindTyper correct repetitive filler phrases (e.g. "you know," "like") if they clutter the message?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** MindTyper will preserve filler words and phrases like "you know," "like," or "I mean" when they contribute to the user's tone or rhythm. These elements are part of natural, expressive writing—especially in casual or conversational settings.

However, if filler words become excessively repetitive or start to clutter the message, MindTyper may lightly reduce duplicates or remove unnecessary clutter, but only when it's clear that doing so improves readability without compromising the user's voice.

The guiding principle is: clarity without erasing personality.

---

**78. Should MindTyper support auto-expanding acronyms (e.g. "NASA" → "National Aeronautics and Space Administration")?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** No—MindTyper will not auto-expand acronyms. Acronyms like "NASA" or "ETA" will be preserved as typed. These are often deliberate, widely understood, and part of the user's communication style.

Expanding them would risk disrupting tone or clarity, especially in fast-paced or technical writing.

---

**79. Should MindTyper adapt formatting (e.g. bullet points, numbered lists) based on writing context?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** MindTyper will gently adapt formatting like bullet points or numbered lists only when the structure is clearly intentional—such as consistent use of dashes, numbers, or line breaks. When it sees a reliable pattern, it may apply light formatting to improve clarity.

However, if the user's input is informal, fragmented, or creatively styled, MindTyper will leave the layout untouched to preserve their intent and voice.

---

**80. Should MindTyper adjust formatting when users paste text from elsewhere?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** When users paste content, MindTyper will leave the words completely untouched. It may do light formatting cleanup—like trimming extra spaces or normalizing indentation—but it will not alter the text itself.

If the pasted content appears to be code or structured data, MindTyper will avoid any cleanup at all to ensure accuracy and integrity.

The guiding rule: clean the mess, never the meaning.

---

**81. Should MindTyper preserve line breaks, spacing, and paragraph structure exactly as typed?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** MindTyper will preserve all user-added line breaks, spacing, and paragraph structure unless there's clear evidence of accidental formatting. The way a user structures their writing—through rhythm, flow, or visual layout—is part of their voice and should be respected.

Light adjustments may occur to fix things like multiple empty lines or trailing spaces, but the core structure stays exactly as typed.

---

**82. Should MindTyper detect when a user is writing in code or markup (like HTML) and handle it differently?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** Yes—MindTyper will detect when users are typing or pasting code or markup and will pause all corrections in those areas. Code is treated as literal input, and MindTyper will not interfere with formatting, spelling, punctuation, or structure.

This ensures that technical content stays intact and error-free, without accidental disruption.

---

**83. Should MindTyper recognize email or URL patterns and treat them differently (e.g. avoid changing punctuation or spacing within them)?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** Yes—MindTyper will recognize email addresses, URLs, and other structured patterns and will not correct or modify them in any way. These elements require perfect accuracy, and even tiny changes to punctuation or spacing could break them or confuse the user.

MindTyper treats these as non-editable blocks—they are preserved exactly as typed.

---

**84. Should MindTyper treat hashtags, mentions (@name), and handles differently in correction or formatting?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** Yes—MindTyper will treat hashtags, mentions, and handles as literal elements and leave them completely untouched. These follow strict platform formatting rules, and any corrections—like altering capitalization or spacing—could break their meaning or functionality.

MindTyper recognizes them and preserves them exactly as typed.

---

**85. Should MindTyper adapt its behavior based on the app or context it's running in (e.g. email vs chat vs doc editor)?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** Yes—MindTyper will lightly adapt its behavior based on context, like being more precise and polished in emails or documents, and more relaxed and casual in messaging apps or chats. But this adaptation is never rigid or automatic—it's always guided by the user's actual tone and intent.

The app context is just a soft signal, not a rule. The user's voice stays in control.

---

**86. Should MindTyper let users override contextual behavior (e.g. force "formal mode" even in chat apps)?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** No—MindTyper will not offer a manual override like "formal mode." Instead, it focuses on enhancing the user's natural tone, wherever they're typing. The goal isn't to force a specific style, but to tidy and refine what the user already intends.

MindTyper adapts subtly based on context and content, but never imposes a writing mode or alters expression unless it clearly improves clarity without changing voice.

---

**87. Should MindTyper adapt to user behavior over time (e.g. learn their tone and pacing)?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** Yes—MindTyper will adapt gradually to each user's tone, pacing, and stylistic habits over time. It builds a lightweight, evolving model that learns from how users naturally write—without locking them into one style.

This allows corrections to feel more personal, fluid, and aligned with how the user expresses themselves—enhancing, not overriding their unique voice.

---

**88. Should users be able to reset their personal tone model and start fresh if needed?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** Yes—users should be able to reset their personal tone model at any time, but this option will live quietly in the settings, not as a prominent control. Most users won't need to think about it, but it's there if someone wants a fresh start.

MindTyper will also tie personalization to each user account, so multiple users on the same machine will have their own configurations. No need for manual switching or added friction.

---

- Clarifier 5.6.a — Undo Grouping Granularity
  - Grouping: one atomic rewrite per word or punctuation boundary.
  - Exceptions: combined corrections across adjacent tokens are applied as a single group when executed within the same debounce window (≤ 12 ms).
  - Caret & ⌘Z: groups are committed to the host app’s native undo stack; a single ⌘Z reverts the entire MindTyper edit group without moving the caret unexpectedly. ⌘⇧Z reapplies the same group in one step.

---

**Navigation:**
[← Typing Engine — Core Functionality](04_typing_engine_core.md) | [Input Normalization & Output Behavior →](06_input_normalization_output_behavior.md)
