<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  M A C O S   C O M P L I A N C E   G U I D E  ░░░░░░░░░░  ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌                      ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
    • WHAT ▸ Comprehensive Apple compliance checklist for macOS Mind⠶Flow app
    • WHY  ▸ Ensure HIG, security, accessibility, and distribution compliance
    • HOW  ▸ Actionable checklist with Apple documentation links and verification steps
-->

# macOS Compliance Checklist

## Overview

This checklist ensures the Mind⠶Flow macOS app meets Apple's standards for Human Interface Guidelines (HIG), security, accessibility, and distribution requirements.

## Human Interface Guidelines (HIG)

### Menu Bar Extras
**Reference**: [HIG - Menu Bar Extras](https://developer.apple.com/design/human-interface-guidelines/menu-bar-extras)

- [ ] **Status Item Icon**
  - [ ] Use ⠶ symbol as template image (black with alpha)
  - [ ] Icon size: 16x16pt (32x32px @2x)
  - [ ] Provide accessible name: "Mind Flow"
  - [ ] Support dark/light appearance automatically
  - **Verification**: Test in both light and dark modes

- [ ] **Panel Design**
  - [ ] Width: 280-320pt (consistent with system)
  - [ ] Use `.ultraThinMaterial` background
  - [ ] Rounded corners: 12pt radius
  - [ ] Respect "Reduce Transparency" setting
  - [ ] Support High Contrast mode
  - **Verification**: Test with accessibility settings enabled

- [ ] **Typography & Spacing**
  - [ ] Use system fonts (SF Pro)
  - [ ] Follow 8pt grid system
  - [ ] Consistent margins: 16pt
  - [ ] Text hierarchy: Title/Body/Caption styles
  - **Verification**: Compare with system apps (Control Center, Notification Center)

### Keyboard Navigation
**Reference**: [HIG - Keyboard and Mouse](https://developer.apple.com/design/human-interface-guidelines/keyboards)

- [ ] **Focus Management**
  - [ ] Tab navigation through all controls
  - [ ] Visible focus indicators
  - [ ] Escape key closes panel
  - [ ] Return/Space activate buttons
  - **Verification**: Navigate entire UI using only keyboard

- [ ] **Shortcuts**
  - [ ] Global hotkey: Cmd+Alt+Z for rollback
  - [ ] No conflicts with system shortcuts
  - [ ] Document shortcuts in Help menu
  - **Verification**: Test in various apps for conflicts

## Accessibility (AX)

### Permission Management
**Reference**: [Accessibility on macOS](https://developer.apple.com/accessibility/mac/)

- [ ] **Trust Prompt**
  - [ ] Use `AXIsProcessTrustedWithOptions` with prompt
  - [ ] Clear explanation of why access is needed
  - [ ] Deep link to System Settings
  - [ ] Graceful degradation when denied
  - **Verification**: Test first-run experience and denial flow

- [ ] **Secure Context Detection**
  - [ ] Detect password fields (`kAXRoleSecureTextField`)
  - [ ] Detect IME active state
  - [ ] Disable corrections in secure contexts
  - [ ] No logging of secure field content
  - **Verification**: Test with 1Password, Keychain Access, Terminal sudo

### VoiceOver Support
**Reference**: [VoiceOver Testing](https://developer.apple.com/accessibility/mac/)

- [ ] **Screen Reader**
  - [ ] All controls have accessibility labels
  - [ ] Status updates announced (polite)
  - [ ] Correction changes batched (single announcement)
  - [ ] Testing Ground results readable
  - **Verification**: Complete workflow using only VoiceOver

- [ ] **Reduced Motion**
  - [ ] Respect `prefers-reduced-motion`
  - [ ] Disable braille animations when enabled
  - [ ] Provide static alternatives
  - **Verification**: Enable in System Settings and test

## Security & Distribution

### App Sandbox
**Reference**: [App Sandbox Design Guide](https://developer.apple.com/library/archive/documentation/Security/Conceptual/AppSandboxDesignGuide/)

- [ ] **Entitlements (Minimal)**
  ```xml
  <key>com.apple.security.app-sandbox</key>
  <true/>
  <key>com.apple.security.automation.apple-events</key>
  <true/>
  ```
  - [ ] No file system access beyond app container
  - [ ] No network access (local-only inference)
  - [ ] No camera/microphone access
  - **Verification**: App functions without additional entitlements

### Hardened Runtime
**Reference**: [Hardened Runtime](https://developer.apple.com/documentation/security/hardened_runtime)

- [ ] **Runtime Protections**
  - [ ] Enable hardened runtime flag
  - [ ] No runtime code injection
  - [ ] No dynamic library loading
  - [ ] Disable debugging for release builds
  - **Verification**: `codesign --display --verbose` shows hardened runtime

### Code Signing & Notarization
**Reference**: [Notarizing macOS Software](https://developer.apple.com/documentation/security/notarizing_macos_software_before_distribution)

- [ ] **Code Signing**
  - [ ] Valid Developer ID certificate
  - [ ] Sign all binaries and frameworks
  - [ ] Include secure timestamp
  - [ ] Verify signature: `codesign --verify --deep --strict`
  - **Verification**: Signature validates on clean system

- [ ] **Notarization**
  - [ ] Upload to Apple via `notarytool`
  - [ ] Staple notarization ticket
  - [ ] Verify: `spctl --assess --verbose`
  - [ ] Test on system without developer tools
  - **Verification**: App launches without warnings on fresh macOS

### Privacy Manifest
**Reference**: [Privacy Manifest Files](https://developer.apple.com/documentation/bundleresources/privacy_manifest_files)

- [ ] **PrivacyInfo.xcprivacy**
  ```xml
  <key>NSPrivacyCollectedDataTypes</key>
  <array/>
  <key>NSPrivacyTrackingDomains</key>
  <array/>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryAccessibility</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array>
        <string>84.1</string>
      </array>
    </dict>
  </array>
  ```
  - [ ] Declare AX API usage (reason 84.1: assistive features)
  - [ ] No data collection declared
  - [ ] No tracking domains
  - **Verification**: Privacy report shows correct declarations

## Performance Requirements

### Latency Targets
**Reference**: [Performance Best Practices](https://developer.apple.com/documentation/xcode/improving-your-app-s-performance)

- [ ] **Response Times**
  - [ ] Keystroke → decision: p95 ≤ 15ms (M-series)
  - [ ] Keystroke → decision: p99 ≤ 25ms (graceful degradation)
  - [ ] AX API calls: ≤ 5ms typical
  - [ ] FFI round-trip: ≤ 2ms typical
  - **Verification**: Measure with Instruments Time Profiler

### Resource Usage
- [ ] **Memory**
  - [ ] Idle state: ≤ 50MB RSS
  - [ ] Active correction: ≤ 300MB RSS peak
  - [ ] No memory leaks over 24h operation
  - **Verification**: Monitor with Activity Monitor and Instruments

- [ ] **CPU**
  - [ ] Idle state: ≤ 2% CPU average
  - [ ] Correction burst: ≤ 50% CPU peak (brief)
  - [ ] Background: ≤ 0.1% CPU when not typing
  - **Verification**: Profile with Instruments and Activity Monitor

### Energy Efficiency
- [ ] **Power Usage**
  - [ ] No significant battery drain when idle
  - [ ] Efficient model inference (use Neural Engine when available)
  - [ ] Suspend processing when system is sleeping
  - **Verification**: Energy Impact in Activity Monitor shows "Low"

## Testing & Quality Assurance

### Manual Testing Checklist
- [ ] **First Run Experience**
  - [ ] AX permission prompt appears and works
  - [ ] Status item appears in menu bar
  - [ ] Panel opens and displays correctly
  - [ ] Testing Ground window functions

- [ ] **Core Functionality**
  - [ ] Text corrections apply correctly
  - [ ] Caret position preserved
  - [ ] Rollback (Cmd+Alt+Z) works
  - [ ] Secure fields are ignored

- [ ] **Edge Cases**
  - [ ] Multiple displays (panel positioning)
  - [ ] System appearance changes (dark/light)
  - [ ] Accessibility settings (reduced motion, high contrast)
  - [ ] IME input (Chinese, Japanese, etc.)

### Automated Testing
- [ ] **Unit Tests**
  - [ ] Swift: XCTest for UI components and FFI bridge
  - [ ] Rust: `cargo test` for core logic
  - [ ] Coverage: ≥ 80% for critical paths

- [ ] **Integration Tests**
  - [ ] End-to-end correction pipeline
  - [ ] AX API interaction (mocked)
  - [ ] Error handling and recovery

## Distribution Readiness

### App Store (Optional)
**Reference**: [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)

- [ ] **Metadata**
  - [ ] App description explains AX requirement clearly
  - [ ] Screenshots show key features
  - [ ] Privacy policy (if collecting any data)
  - [ ] Age rating: 4+ (no objectionable content)

- [ ] **Review Preparation**
  - [ ] Demo account/instructions for reviewers
  - [ ] Clear explanation of AX permission need
  - [ ] Test on clean system without dev tools

### Direct Distribution
- [ ] **DMG Creation**
  - [ ] Signed disk image
  - [ ] Clear installation instructions
  - [ ] Uninstall instructions
  - [ ] License agreement

- [ ] **Documentation**
  - [ ] User guide with setup instructions
  - [ ] Troubleshooting guide
  - [ ] System requirements
  - [ ] Privacy policy

## Compliance Verification

### Final Checklist
- [ ] All items above completed and verified
- [ ] App tested on multiple macOS versions (14.0+)
- [ ] App tested on different Mac models (Intel/Apple Silicon)
- [ ] No console errors or warnings during normal operation
- [ ] Crash logs reviewed and addressed
- [ ] Performance benchmarks meet targets
- [ ] Security scan completed (no vulnerabilities)

### Sign-off
- [ ] **Development**: All features implemented and tested
- [ ] **QA**: Manual and automated tests pass
- [ ] **Security**: Security review completed
- [ ] **Legal**: Privacy policy and compliance verified
- [ ] **Release**: Ready for distribution

---

**Last Updated**: 2025-09-19  
**Next Review**: Before each major release

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-19T12:00:00Z -->


