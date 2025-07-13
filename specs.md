MindType – End-to-End Engineering Specification

(Comprehensive v1.0 draft – all chapters 0 – 18 in one place)

⸻

0 • Product Mindset

Deliverable	Purpose	Tech tiers
Web Demo (mindtype.app/demo)	Showcase the “magic” in a browser – collect emails for beta	React + TypeScript (Vite) - shared core in TS
macOS Menu-Bar App (MindType.app)	Always-on assistant correcting any focused text field across the OS	Swift/SwiftUI UI, AppKit + Accessibility; core logic ported from TS

Guiding principles
	1.	One pipeline – pause-detect → extract fragment → stream LLM → diff/merge → inject.
	2.	Non-intrusive – never block / steal shortcuts; single undo step; minimal resource draw.
	3.	Privacy-first – send only the last fragment (≤ 250 chars), show a live log, allow local-only mode.

⸻

1 • Folder & Project Layout

mindtype/
├─ packages/
│  ├─ core-ts/          # shared logic (TypeScript)
│  └─ diff-match-patch/ # git submodule
├─ web-demo/            # Vite React demo
│  └─ src/…
└─ mac/
   ├─ MindType.xcodeproj
   ├─ Accessibility/    # AXWatcher.swift, MacInjector.swift
   ├─ Core/             # PauseTimer.swift, FragmentExtractor.swift, …
   └─ UI/               # MenuBarController.swift, SettingsWindow.swift


⸻

2 • Shared Algorithm (language-agnostic)

onKeyEvent -> pauseTimer.touch()
pauseTimer.idle -> {
    text, caret = getBuffer()
    fragment = extractFragment(text, caret)
    if length(fragment) < 3  → return
    stream = LLM.correct(fragment, contextAround)
    mergeEngine.applyStream(stream, fragmentRange)
}

Stage	Detail
Pause detection	Reset on every printable key. Default idle = 500 ms (user-config 200 – 1000 ms).
Fragment extraction	Look back to last . ? ! \n within 250 chars; else start of doc.
LLM call	GPT-3.5 Turbo / local Core ML. Prompt: “Fix spelling and grammar only…”. Stream on.
Diff & merge	diff-match-patch incremental patches every 3-4 tokens.
Injection	Replace only the fragment; preserve formatting, cursor, single undo layer.


⸻

3 • Browser Demo Implementation

Component	Purpose	Key points
Editable.tsx	<div contentEditable> typing area	Save/restore Selection; no preventDefault on shortcuts.
usePauseTimer.ts	Debounce hook	Uses requestAnimationFrame for accuracy.
useMindType.ts	Glue logic	Cancels in-flight stream if new keys arrive.
LLM client	Fetch + SSE polyfill	Streams tokens, yields every chunk.
UI polish	✔︎ flash, latency badge	CSS transitions only (no React re-renders).

Perf tricks:
	•	diff on requestIdleCallback, throttle to every 4th token; single execCommand('insertText') gives one undo.

⸻

4 • macOS App Implementation

Subsystem	File(s)	Highlights
Menu bar shell	MenuBarController.swift	Returns NSStatusItem with mic icon; toggles enable/disable.
Settings window	SettingsWindow.swift	SwiftUI sliders (Idle ms, Aggressiveness), toggle Cloud/Local.
EventTapMonitor	EventTap.swift	Passive CGEvent tap; ignore Command-modified keys.
AccessibilityWatcher	AXWatcher.swift	Observes kAXFocusedUIElementChanged, kAXValueChanged.
Fragment & diff	FragmentExtractor.swift, MergeEngine.swift	Direct Swift port of TS logic using Swift-DMP.
LLM client	LLMClient.swift	URLSession HTTP/2 stream → AsyncSequence of tokens.
MacInjector	MacInjector.swift	Set AXSelectedTextRange, clipboard swap (RTF + plain), synthetic Delete + Cmd-V, restore cursor & clipboard.

Edge guards:
	•	Skip fields where kAXSecureTextEntry = true.
	•	Wait for IME composition commit (kAXSelectedTextRange read-only).
	•	Cancel running stream on new key in same fragment.

⸻

5 • Performance Checklist

Metric	Target	Notes
Typing overhead	< 2 ms per keystroke	Event tap & AX watchers are lightweight.
Idle→first token	≤ 250 ms (cloud)	Local model goal ≤ 120 ms.
Full 20-word sentence	≤ 600 ms corrected	Using streaming diff.
Memory (mac)	< 150 MB incl. Core ML cache	Cloud-only mode < 50 MB.
CPU idle	< 5 % on M1	Background queue for diff/JSON.


⸻

6 • Security & Privacy
	1.	Prompt the user for Accessibility control on first launch.
	2.	Scope outbound data to fragment ±100 chars context.
	3.	TLS 1.3; pin OpenAI cert (optional).
	4.	Local-only mode toggle → fallback dictionary.
	5.	Clipboard hygiene – restore prior contents within 2 s.

