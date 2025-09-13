# Business Model & Strategy

_MindTyper Deep-Dive Questionnaire — Section 10 of 13_

**Progress: 10/10 questions (100%)**

This section defines MindTyper's business model, go-to-market strategy, and revenue mechanisms.

---

**168. Revenue Model Architecture?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Pricing philosophy: Access‑pass model, simple, and privacy‑first. Accounts are required. Zero input data to cloud.
- Free plan: Provide an always‑available free tier with local usage limits based on active days.
  - Set limit to up to 7 active days per month (usage counted locally; resets monthly; never uploaded).
  - Require account sign‑in; process everything on device; show no watermark; include base features.
- Paid access: Offer MindTyper Plus Pass at $4.99 for 30‑day access or $39 for 12‑month access. Price below typical streaming services.
  - Grant unlimited usage (no active‑day caps) while a pass is active.
  - Include all current features and language/model packs; add future pro features in higher‑tier passes without degrading Plus.
- Billing & distribution: Sell passes directly (Stripe) and via Mac App Store in‑app purchases.
  - Issue an account‑linked entitlement token stored in Keychain (device‑bound); require sign‑in.
  - Perform content‑free entitlement check‑ins; honor a 7‑day offline grace period for connectivity issues without extending expired passes.
- Refunds: Honor a 14‑day no‑questions refund window for direct sales; follow App Store terms in‑store.
- Guardrails: Emphasize “100% on‑device, zero input to cloud.” Keep usage counters strictly local.

- Clarifier 10.7.a — Revenue Split Assumptions & Blends
  - Channels: assume Mac App Store 70/30 split; direct sales 97/3 (fees ≈ 3%).
  - Effective take rate by mix:

    | MAS/Direct Mix |       Effective Take        | ARPU Multiplier |
    | :------------: | :-------------------------: | :-------------: |
    |   30% / 70%    | 0.3×0.30 + 0.7×0.03 = 10.9% |     × 0.891     |
    |   50% / 50%    | 0.5×0.30 + 0.5×0.03 = 16.5% |     × 0.835     |
    |   70% / 30%    | 0.7×0.30 + 0.3×0.03 = 22.1% |     × 0.779     |

  - LTV impact: scale linearly with ARPU multiplier for first‑order planning; refine with retention by channel as data arrives.

- Clarifier 10.1.a — Direct Refund Policy
  - Honor 14‑day refunds for direct purchases; process within 48 hours.
  - Deny refunds only for clearly abusive usage (e.g., > 20 active days in a 30‑day pass).

- Clarifier 10.1.b — EDU Licensing
  - Validate .edu emails or approved institutions; issue a 12‑month Plus pass; limit one device active at a time.
  - Provide campus codes for labs; respect the 7‑day offline grace.

- Clarifier 10.1.c — Entitlement Offline Behavior
  - Grant a 7‑day offline grace when entitlement checks fail; show a gentle in‑app reminder starting day 5.
  - Never interrupt an active typing session on expiry; enforce at next app start or idle state.

---

**169. Target Market Segmentation?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Primary (launch): Writers, editors, journalists, and general macOS knowledge workers who type 4+ hours/day and want "noise → clean text" without breaking flow.
- Secondary: Non‑native English professionals and privacy‑sensitive roles (legal, healthcare, finance) requiring on‑device guarantees.
- Tertiary: Developers/engineers (not code-aware; still benefits on chats/docs), students, and light users on the free usage‑limited tier.
- Platform focus: macOS first (M‑series optimized; Intel supported). Windows follows post‑PMF using the same Rust core.
- Geography: English‑first (US, UK, CA, AU, NZ). Next: EU (DE/FR) with language packs; later: additional locales.
- Willingness to pay: Productivity‑driven users pay for Plus; students/light users remain on free tier.

---

**170. Competitive Positioning Strategy?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Category: Typing enhancement and input normalization — not a writing assistant.
- Core promise: Convert noisy input into clean text instantly, across all apps, with zero input sent to cloud.
- Differentiators:
  - Prioritize flow: keep keystroke‑level corrections at p95 ≤ 15 ms; never block typing.
  - Enforce privacy‑by‑design: run 100% of inference on‑device; require accounts for licensing/access passes only; keep content on device.
  - Lean on macOS‑native performance: use ANE‑optimized Core ML, a Swift UI shell, and a Rust core under strict CPU/RAM budgets.
  - Cover the whole system: operate via the Accessibility layer, not one editor or website.
  - Simplify pricing: sell affordable access passes below streaming services; keep a generous free tier.
- Position vs Grammarly/LLM tools: They optimize prose/grammar with cloud or heavy models; MindTyper optimizes input fidelity and flow locally. Encourage complementary use.
- Messaging pillars: "Private. Instant. System‑wide."

---

