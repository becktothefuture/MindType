# Typing Engine — Core Functionality

_MindTyper Deep-Dive Questionnaire — Section 4 of 16_

**Progress: 26/26 questions answered (100%)**

_Note: This section includes Q4.1-4.15 (core functionality) plus Q4.16-4.26 (strategic questions)_

This section defines the core technical architecture and performance characteristics of MindTyper's typing engine.

---

**33. Per-keystroke echo latency budget (ms @ p95).?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** Our target is an end-to-end latency of **< 15ms at the 95th percentile**. This means from the physical keypress to the corrected text appearing on screen, it should be imperceptible to the user. The denoising stream will follow the user's typing, but the initial character echo must be instant. If a complex correction requires more processing, the raw character appears first, and the correction follows within the 15ms window. This is non-negotiable for the "feels like magic" experience.

---

**34. Rolling context window size (chars / tokens).?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** We will use a tiered context window. For immediate, low-latency corrections (typos, common errors), a **500-character (approx. 100-token) sliding window** is sufficient. For more complex semantic corrections and retroactive refinement, the engine will maintain a larger, asynchronous context of up to **2000 tokens**. This balances real-time performance with deep contextual understanding, ensuring that the system is both fast and smart.

---

**35. Default auto-correction aggressiveness (%).?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** Based on our philosophy of an invisible, denoising stream, the default aggressiveness will be high for clear errors but respectful of style.

- **Typographical errors (e.g., "teh"):** 95%+ confidence for silent auto-correction.
- **Grammatical errors (e.g., subject-verb):** 90%+ confidence for silent auto-correction.
- **Stylistic/Tone refinements:** These will not be "corrected" but rather guided by the user's passive writing style or the manually selected tone profile via the Caps Lock modifier. The system amplifies the user's style, it doesn't enforce a new one.

There will be no "suggestions" that require user action. The system corrects silently or it doesn't.

---

**36. Language-model size & quantisation.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** For the MVP, we will use a highly optimized, custom-trained transformer model with approximately **100-150 million parameters**. It will be quantized to **INT8** to balance performance and accuracy, resulting in a small on-disk footprint (approx. 150-200MB per language pack) and low RAM usage. This is the sweet spot for delivering high-quality, real-time performance on modern consumer hardware without requiring a dedicated GPU. Larger, more powerful models can be offered in the future as a premium feature or when hardware becomes more capable.

---

**37. Personal dictionary storage format.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

**Answer:** **SQLite**. It's the best choice for our needs.

- **Why not JSON?** Too slow for the real-time lookups we need, especially as a user's dictionary grows.
- **Why not CoreData?** It locks us into the Apple ecosystem, which contradicts our long-term vision of a cross-platform core.
- **Why SQLite is perfect:** It's incredibly fast, battle-tested, has a small footprint, and is cross-platform. It provides the performance and flexibility we need for both local storage and potential cloud sync down the line. The user's dictionary will be stored in an encrypted SQLite database.

---

**38. Offline language-pack strategy.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** We will include a core language (English) by default and allow additional languages to be downloaded on demand (50–200 MB each). The system will auto-detect the active language and switch models seamlessly. Up to 3 languages can be active at the same time, with least-recently-used eviction to manage RAM usage. This avoids forcing downloads of unused languages while ensuring smooth, high-quality multilingual typing.

---

**39. Caret safety when cursor sits mid-word.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** We will avoid automatic changes when the cursor is mid-word. Only suggestions will be displayed in this state. If a suggestion is accepted, the entire word will be replaced and the cursor will move to the end of the word. A subtle visual indicator will show what will be replaced so the user always knows what will happen before confirming.

---

**40. Surfacing low-confidence suggestions UI.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** Low-confidence suggestions (60–80% confidence) will be marked with a subtle dotted underline. Hover or click will reveal the suggested alternatives. Accepting a low-confidence suggestion will train the model to boost similar patterns. Users will be able to set a confidence threshold below which suggestions are hidden.

---

**41. IME & secure-field rules.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** We will disable all assistance in password and other secure fields, with zero data retained. For IMEs, the system will wait until text composition is complete before analyzing. We will ensure compatibility with major IMEs (Chinese Pinyin, Japanese Hiragana, Korean Hangul) without interfering with their native behavior.

---

**42. Maximum RAM footprint allowed (MB).?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** Target: 150 MB typical usage, 200 MB maximum. Model weights: ~80 MB, context cache: ~30 MB, dictionaries: ~20 MB, UI/overhead: ~20 MB. The system will automatically evict caches under memory pressure to avoid termination by macOS.

---