⸻

7 • Testing Plan

Layer	Tests	Tool
Fragment extractor	Unit, property-based	Vitest / XCTest
Pause timer	Simulated 120 WPM bursts	XCTest
Merge engine	Fuzz diff vs patch	QuickCheck
AX injection	UI Automation across TextEdit, Mail, Slack	XCUITest
Undo integrity	Manual script: type → pause → Cmd-Z	
Web demo e2e	Cypress: type lorem → expect corrected	Cypress


⸻

8 • First-Time Mac-Dev Tips

Tip	Why
Use SwiftUI for UI, AppKit for system hooks	Keeps code modern yet powerful.
Develop unsigned first; codesign only when AX works	Hardened runtime can block AX if entitlements missing.
Keep a second user account for permissions reset tests	Simulates fresh install.
Test on Intel & Apple Silicon	AX timing differs.
Avoid Mac App Store at first	Accessibility control not allowed in sandbox.


⸻

9 • Roadmap After MVP

Version	Adds
v0.1	Web demo, basic mac injector, cloud LLM
v0.2	Streaming UI, settings pane, latency badge
v0.3	Local Core ML grammar model (offline)
v0.4	Personal dictionary, multi-language
v1.0	Hardened notarised release, auto-update, marketing push


⸻

10 • Code Skeletons (Copy-ready)

(excerpts – see previous answer for full files)

10.1 TypeScript core

// pauseTimer.ts
export class PauseTimer { … }

// fragment.ts
export function extractFragment(text, caret) { … }

10.2 mac Swift snippets

// PauseTimer.swift
final class PauseTimer { … }

// AXWatcher.swift
class AXWatcher { … }

(Full listings in the earlier add-on.)

⸻

11 • Attention Hot-Spots

Area	Watch-out
AX write errors	Some apps throttle; retry once then clipboard-paste fallback.
Undo stack splits	Wrap Delete+Paste in one NSUndoManager grouping for rich-text apps.
Typing mid-stream	Cancel stream, revert snapshot to avoid garbled output.
Secure input	Respect; never read or write.


⸻

12 • Performance Tricks
	1.	Token gating – run diff every 3–4 tokens, not each token.
	2.	Patch window – cap diff to last 250 chars.
	3.	Reuse DMP instance – heavy object creation avoided.
	4.	AX batching – group multiple attribute sets.
	5.	Connection reuse – single URLSession for all calls.

⸻

13 • Build & Ship Pipeline

Stage	Command
Web build	pnpm run build → dist/
Deploy	Netlify / rsync to VPS
mac Release	xcodebuild -scheme Release
Sign	codesign --deep --options runtime --sign "Developer ID" MindType.app
Notarise	xcrun notarytool submit MindType.zip … --wait
DMG	create-dmg … MindType.dmg
Auto-update	Sparkle 2 feed appcast.xml


⸻

14 • Local-Model Path
	1.	Pick BART-grammar-small (~120 MB).
	2.	Convert to Core ML with 8-bit quantisation.
	3.	Load via MLModel + GenerateTextRequest.
	4.	Fallback chain: Local > Cloud > Dictionary.

⸻

15 • Instrumentation

Metric	How
LLM cost	Log tokens_in/out to PostHog with user hash.
Latency	idle→firstToken median per hour.
Usage	Count fragments per day for engagement KPI.

Debug overlay shortcut ⌥⇧⌘L shows live latency + token count.

⸻

16 • Common Gotchas (Mac)

Symptom	Cause	Fix
AX failure after sign	Missing com.apple.security.device.accessibility	Add entitlement & re-sign.
Clipboard overwritten	Forgot restore	Store previous string, restore after 2 s.
App rejected by Gatekeeper	Not notarised	Run notarytool + staple.


⸻

17 • Simulating Edge Conditions

Scenario	Command
300 ms latency	sudo ipfw add pipe 1 delay 300ms
20 % packet loss	add plr 0.2 to pipe
Low-power CPU	renice +10 $(pgrep MindType)
Secure field	Test in Keychain; expect no reads/writes.
RTL text	System language Arabic; verify cursor restore.


⸻

18 • Next-Step Checklist
	•	Register mindtype.app + mindtype.ai
	•	Initialise repo; commit packages/core-ts with tests
	•	Hook useMindType into web demo; deploy preview
	•	Apply for OpenAI key; set spending cap £25
	•	Scaffold Xcode project; test AXWatcher in TextEdit
	•	Validate single-undo in Pages, Slack, Gmail (Chrome)
	•	Publish closed alpha DMG to testers within 3 weeks

⸻

You now have the full, end-to-end blueprint — code skeletons, performance tactics, and deployment steps. Fork it; ship it; refine it. MindType is ready to materialise.