**171. Go-to-Market Strategy?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Objectives: Slow, controlled ramp; prove PMF with writers/knowledge workers; keep infra/support load low; maintain privacy trust.
- Positioning reminder: "Private. Instant. System‑wide." — noise → clean text, on‑device.

- Phase 0 (2–3 weeks): Foundations
  - Landing page with clear demo GIFs/video (before/after typing), privacy stance, pricing, and waitlist (email + Sign in with Apple).
  - Press kit: logo, short video, screenshots, performance/latency numbers, privacy one‑pager.
  - Creator list: 20–30 writers/productivity/macOS reviewers to seed (MacStories, 9to5Mac, The Sweet Setup, Setapp blog, Daring Fireball tips, writer YouTubers).

- Phase 1 (Weeks 1–4): Private beta (invite‑only)
  - Target users: writers/editors/journalists + privacy communities (r/macapps, r/privacytools, Mastodon macOS circles).
  - Admission: 100–300 invites in tranches of 25–50/week; in‑app feedback link; lightweight NPS + “what broke?” prompt.
  - Ask for: 30‑sec device‑class perf snapshot (opt‑in, content‑free), testimonial quotes, and permission to use anonymized results.
  - Reward referrals: +7 extra free active days per successful referral during beta.

- Phase 2 (Weeks 5–8): Public beta soft‑launch
  - Channels: Product Hunt, Indie Hackers “Launch”, macOS subreddits, writing communities (Medium writers, Substack office hours), privacy newsletters.
  - Content: 3 short posts — (1) Why on‑device typing matters, (2) Latency & flow case study, (3) How we protect privacy (deep dive).
  - Social proof: Homepage carousel with quotes + short clips; publish latency charts vs budget.
  - Support scale: office hours weekly (1 hr), canned responses/FAQ, bug template; cap new users if support queue > 48 hrs.

- Phase 3 (Weeks 9–12): macOS press + creator reviews
  - Embargoed review builds to 10–15 creators; provide storyline and B‑roll.
  - Offer limited “Plus” coupons to audiences; track redemption rate; pause if infra strain.
  - App Store (if listed): optimize listing with privacy bullets, performance claims, and short video.

- Always‑on tactics
  - Web demo: safe, synthetic text box to showcase behavior (no keystrokes uploaded); pairs with landing page.
  - Referral: simple link gives referrer +1 month Plus, referee +14 days Plus (cap to control cost).
  - Email: monthly product notes and tips (no tracking pixels); announce major updates.
  - Community: lightweight Discord or Discourse, moderated; focus on release notes, tips, and feedback threads.

- Measurement (privacy‑safe, opt‑in where required)
  - Activation: install → first suggestion applied within 10 minutes.
  - Conversion: free → Plus within 7 days; target ≥ 8% early, ≥ 12% post‑press.
  - Retention: Day‑7/Day‑30 active; target ≥ 40% / ≥ 25%.
  - Performance: p95 latency on user devices vs budget; undo rate as proxy for false positives.

- Resourcing & ramp control
  - Weekly invite cap tied to support bandwidth; pause invites if unresolved tickets > 30 or SLA > 48 hrs.
  - Feature flags for risky heuristics; staged rollouts 1% → 10% → 100%.
  - Pricing experiments: A/B annual vs monthly emphasis; student discount code for .edu emails.

- Messaging angles by audience
  - Writers/editors: “Never leak your draft. Fixes as you type, without breaking flow.”
  - Knowledge workers: “Cleaner emails and docs, system‑wide, private by default.”
  - Privacy‑sensitive roles: “Zero input to cloud. Auditable, on‑device.”

- Clarifier 10.4.a — Incident Communication Thresholds
  - Trigger an in‑app banner for beta when crash‑free < 99.5% over 48 hours or p95 latency exceeds target by > 10%.
  - Post a public note for production only when systemic issues persist > 72 hours.

---

**172. Customer Acquisition & Retention?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Acquisition (high‑class, organic‑first)
  - Earned channels: macOS/privacy/writing media, creator reviews, Product Hunt, writing communities; no intrusive growth hacks.
  - Tasteful paid (later): Apple Search Ads on exact‑match terms and niche writer newsletters; no cross‑site tracking or retargeting.
  - SEO: Own “on‑device typing”, “private typing assistant”, “Caps‑Lock typing utility” topics with honest, design‑led content.
- Onboarding (respectful, elegant)
  - 90‑second guided setup with plain‑language privacy: “keyboard input never leaves your device.” Minimal permissions.
  - Live demo and first “aha” within 2 minutes; native visuals, accessible by default, no dark patterns.
- Retention (value > nudges)
  - Gentle weekly tips and optional keyboard‑shortcut tour; non‑intrusive by design.
  - Local insights: optional monthly email or in‑app card summarizing usage and time saved, computed on‑device; no content ever transmitted.
  - Support: 48‑hour response SLA during beta; content‑free diagnostics; respectful tone.
