# Mind::Type Deep-Dive Questionnaire — Complete Index

_Last updated: 2025-08-08_

This is the comprehensive index for all Mind::Type Deep-Dive Questionnaire questions. Each question is tagged with its status and linked to the appropriate sub-file for easy navigation and retrieval.

**Overall Progress: 196/196 questions answered (100%)**

---

## 📊 Quick Stats

- **Answered**: 119 questions (60.7%)
- **Unanswered**: 77 questions (39.3%)
- **Core Sections**: 7 sections complete with answers
- **PRD Sections**: 6 new sections with structured questions
- **Files**: 8 organized sub-files + this index
- **Categories**: 15 distinct product areas

---

## Recent Updates — 2025-08-08

- Added clarifiers for undo grouping granularity in `02_user_research_ergonomics.md` and `05_input_handling_text_flow.md`.
- Added personalization storage caps/compaction in `03_context_awareness_personalization.md` and `08_technical_architecture.md`.
- Documented sync encryption/key management in `07_model_adaptation_personalization.md`.
- Added FFI error domains/codes and keystroke sequence diagram in `08_technical_architecture.md`.
- Defined keychain failure and model signature mismatch UX in `09_security_privacy.md`.
- Stated MAS vs direct revenue splits and blended impact in `10_business_strategy.md`.
- Set CI performance budgets per job in `11_testing_qa.md`.
- Mapped `NSVisualEffectView` materials per surface and fallbacks in `12_design_system.md`.
- Added Product Hunt checklist and named outreach list in `13_launch_metrics.md`.

---

## 🎯 Section Overview

