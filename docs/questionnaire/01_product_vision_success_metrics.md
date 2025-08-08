# Product Vision & Success Metrics
_MindTyper Deep-Dive Questionnaire — Section 1 of 14_

**Progress: 10/10 questions answered (100%)**

This section defines MindTyper's core vision, success metrics, user personas, and fundamental product philosophy.

---

**1. What single metric will prove MindTyper speeds people up?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** MindTyper's core success metric is effective WPM uplift of 3× (from 45 to 135 WPM) at ≥95% semantic accuracy, measured via before/after typing tests using standardized prose. This balances both speed and precision, ensuring performance gains don't come at the cost of meaning or clarity.

---

**2. Describe a headline success story one year after launch.?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** A year after launch, MindTyper is known not just for boosting productivity but for transforming the emotional quality of typing itself. Imagine someone like Elena Soto, a UX researcher juggling notes, emails, and thought pieces throughout the day. Before MindTyper, typing felt like a chore—interruptions, corrections, and clunky phrasing constantly broke her flow. Now, with MindTyper, the experience feels fluid, almost meditative. It's not about doing more; it's about doing things more comfortably. Typing is smoother, context switches are gentler, and the cognitive load is lighter. MindTyper is her "quiet assistant," helping ideas flow effortlessly from brain to screen—whether she's writing a research brief or journaling late at night.

---

**3. Primary user persona (name + job + pain).?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** Primary persona: Adrian (Founder / Creative Technologist)

Adrian is a fast-moving creative technologist who uses digital tools as an extension of thought. He types around 50 WPM—not because he's slow, but because his focus is on ideas, not form. Like many modern professionals, he juggles notes, emails, briefs, and code across multiple platforms—Notion, VS Code, Google Docs—seamlessly. What slows him down isn't ideation, but the micro-frictions of the keyboard: typos, flow-breaking corrections, awkward phrasing.

MindTyper is his answer to that. He envisions a tool that removes the static between brain and screen—a calm, intelligent layer that turns raw input into polished expression. It's not about fixing mistakes, it's about unlocking fluency. Whether drafting specs, writing thought pieces, or capturing fleeting ideas, Adrian wants typing to feel as fluid and effortless as thinking.

---

**4. Secondary persona(s).?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Secondary persona 1: Laila Mansour — UX Designer (non-native speaker)**

Laila works in a global design team where clarity and tone are key. Although fluent, English isn't her first language, and she often rephrases her writing to sound more natural. This adds friction to her workflow—especially when juggling Figma comments, product docs, and Slack threads. MindTyper gives her gentle, intelligent support that preserves her intent while elevating fluency, helping her feel confident and efficient without changing her voice.

**Secondary persona 2: Devin Cho — Research Assistant (neurodivergent, ADHD)**

Devin moves fast mentally but often hits bottlenecks when translating thoughts into typed text. He types in bursts, skips words, and gets frustrated by constant self-correction. MindTyper quietly fills in the gaps—handling structural cleanup, spelling fixes, and pacing support—so Devin can stay focused on his ideas, not his typing. For him, it's not about polish, it's about preserving momentum.

---

**5. Must-Have vs Delight-To-Have feature list.?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

### MUST-HAVE
- Real-time typo correction
- Context-aware word completion
- Granular undo/redo for system suggestions
- A visionary, low-footprint UI that integrates seamlessly into the OS
- Activated purposefully, deactivated easily
- Subtle cues (like cursor animation) to signal presence without distraction
- Background operation that doesn't alter the user's workflow or demand attention

### DELIGHT
- Smart punctuation
- Optional tone/nuance adjustments that preserve the user's original voice
- Aesthetic personalization (e.g. cursor styles, visual themes)
- Usage analytics for personal insight only
- No collaborative features—MindTyper is intentionally a personal tool
- No generic style coaching—all outputs reflect and reinforce the user's natural style, with subtle tailoring options

---

**6. Acceptable learning curve (minutes before magic).?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** First magic moment: within 30 seconds of interacting with the web demo—users experience a live correction that feels effortless and affirming. This is their introduction to how MindTyper enhances typing in real-time, without hijacking intent.

App setup time: under 5 minutes to get MindTyper running (including permissions and activation). Minimal cognitive load.

Proficiency curve: The app includes a lightweight, gamified onboarding experience that tracks typing progress, correction quality, and fluency over time. Users see their baseline WPM and accuracy, and then watch it improve as MindTyper adapts to them. Proficiency is tiered—fast, fast + accurate, fluent, etc.—so users feel encouraged, not graded.

Learning becomes a feature, not a barrier. Onboarding and progression are framed around capability and calm mastery—not pressure or complexity. A training completion score shows how far they've come and how far they can still go, always reinforcing that MindTyper is there to support—not judge—their process.

---

**7. Offline vs Cloud dependency tolerance.?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** MindTyper is built to be offline-first, with all essential features—correction, completion, learning, and personalization—running locally. During setup, users are asked which languages they type in most regularly, and MindTyper downloads the relevant models to the device. These models are kept up-to-date quietly in the background, but everything continues to function fully even when offline.

Cloud functionality is optional and used only to enhance the local experience—never to replace it. Examples include syncing settings across devices, downloading new language packs, or accessing deeper ML capabilities for power users. When offline, MindTyper continues operating with no interruptions or degraded behavior.

This architecture puts privacy, reliability, and user control at the center.

---

**8. Monetisation approach.?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** MindTyper uses a simple, privacy‑first access‑pass model with required accounts (e.g., Sign in with Apple). Offer a free tier with usage limits (e.g., up to 7 active days per month). Sell 30‑day ($4.99) and 12‑month ($39) Plus passes for unlimited usage. Keep all processing on‑device; never send keyboard input to the cloud.

Store device‑bound entitlements in the Keychain with content‑free check‑ins and a 7‑day offline grace period. Honor a 14‑day refund window for direct purchases; follow App Store terms in‑store. Add higher‑tier passes later for pro features without degrading Plus.

---

**9. What existing product impresses you and why?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** Three products shape the vision behind MindTyper:

- **Endel** inspires the emotional tone and visual minimalism. Its blend of ambient design and wellness-oriented purpose shows how software can feel calming, contemporary, and quietly powerful. MindTyper aims for a similar presence: a supportive tool that fades into the background while enhancing everyday life.

- **Apple's native behaviors** are another major influence. MindTyper will feel like it belongs to macOS—leaning into native transitions, cursor behavior, accessibility patterns, and overall OS harmony. It should never fight the platform; it should enhance it.

- **ChatGPT** represents a model of focus and restraint. The interface is deliberately clean, with zero visual clutter, and everything serves a purpose. MindTyper borrows that same intentional simplicity—no distractions, no gamification-for-the-sake-of-it. Just a quiet, intelligent layer that solves a very real problem.

---

**10. A vanity KPI we must never optimize for?**
*Primer: Clarifies this decision and why it matters.*
→ Your answer:

**Answer:** We will never optimize for surface metrics like time-on-app, number of corrections made, or "activity" for its own sake. These can be misleading and even counterproductive if they don't reflect real value to the user.

Instead, we'll focus on a personal efficiency uplift metric—a system that helps each user see how they've improved: faster, more accurate, more fluid typing over time. This metric should be inspiring, not addictive—grounded in actual change, not gamification.

At the same time, we do want to optimize for signups, renewals, and daily usage duration—but only as a reflection of perceived value. If MindTyper is always running in the background, helping effortlessly, and users choose to keep it around for the long haul, that's the best possible signal that we're doing our job right.

---

**Next Section:** [User Research & Ergonomics →](02_user_research_ergonomics.md)