- Churn prevention
  - Per‑app scopes and aggressiveness sliders; one‑click pause/quiet hours; sensitive‑app defaults.
  - Easy downgrade to free; fair refunds; optional exit survey.

---

**173. Partnership & Distribution Strategy?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Distribution
  - Direct download with account sign‑in; Mac App Store presence when review friction is acceptable.
  - Teams: volume licensing via redeemable codes and MDM‑friendly installer; device‑bound entitlements.
- Partnerships (careful, brand‑safe)
  - macOS and writing ecosystem reviewers/creators for launch coverage.
  - Privacy organizations for third‑party reviews/endorsements; publish a single independent privacy review.
  - Education: journalism/writing programs for campus licensing (Plus included).
- Integrations (selective)
  - Public, documented FFI for future platform shells; avoid deep third‑party editor plug‑ins initially to limit support burden.
  - Later: Shortcuts/automation hooks that never expose content.
- Guardrails
  - No partnerships that require content sharing or erode on‑device guarantees.
  - Maintain brand, pricing integrity, design standards across channels.

---

**174. Financial Projections & Unit Economics?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Pricing (recap): Plus Pass $4.99/30‑day or $39/12‑month; free tier with usage limits.
- Assumptions (Year 1 → Year 2)
  - Free → Paid conversion: set target to 8–12% in Y1; raise to 12–16% in Y2 with onboarding polish and creator reviews.
  - 30‑day repurchase rate: set target to ≥ 55% by month 9.
  - 12‑month renewal rate: set target to ≥ 60% by month 15.
  - Payment fees: keep ~3% (direct). Apply App Store take to in‑app purchases.
  - COGS: keep low (on‑device). Major costs = support, macOS runners/CI, website, minimal telemetry/crash infra.
- Unit economics targets
  - ARPU (blended): raise to ≥ $2.20/month equivalent by month 9.
  - LTV (12‑mo view): raise to ≥ $40; maintain LTV:CAC ≥ 4:1 via predominantly organic channels.
  - CAC: cap at ≤ $8 blended in Y1; ≤ $12 with selective paid tests.
- Breakeven scenarios
  - Hit cash‑flow breakeven at ~3–5K paying users (depends on support staffing and infra choices).
  - Sensitivity: recognize that −5 pts in repurchase/renewal reduces LTV ~10–15%; mitigate via per‑app controls and onboarding.

---

**175. International Expansion Plan?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Phase 1: English‑first markets (US, UK, CA, AU, NZ). Localized pricing/taxes; regional endpoints for licensing/updates.
- Phase 2: EU (DE, FR) with language packs; localized site copy and privacy pages; comply with local consumer laws and VAT.
- Phase 3: Additional locales (ES, IT, Nordics, JP) as language packs mature and support bandwidth grows.
- Ops: per‑locale support macros, local currency pricing, refund policies per region.
- Privacy posture unchanged globally: no keyboard input leaves the device; only content‑free licensing/updates.

---

**176. Risk Assessment & Mitigation?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Competitive copy/OS features
  - Mitigation: own the “noise → clean text, on‑device” niche; superior latency, elegance; ship fast with feature flags.
- Privacy scrutiny/perception
  - Mitigation: third‑party privacy review; transparent docs; clear in‑product disclosures; no telemetry by default.
- Latency/accuracy on older hardware
  - Mitigation: slim model pack; heuristics fallback; device‑class tuning; caps in low‑power mode.
- Support overload during launch
  - Mitigation: invite caps; office hours; templated responses; pause growth if SLA breached.
- Store policy or payment friction
  - Mitigation: dual channels (direct + MAS); clear refund policy; fallback purchase options.
- Brand dilution via cluttered UX
  - Mitigation: design reviews as a release gate; minimal UI; consistent typography and motion; accessibility audits.

---

**177. Success Metrics & KPIs?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Product/usage (opt‑in, content‑free)
  - Activation rate: install → first suggestion applied within 10 minutes.
  - Suggestion acceptance rate: ≥ 25% at week 1; ≥ 35% by week 4.
  - Undo rate (false‑positive proxy): ≤ 0.5% of edits.
  - p95 keystroke→suggestion latency: ≤ 15 ms (M‑series), ≤ 30 ms (Intel).
- Business
  - Free → Plus conversion: achieve ≥ 8% early; sustain ≥ 12%.
  - Repurchase/renewal: achieve ≥ 55% 30‑day repurchase and ≥ 60% 12‑month renewal.
  - Refunds: hold refunds ≤ 2% of payments.
  - LTV:CAC ≥ 4:1; ARPU ≥ $2.20 by month 9.
- Experience/brand
  - NPS ≥ 50 with writers/knowledge workers segment.
  - Support SLA: 95% of tickets answered within 48 hours.
  - Accessibility score: internal checklist pass rate ≥ 95% per release.

---

**Navigation:**
[← Security & Privacy](09_security_privacy.md) | [Testing & Quality Assurance →](11_testing_qa.md)
