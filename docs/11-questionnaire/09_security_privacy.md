# Security & Privacy Implementation

_MindTyper Deep-Dive Questionnaire — Section 9 of 13_

**Progress: 12/12 questions (100%)**

This section defines MindTyper's security architecture, privacy protections, and compliance requirements. Trust is existential for a typing assistant.

---

**156. Privacy-by-Design Implementation?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Principle: No input content ever leaves the device. All inference, context handling, and decisions occur locally.
- Data minimization: Keystrokes and surrounding context are processed in an ephemeral RAM buffer only; never written to disk.
- Purpose limitation: Data collected is strictly limited to making on‑device corrections and personalization; no secondary use.
- User control: Clear, in‑product controls to view, reset, and export non‑content data (e.g., user dictionary, personalization deltas).
- Transparency: First‑run privacy explainer and always‑available privacy page stating "Zero cloud input" and what little metadata exists.
- Default‑off external comms: App functions 100% offline by default. Optional telemetry is opt‑in and content‑free.
- Secure defaults: Local encryption for any stored preferences/dictionaries; signed/notarized binaries; least‑privilege permissions.

---

**157. Data Classification & Handling?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Input content (keystrokes, selected text, caret context): Highly Sensitive. Processing: ephemeral RAM only. Storage: none. Transmission: never.
- Derived features (tokens, noise/adjacency features): Sensitive. Processing: RAM only. Storage: none. Transmission: never.
- Personalization deltas (LoRA adapters, lexicon boosts, user rules): Personal. Storage: encrypted locally. Retention: rotating compaction; user can reset anytime.
- Preferences/settings: Low. Storage: encrypted locally (DB + OS keychain for secrets). Transmission: never by default.
- Telemetry/performance metrics (optional): Minimal. Content‑free counters/timings only, opt‑in, anonymized/aggregated.
- Crash logs (optional): Sanitized stack traces only, stripped of content/PII; opt‑in; may be stored locally and sent only if the user consents.

---

**158. Encryption & Key Management?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- At rest: Encrypt SQLite data (preferences, dictionaries, personalization deltas) using AES‑256‑GCM with a per‑device key.
- Key storage: Keys generated with secure RNG and stored in macOS Keychain; never hard‑coded or exportable in plaintext.
- Key rotation: Rotate on major version upgrades or upon suspected compromise; support re‑encrypt‑in‑place.
- In transit: No input content transmitted. For optional licensing/updates, enforce TLS 1.3 with cert pinning and signed payloads.
- Integrity: All model/dictionary updates are signed; verify signature before load; maintain last‑known‑good rollback.

---

- Clarifier 9.3.a — Keychain Failure & Signature Mismatch UX
  - UX copy: show a single, human message (no error codes). Example: "We couldn’t verify a security key. Retrying in the background. Your typing is safe."
  - Retry: exponential backoff with jitter for keychain access and signature checks; cap retries; never block typing.
  - Fallback: immediately fall back to last‑known‑good model/assets on signature mismatch; queue integrity recheck.
  - Re‑auth: prompt only if entitlement truly invalid and only when idle; never interrupt mid‑session.

---

**159. Access Control & Authentication?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Identity: Accounts required for licensing/subscriptions (Sign in with Apple supported). Device‑bound entitlement stored in Keychain; no keyboard input ever transmitted.
- Local access: Optional app lock using biometrics (Touch ID) or password for opening settings and exporting data.
- Authorization: Least‑privilege entitlements; request Accessibility permission only to edit text fields.
- Data rights: In‑app controls to export/reset dictionaries and personalization; immediate local deletion honored.
- Multi‑device: Not required for v1. If offered later (settings sync), it will exclude input content and be E2E‑encrypted.

---

**160. Compliance Framework?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- GDPR/CCPA by design: Data minimization, purpose limitation, local processing, opt‑in telemetry, and user rights (export/delete) built‑in.
- COPPA: Not targeting children; no age‑related processing; no sensitive content transmission.
- SOC 2 scope: Limited (no user content servers). If licensing/sync exists, scope those minimal services; maintain security policies and audits.
- DPIA: Maintain a Data Protection Impact Assessment reflecting "no cloud input" posture and local‑only processing.
- Records of processing: Minimal registry documenting local categories and optional, content‑free telemetry.