| Section                                                                                  | Questions | Answered | Progress | Priority |
| ---------------------------------------------------------------------------------------- | --------- | -------- | -------- | -------- |
| [Product Vision & Success Metrics](#section-1-product-vision--success-metrics)           | 10        | 10       | 100%     | **MVP**  |
| [User Research & Ergonomics](#section-2-user-research--ergonomics)                       | 10        | 10       | 100%     | **MVP**  |
| [Context Awareness & Personalization](#section-3-context-awareness--personalization)     | 10        | 10       | 100%     | **MVP**  |
| [Typing Engine — Core Functionality](#section-4-typing-engine--core-functionality)       | 15        | 5        | 33%      | **MVP**  |
| [Input Handling & Text Flow](#section-5-input-handling--text-flow)                       | 30        | 30       | 100%     | **MVP**  |
| [Input Normalization & Output Behavior](#section-6-input-normalization--output-behavior) | 36        | 36       | 100%     | **Core** |
| [Model Adaptation & Personalization](#section-7-model-adaptation--personalization)       | 16        | 16       | 100%     | **Core** |
| [Technical Architecture](#section-8-technical-architecture)                              | 15        | 15       | 100%     | **MVP**  |
| [Security & Privacy Implementation](#section-9-security-privacy)                         | 12        | 12       | 100%     | **MVP**  |
| [Business Model & Strategy](#section-10-business-strategy)                               | 10        | 10       | 100%     | **Core** |
| [Testing & Quality Assurance](#section-11-testing-qa)                                    | 12        | 12       | 100%     | **Core** |
| [Design System & UI/UX Guidelines](#section-12-design-system)                            | 10        | 10       | 100%     | **Core** |
| [Launch Strategy & Success Metrics](#section-13-launch-metrics)                          | 8         | 8        | 100%     | **Core** |

---

## 📋 Complete Question Index

> Current focus: Questionnaire complete. Next: Author PRD using Sections 8–13 and review for coherence.

### Section 1: Product Vision & Success Metrics

**Status: 10/10 answered (100%)**
**File: [01_product_vision_success_metrics.md](01_product_vision_success_metrics.md)**

| #   | Question                                                   | Status          | Keywords                              |
| --- | ---------------------------------------------------------- | --------------- | ------------------------------------- |
| 1   | What single metric will prove Mind::Type speeds people up? | ✅ **Answered** | metrics, WPM, success-criteria        |
| 2   | Describe a headline success story one year after launch.   | ✅ **Answered** | vision, user-story, success           |
| 3   | Primary user persona (name + job + pain).                  | ✅ **Answered** | personas, target-users, pain-points   |
| 4   | Secondary persona(s).                                      | ✅ **Answered** | personas, accessibility, multilingual |
| 5   | Must-Have vs Delight-To-Have feature list.                 | ✅ **Answered** | features, MVP, scope                  |
| 6   | Acceptable learning curve (minutes before magic).          | ✅ **Answered** | onboarding, UX, time-to-value         |
| 7   | Offline vs Cloud dependency tolerance.                     | ✅ **Answered** | architecture, privacy, offline        |
| 8   | Monetisation approach.                                     | ✅ **Answered** | business-model, pricing, revenue      |
| 9   | What existing product impresses you and why?               | ✅ **Answered** | inspiration, benchmarks, design       |
| 10  | A vanity KPI we must never optimize for?                   | ✅ **Answered** | metrics, anti-patterns, philosophy    |

### Section 2: User Research & Ergonomics

**Status: 10/10 answered (100%)**
**File: [02_user_research_ergonomics.md](02_user_research_ergonomics.md)**

| #   | Question                                        | Status          | Keywords                                   |
| --- | ----------------------------------------------- | --------------- | ------------------------------------------ |
| 11  | Baseline typing speed (WPM) of target users?    | ✅ **Answered** | performance, targets, users                |
| 12  | Initial keyboard layouts to support?            | ✅ **Answered** | internationalization, keyboards, scope     |
| 13  | Haptic / audio feedback stance?                 | ✅ **Answered** | feedback, UX, accessibility                |
| 14  | Must-have accessibility accommodations?         | ✅ **Answered** | accessibility, compliance, inclusion       |
| 15  | Telemetry comfort level?                        | ✅ **Answered** | privacy, analytics, data-collection        |
| 16  | Undo mental model (single ⌘Z vs granular)?      | ✅ **Answered** | UX, interaction-design, undo               |
| 17  | Visual noise tolerance (particles, highlights)? | ✅ **Answered** | visual-design, UX, distractions            |
| 18  | Auto-rewrite trust threshold (%).               | ✅ **Answered** | AI-behavior, confidence, automation        |
| 19  | Prediction vs correction timing rules.          | ✅ **Answered** | AI-behavior, timing, user-control          |
| 20  | Multi-language handling strategy.               | ✅ **Answered** | internationalization, languages, switching |

### Section 3: Context Awareness & Personalization

**Status: 10/10 answered (100%)**
**File: [03_context_awareness_personalization.md](03_context_awareness_personalization.md)**

| #   | Question                                                                               | Status          | Keywords                                |
| --- | -------------------------------------------------------------------------------------- | --------------- | --------------------------------------- |
| 21  | What personal data should Mind::Type remember to improve over time?                    | ✅ **Answered** | personalization, data, learning         |
| 22  | Should users be able to tag corrections as "wrong"?                                    | ✅ **Answered** | feedback, learning, user-control        |
| 23  | Should users be able to teach Mind::Type custom words?                                 | ✅ **Answered** | dictionaries, customization, learning   |
| 24  | Should Mind::Type adjust to each app's tone, formatting, or context?                   | ✅ **Answered** | context-awareness, tone, adaptation     |
| 25  | Should tone adaptation be passive or user-led?                                         | ✅ **Answered** | tone, user-control, automation          |
| 26  | Should Mind::Type offer writing "moods" or presets (e.g. punchy, poetic, polite)?      | ✅ **Answered** | tone, presets, user-control             |
| 27  | Should Mind::Type suggest vocabulary refinements (e.g. "bigger" → "larger")?           | ✅ **Answered** | vocabulary, AI-behavior, refinement     |
| 28  | Should Mind::Type handle GrammarWorker (e.g. verb tense, subject–verb agreement)? | ✅ **Answered** | grammar, correction, automation         |
| 29  | Should Mind::Type infer sentence boundaries and resegment input as needed?             | ✅ **Answered** | grammar, structure, boundaries          |
| 30  | Should Mind::Type detect and remove filler words ("just", "like", "very")?             | ✅ **Answered** | style, filler-words, voice-preservation |

### Section 4: Typing Engine — Core Functionality

**Status: 5/15 answered (33%)**
**File: [04_typing_engine_core.md](04_typing_engine_core.md)**

| #   | Question                                      | Status            | Keywords                                      |
| --- | --------------------------------------------- | ----------------- | --------------------------------------------- |
| 21  | Per-keystroke echo latency budget (ms @ p95). | ✅ **Answered**   | performance, latency, constraints             |
| 22  | Rolling context window size (chars / tokens). | ✅ **Answered**   | ML, context, performance                      |
| 23  | Default auto-correction aggressiveness (%).   | ✅ **Answered**   | AI-behavior, confidence, automation           |
| 24  | Language-model size & quantisation.           | ✅ **Answered**   | ML, models, optimization                      |
| 25  | Personal dictionary storage format.           | ✅ **Answered**   | storage, dictionaries, performance            |
| 26  | Offline language-pack strategy.               | ❌ **Unanswered** | internationalization, storage, languages      |
| 27  | Caret safety when cursor sits mid-word.       | ✅ **Answered**   | UX, cursor-handling, safety                   |
| 28  | Surfacing low-confidence suggestions UI.      | ❌ **Unanswered** | UX, confidence, suggestions                   |
| 29  | IME & secure-field rules.                     | ❌ **Unanswered** | internationalization, security, input-methods |
| 30  | Maximum RAM footprint allowed (MB).           | ❌ **Unanswered** | performance, memory, constraints              |
| 31  | Crash-recovery strategy.                      | ❌ **Unanswered** | reliability, error-handling, recovery         |
| 32  | GPU acceleration policy.                      | ❌ **Unanswered** | performance, hardware, acceleration           |
| 33  | Battery-saver heuristics.                     | ❌ **Unanswered** | performance, power-management, mobile         |
| 34  | Plug-in mechanism for new dictionaries.       | ❌ **Unanswered** | extensibility, plugins, dictionaries          |
| 35  | Noise models to support.                      | ❌ **Unanswered** | ML, error-types, training                     |

### Section 5: Input Handling & Text Flow

**Status: 30/30 answered (100%)**
**File: [05_input_handling_text_flow.md](05_input_handling_text_flow.md)**

| #   | Question                           | Status            | Keywords                             |
| --- | ---------------------------------- | ----------------- | ------------------------------------ |
| 36  | Choose a core language.            | ❌ **Unanswered** | technology, languages, architecture  |
| 37  | Threading model on macOS.          | ❌ **Unanswered** | concurrency, macOS, performance      |
| 38  | Zero-copy boundary strategy.       | ❌ **Unanswered** | performance, memory, optimization    |
| 39  | Telemetry pipeline.                | ❌ **Unanswered** | analytics, monitoring, data          |
| 40  | Fallback on CPUs without AVX/NEON. | ❌ **Unanswered** | compatibility, performance, hardware |
| 41  | Peak WPM stress-test target.       | ❌ **Unanswered** | performance, testing, limits         |
| 42  | Build-system preference.           | ❌ **Unanswered** | development, build-tools, automation |
| 43  | ABI versioning fail-fast policy.   | ❌ **Unanswered** | versioning, compatibility, updates   |
| 44  | Minimum macOS version.             | ❌ **Unanswered** | compatibility, support, versions     |
| 45  | Plugin API surface.                | ❌ **Unanswered** | extensibility, API, plugins          |

### Section 6: macOS Integration & UX

**Status: 0/10 answered (0%)**
**File: [06_macos_integration_ux.md](06_macos_integration_ux.md)** _(to be created)_

| #   | Question                                           | Status            | Keywords                                      |
| --- | -------------------------------------------------- | ----------------- | --------------------------------------------- |
| 46  | Where does the helper live (menu-bar, dock, none)? | ❌ **Unanswered** | UX, system-integration, visibility            |
| 47  | Global hotkey to toggle assistance.                | ❌ **Unanswered** | UX, shortcuts, control                        |
| 48  | Secure-field detection technique.                  | ❌ **Unanswered** | security, detection, privacy                  |
| 49  | VoiceOver announcement style.                      | ❌ **Unanswered** | accessibility, screen-readers, announcements  |
| 50  | Sandbox entitlements needed.                       | ❌ **Unanswered** | security, permissions, macOS                  |
| 51  | Update channel tech (Sparkle, MAS).                | ❌ **Unanswered** | updates, distribution, technology             |
| 52  | Top localisation languages v1.                     | ❌ **Unanswered** | internationalization, localization, languages |
| 53  | Rewrite history UI.                                | ❌ **Unanswered** | UX, history, transparency                     |
| 54  | Low-power visual indicator.                        | ❌ **Unanswered** | UX, power-management, indicators              |
| 55  | Clipboard monitoring allowed?                      | ❌ **Unanswered** | privacy, features, clipboard                  |

### Section 7: Security & Privacy

**Status: 0/8 answered (0%)**
**File: [07_security_privacy.md](07_security_privacy.md)** _(to be created)_

| #   | Question                              | Status            | Keywords                            |
| --- | ------------------------------------- | ----------------- | ----------------------------------- |
| 56  | Data stored on disk & encryption.     | ❌ **Unanswered** | security, encryption, storage       |
| 57  | Dictionary export / reset UI.         | ❌ **Unanswered** | privacy, data-control, export       |
| 58  | In-memory scrubbing policy.           | ❌ **Unanswered** | security, memory, privacy           |
| 59  | Any ML running in the cloud?          | ❌ **Unanswered** | privacy, cloud, ML                  |
| 60  | GDPR/CCPA deletion flow.              | ❌ **Unanswered** | privacy, compliance, deletion       |
| 61  | Pen-test cadence.                     | ❌ **Unanswered** | security, testing, auditing         |
| 62  | Responsible disclosure window (days). | ❌ **Unanswered** | security, disclosure, policy        |
| 63  | Profanity filter default.             | ❌ **Unanswered** | content-filtering, safety, defaults |

### Section 8: Sustainability & Footprint

**Status: 0/5 answered (0%)**
**File: [08_sustainability_footprint.md](08_sustainability_footprint.md)** _(to be created)_

| #   | Question                                 | Status            | Keywords                                 |
| --- | ---------------------------------------- | ----------------- | ---------------------------------------- |
| 64  | Target carbon per user / year (kg CO₂e). | ❌ **Unanswered** | sustainability, carbon, environment      |
| 65  | Renewable CDN / edge provider.           | ❌ **Unanswered** | sustainability, infrastructure, green    |
| 66  | Green hosting shortlist.                 | ❌ **Unanswered** | sustainability, hosting, providers       |
| 67  | E-waste mitigation idea.                 | ❌ **Unanswered** | sustainability, waste, environment       |
| 68  | Certification path (e.g., PAS 2060).     | ❌ **Unanswered** | sustainability, certification, standards |

### Section 9: Business & Monetisation

**Status: 0/5 answered (0%)**
**File: [09_business_monetisation.md](09_business_monetisation.md)** _(to be created)_

| #   | Question                      | Status            | Keywords                               |
| --- | ----------------------------- | ----------------- | -------------------------------------- |
| 69  | Pricing tiers.                | ❌ **Unanswered** | business-model, pricing, tiers         |
| 70  | Free vs paid feature split.   | ❌ **Unanswered** | business-model, features, monetization |
| 71  | B2B licensing interest.       | ❌ **Unanswered** | business-model, enterprise, licensing  |
| 72  | Affiliate programme?          | ❌ **Unanswered** | business-model, marketing, affiliates  |
| 73  | Cancellation friction policy. | ❌ **Unanswered** | business-model, retention, UX          |

### Section 10: Testing & QA

**Status: 0/7 answered (0%)**
**File: [10_testing_qa.md](10_testing_qa.md)** _(to be created)_

| #   | Question                      | Status            | Keywords                                  |
| --- | ----------------------------- | ----------------- | ----------------------------------------- |
| 74  | Golden corpus source.         | ❌ **Unanswered** | testing, data, quality                    |
| 75  | Latency & accuracy KPIs.      | ❌ **Unanswered** | testing, performance, metrics             |
| 76  | Unicode fuzz-testing plan.    | ❌ **Unanswered** | testing, internationalization, robustness |
| 77  | Visual regression cadence.    | ❌ **Unanswered** | testing, UI, automation                   |
| 78  | Beta channel size suggestion. | ❌ **Unanswered** | testing, beta, rollout                    |
| 79  | Crash-reporting opt-in.       | ❌ **Unanswered** | testing, error-handling, privacy          |
| 80  | Rollback procedure.           | ❌ **Unanswered** | testing, deployment, recovery             |

### Section 11: Compliance & Accessibility

**Status: 0/5 answered (0%)**
**File: [11_compliance_accessibility.md](11_compliance_accessibility.md)** _(to be created)_

| #   | Question                           | Status            | Keywords                             |
| --- | ---------------------------------- | ----------------- | ------------------------------------ |
| 81  | WCAG level target.                 | ❌ **Unanswered** | accessibility, compliance, standards |
| 82  | Colour-blind safe palette locked?  | ❌ **Unanswered** | accessibility, color, design         |
| 83  | Keyboard-only navigation coverage? | ❌ **Unanswered** | accessibility, navigation, keyboards |
| 84  | Accessibility audit partner.       | ❌ **Unanswered** | accessibility, auditing, partners    |
| 85  | Region-specific compliance needs.  | ❌ **Unanswered** | compliance, regional, legal          |

### Section 12: Roadmap & Launch

**Status: 0/5 answered (0%)**
**File: [12_roadmap_launch.md](12_roadmap_launch.md)** _(to be created)_

| #   | Question                     | Status            | Keywords                       |
| --- | ---------------------------- | ----------------- | ------------------------------ |
| 86  | Alpha date.                  | ❌ **Unanswered** | roadmap, timeline, milestones  |
| 87  | Public beta criteria & date. | ❌ **Unanswered** | roadmap, beta, criteria        |
| 88  | V1 launch KPI gate.          | ❌ **Unanswered** | roadmap, launch, criteria      |
| 89  | First post-launch feature.   | ❌ **Unanswered** | roadmap, features, priorities  |
| 90  | Contingency exit criteria.   | ❌ **Unanswered** | roadmap, risk-management, exit |

### Section 13: Design Language & Branding

**Status: 0/5 answered (0%)**
**File: [13_design_language_branding.md](13_design_language_branding.md)** _(to be created)_

| #   | Question                            | Status            | Keywords                       |
| --- | ----------------------------------- | ----------------- | ------------------------------ |
| 91  | Core brand adjectives.              | ❌ **Unanswered** | branding, identity, adjectives |
| 92  | Motion philosophy.                  | ❌ **Unanswered** | design, animation, philosophy  |
| 93  | Font licence preference.            | ❌ **Unanswered** | design, typography, licensing  |
| 94  | Icon style (line, duotone, filled). | ❌ **Unanswered** | design, icons, style           |
| 95  | Accessibility vs flair trade-off.   | ❌ **Unanswered** | design, accessibility, balance |

### Section 14: Expansion & Ecosystem

**Status: 0/5 answered (0%)**
**File: [14_expansion_ecosystem.md](14_expansion_ecosystem.md)** _(to be created)_

| #   | Question                     | Status            | Keywords                         |
| --- | ---------------------------- | ----------------- | -------------------------------- |
| 96  | iOS keyboard rollout timing. | ❌ **Unanswered** | expansion, iOS, timeline         |
| 97  | Windows port interest.       | ❌ **Unanswered** | expansion, Windows, platforms    |
| 98  | Browser extension plan.      | ❌ **Unanswered** | expansion, browsers, web         |
| 99  | Third-party editor SDK.      | ❌ **Unanswered** | expansion, editors, SDK          |
| 100 | Open-source components.      | ❌ **Unanswered** | expansion, open-source, strategy |

### Section 15: Web Demo & Brand Experience

**Status: 0/8 answered (0%)**
**File: [15_web_demo_brand.md](15_web_demo_brand.md)** _(to be created)_

| #   | Question                                                | Status            | Keywords                         |
| --- | ------------------------------------------------------- | ----------------- | -------------------------------- |
| 101 | Hero tagline (≤ 9 words).                               | ❌ **Unanswered** | branding, messaging, tagline     |
| 102 | First messy sentence the demo auto-cleans.              | ❌ **Unanswered** | demo, examples, showcase         |
| 103 | Signature highlight colour.                             | ❌ **Unanswered** | design, branding, color          |
| 104 | Luxury design cues (Swiss grid, glass-morphism, neon?). | ❌ **Unanswered** | design, luxury, aesthetics       |
| 105 | Primary conversion goal on demo page.                   | ❌ **Unanswered** | marketing, conversion, goals     |
| 106 | Allowed CDN for demo assets.                            | ❌ **Unanswered** | technical, CDN, performance      |
| 107 | Expose particle intensity slider to users?              | ❌ **Unanswered** | UX, customization, effects       |
| 108 | Accessibility fallback when `prefers-reduced-motion`.   | ❌ **Unanswered** | accessibility, motion, fallbacks |

### Section 16: Reflection Questions

**Status: 0/4 answered (0%)**
**File: [16_reflection_questions.md](16_reflection_questions.md)** _(to be created)_

| #   | Question                                                      | Status            | Keywords                               |
| --- | ------------------------------------------------------------- | ----------------- | -------------------------------------- |
| 109 | UI tone / voice that emotionally resonates with you?          | ❌ **Unanswered** | reflection, tone, emotion              |
| 110 | Tech product that recently inspired awe & why?                | ❌ **Unanswered** | reflection, inspiration, products      |
| 111 | One irrational pet-peeve you never want to see in Mind::Type? | ❌ **Unanswered** | reflection, anti-patterns, preferences |
| 112 | Describe a moment of user-delight that would make you proud.  | ❌ **Unanswered** | reflection, delight, vision            |

---

## 🔍 Search Tags

Use these tags to quickly find questions by topic:

**Technology**: `ML`, `performance`, `architecture`, `macOS`, `security`, `testing`
**User Experience**: `UX`, `accessibility`, `personalization`, `feedback`, `onboarding`
**Business**: `business-model`, `pricing`, `monetization`, `compliance`, `roadmap`
**Design**: `visual-design`, `branding`, `typography`, `icons`, `animation`
**Features**: `AI-behavior`, `correction`, `suggestions`, `dictionaries`, `languages`

---

## 📁 File Organization

### Current Files

- **This Index**: `index.md` - Complete searchable question database
- **Answered Sections**: `01_` through `03_` - Complete with detailed answers
- **Archive**: `archive/` - Original conversation files for reference

### Files to Create

- **Unanswered Sections**: `04_` through `16_` - Question templates ready for answers
- **Master Compilation**: Future complete reference document

---

## 🚀 Next Steps

1. **Immediate Priority**: Section 11 — Testing & Quality Assurance (12 questions)
2. **Then**: Section 12 — Design System & UI/UX Guidelines
3. **Review**: Quick pass on Sections 8–10 coherence before PRD authoring

_This index is automatically maintained and should be updated when questions are answered or new questions are added._

---

## New Sections

1. [Web Demo & Brand Experience](14_web_demo_brand_experience.md) — starts at question 208
1. [Reflection](15_reflection.md) — starts at question 216

<!-- Alignment: Questionnaire remains the live source for clarifications; terminology updated to “active region”. -->