**43. Crash-recovery strategy.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** We will auto-save the user dictionary and preferences every 30 seconds. On restart after a crash, the system will run a data integrity check. If the ML model is corrupted, we will fall back to a basic spellcheck mode. The user will be notified that recovery occurred, with an option to report the incident.

---

**44. GPU acceleration policy.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** On Apple Silicon, we will use the Neural Engine for inference acceleration. On older Intel Macs, we will fall back to CPU inference. GPU usage will be reserved for heavy batch operations (e.g., model updates), not per-keystroke predictions, to preserve battery life.

---

**45. Battery-saver heuristics.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** When on battery under 20% or in Low Power Mode, prediction frequency will be reduced by 50%, background dictionary updates disabled, and a smaller model variant used. Users can override these settings if needed.

---

**46. Plug-in mechanism for new dictionaries.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** We will use a JSON-based dictionary format with metadata. Dictionaries will load in a sandboxed environment with signature verification. Built-in specialized dictionaries (medical, legal, technical) will be available as premium features. Community dictionaries can be shared but must be approved before public listing.

---

**47. Noise models to support.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** We will focus on the most common error types:

- Adjacent key errors (QWERTY layout)
- Doubled letters
- Missing letters
- Phonetic substitutions (e.g., “there”/“their”)
- Case errors
- Common OCR-style mistakes (e.g., l/1, O/0)
  Our model will be trained on real-world typing error datasets to maximize correction accuracy.

---

**48. Input Method Editor (IME) Integration Strategy.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** We will respect the IME composition phase and only analyze committed text once composition is complete. We will ensure full compatibility with major IMEs (Chinese Pinyin, Japanese Hiragana, Korean Hangul) and avoid interfering with their native workflow.

---

**49. Real-time Collaboration Conflict Resolution.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** MindTyper will only apply changes to the local user’s active text selection and will never overwrite content entered by other collaborators in real time. We will respect the document’s native change-tracking or merge system to avoid conflicts.

---

**50. Training Data Curation & Bias Mitigation.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** We will curate a diverse dataset representing multiple writing styles, regions, and demographics. We will run bias-detection audits before training, remove skewed samples, and continually monitor model outputs for unintended bias patterns.

---

**51. Progressive Web App vs Native Web Demo.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** We will start with a simple web demo designed to deliver the “aha” moment as quickly as possible. Once the core experience is validated, we will explore adding full PWA functionality to demonstrate offline capabilities.

---

**52. Error Recovery & User Trust.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** When an error occurs, we will clearly indicate what happened, offer an immediate undo option, and adjust future suggestions to avoid repeating the same mistake. This transparent, responsive approach helps preserve user trust.

---

**53. Enterprise Security & Compliance Requirements.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** We will design the architecture to support SOC 2 Type II and ISO 27001 compliance from the start. This includes audit-ready logging, secure data handling, and documented operational procedures to simplify future certification.

---

**54. Cross-Platform Consistency vs Native Feel.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** We will maintain consistent core typing behaviors across platforms while adopting native UI and interaction patterns for each OS to ensure the product feels familiar and natural in its environment.

---

**55. Onboarding for Non-Technical Users.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** On the website, we will present an interactive demo that instantly shows the value. In the app, onboarding will take the form of a short, game-like tutorial that introduces key features gradually and helps the user find their typing rhythm with MindTyper.

---

**56. Performance Degradation Graceful Handling.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** We will automatically scale back background tasks, reduce model complexity, and prioritize real-time typing assistance to ensure smooth performance under constrained conditions.

---

**57. Community & Ecosystem Development.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** We will start with a Discord community to foster engagement and resource sharing (custom dictionaries, tips, plugin ideas). Moderation will combine personal oversight with automated tools (MEE6, AutoMod) to keep discussions constructive and safe. Clear guidelines will govern conduct and resource sharing, and trusted members will be given elevated permissions over time.

---

**58. Beta Testing & User Trials.?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

→ **Your answer:** We will run a four-phase rollout:

1. **Closed Alpha:** Internal team + trusted testers (10–20) for core stability checks.
2. **Closed Beta:** 200–500 invited early adopters for broader feedback.
3. **Open Beta:** Public sign-up, capped at ~2,000 to manage support load.
4. **Full Launch:** General availability.

At each stage, we will maintain clear communication with testers, run short feedback cycles (1–2 weeks), and visibly act on the most impactful suggestions before moving to the next phase.

---

**Navigation:**
[← Context Awareness & Personalization](03_context_awareness_personalization.md) | [Input Handling & Text Flow →](05_input_handling_text_flow.md)