---

**161. Vulnerability Management?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Scanning: Automated dependency scanning (e.g., Dependabot) and SAST in CI for Swift and Rust.
- Patching: Critical fixes within 48 hours; high within 7 days; regular monthly dependency updates.
- Hardening: Code signing and notarization; binary integrity checks; entitlements minimized.
- Disclosure: Coordinated disclosure policy and security.txt; dedicated security contact; CVE tracking if applicable.
- Runtime protections: AddressSanitizer/memcheck in CI; hardened Rust core; fuzzing of parsers/tokenizers.

---

**162. Incident Response Plan?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Detection: Monitor code signing/reporting channels and crash trends; triage within 24 hours.
- Containment: Revoke compromised certificates, disable update channels if needed, and ship emergency hotfix.
- Assessment: Scope impact (no input content exfiltration by design); verify integrity of local stores and binaries.
- Communication: Clear, user‑friendly notices in‑app and on site; disclose scope, mitigations, and required user actions.
- Recovery: Rollback to signed last‑known‑good; post‑incident review with actionable remediations.

---

**163. Secure Development Practices?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Shift‑left security: Feature‑level threat modeling; mandatory security review for risky changes.
- Code hygiene: Static analysis (SwiftLint, Clippy), secret scanning, commit signing, and protected branches.
- Testing: Unit/integration tests + fuzz tests for the Rust core; regression tests for privacy boundaries.
- Reproducibility: Lockfiles for SwiftPM/Cargo; deterministic builds on macOS runners.
- Supply chain: Only signed dependencies; SBOM generated per release; verify checksums in CI.

---

**164. Third-Party Security?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Minimal third‑party surface: No SDKs or libraries that inspect keystrokes or capture content.
- Vetting: Vendor security assessments for any network service (licensing/updates); DPAs and SCCs where required.
- Dependency policy: Allow‑list critical deps; automated CVE monitoring; replace or patch quickly when issues arise.
- Runtime isolation: Sandbox entitlements; avoid dynamic code loading; restrict outbound network by default.

---

**165. User Security Education?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Onboarding: "Your input never leaves your device" highlighted; quick tour of permissions and why they’re needed.
- Privacy dashboard: Shows what is stored locally (dictionaries/personalization), with one‑click clear/export.
- Controls: Obvious toggles for telemetry (off by default) and network usage.
- Notifications: Human‑readable security notices only when action is required; avoid alarmism.

---

**166. Audit & Compliance Monitoring?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- CI checks: Automated compliance linting (telemetry off by default, no content collection), license/notice verification, SBOM diff checks.
- Internal reviews: Quarterly privacy/security reviews against the DPIA and threat model.
- External: Annual third‑party review of binaries/signing/update pipeline; optional penetration testing of any cloud endpoints.
- Reporting: Publish a short privacy/security transparency note per major release.

- Clarifier 9.11.a — Logging Schema Whitelist
  - Restrict logs to device class, OS version, app version, counters, latency histograms, crash signatures.
  - Exclude any content, text fragments, or identifiers; redact file paths and window titles.

---

**167. Cross-Border Data Handling?**
_Primer: Clarifies this decision and why it matters._
→ Your answer:

- Input content residency: Not applicable — input content never leaves the device.
- Minimal network use: If enabled, licensing and update checks transmit no input content or identifiers beyond anonymous tokens.
- Minimal network use: If enabled, licensing and update checks transmit no input content; send only content‑free entitlement tokens.
- Jurisdictions: Use regional endpoints/CDN where feasible; apply SCCs/adequacy mechanisms to any minimal metadata.
- User control: Full offline mode; users can disable networking from the app; functionality unaffected.

---

**Navigation:**
[← Technical Architecture](08_technical_architecture.md) | [Business Model & Strategy →](10_business_strategy.md)
