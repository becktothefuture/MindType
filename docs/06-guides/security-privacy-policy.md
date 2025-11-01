<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  S E C U R I T Y   &   P R I V A C Y   P O L I C Y  ░░░░  ║
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
    • WHAT ▸ Security posture and privacy policy for Mind⠶Flow macOS app
    • WHY  ▸ Define privacy-first approach and security guarantees
    • HOW  ▸ Clear policies with technical implementation details
-->

# Mind⠶Flow Security & Privacy Policy

## Privacy-First Design Principles

### Core Commitment
Mind⠶Flow is designed with **privacy by default**. We believe your thoughts and words are yours alone.

### Data Collection: Zero
- **No user text is stored** - All processing happens in memory and is immediately discarded
- **No analytics or telemetry** - We don't track usage patterns or collect statistics
- **No network communication** - All AI processing occurs entirely on your device
- **No user accounts** - No sign-up, login, or personal information required

### On-Device Processing
- **Local AI models** - Language models run entirely on your Mac using Apple Silicon
- **Memory-only processing** - Text corrections are computed in RAM and never written to disk
- **Immediate disposal** - All text data is cleared from memory after each correction
- **No cloud services** - Zero dependence on external servers or APIs

## Accessibility Permissions

### Why We Need Access
Mind⠶Flow requires **Accessibility permissions** to:
- Monitor typing in other applications
- Apply corrections to text fields
- Preserve your cursor position during corrections

### What We DON'T Do
- **No password field access** - Secure fields (passwords, credit cards) are automatically ignored
- **No screenshot capture** - We only access text content, never visual elements
- **No keystroke logging** - We don't record or store what you type
- **No application monitoring** - We don't track which apps you use

### Permission Control
- **User-controlled** - You can revoke permissions at any time in System Settings
- **Graceful degradation** - App continues to work (with reduced functionality) if permissions are denied
- **Clear prompts** - We explain exactly why permissions are needed before requesting

## Security Architecture

### App Sandbox
- **Sandboxed environment** - App runs in Apple's security container
- **Minimal entitlements** - Only essential permissions requested
- **No file system access** - Cannot read or write files outside app container
- **No network access** - Blocked from all internet communication

### Code Security
- **Hardened Runtime** - Protection against code injection and tampering
- **Code signing** - Verified Apple Developer signature on all binaries
- **Notarization** - Apple-verified malware scanning before distribution
- **System Integrity Protection** - Respects macOS security boundaries

### Memory Protection
- **Secure memory allocation** - Text processing uses protected memory regions
- **Automatic cleanup** - Memory is zeroed and freed immediately after use
- **No swap file exposure** - Sensitive data marked as non-swappable where possible
- **Buffer overflow protection** - Rust memory safety prevents common vulnerabilities

## Threat Model & Mitigations

### Threats We Protect Against

#### 1. Data Exfiltration
- **Threat**: Malicious access to user text
- **Mitigation**: No network access, sandboxed environment, memory-only processing

#### 2. Keystroke Logging
- **Threat**: Recording user input for malicious purposes
- **Mitigation**: No persistent storage, immediate memory cleanup, secure field detection

#### 3. Privilege Escalation
- **Threat**: Using AX permissions for unauthorized system access
- **Mitigation**: Minimal entitlements, sandboxed execution, Apple security review

#### 4. Supply Chain Attacks
- **Threat**: Compromised dependencies or build process
- **Mitigation**: Minimal dependencies, reproducible builds, code signing verification

### Security Boundaries

#### What We Can Access
- Text content in standard text fields (with user permission)
- Cursor position and text selection
- Input method state (to avoid interfering with IME)

#### What We Cannot Access
- Password fields or secure text inputs
- Other applications' private data
- File system outside app container
- Network resources or internet

## Diagnostics & Logging

### Local Diagnostics Only
- **Performance metrics** - Latency and memory usage (local only)
- **Error logging** - Crash logs stored locally for debugging
- **No remote reporting** - All diagnostics remain on your device

### User Control
- **Opt-in crash reporting** - You choose whether to share crash logs
- **Diagnostic data viewing** - You can inspect all logged data
- **Data deletion** - Clear all diagnostic data at any time

### What We Log
- Correction latency measurements (no text content)
- Memory usage statistics
- Error conditions and recovery actions
- Performance benchmarks

### What We DON'T Log
- User text content or corrections
- Application names or usage patterns
- Personal information or identifiers
- Network activity (none exists)

## Compliance & Standards

### Apple Platform Compliance
- **Human Interface Guidelines** - Follows Apple's design and behavior standards
- **App Store Review Guidelines** - Meets all privacy and security requirements
- **Privacy Manifest** - Declares all API usage with required reasons
- **Accessibility Guidelines** - Proper VoiceOver and keyboard navigation support

### Industry Standards
- **OWASP Mobile Security** - Follows mobile app security best practices
- **Privacy by Design** - Built with privacy as a foundational principle
- **Minimal Data Collection** - Collects only what's absolutely necessary (nothing)
- **User Control** - Users maintain full control over their data and permissions

## User Rights & Control

### Your Rights
- **Right to know** - This policy explains exactly what we do and don't do
- **Right to control** - Manage permissions through System Settings
- **Right to delete** - Remove app and all data at any time
- **Right to transparency** - Open source components available for review

### How to Exercise Rights
- **View permissions**: System Settings → Privacy & Security → Accessibility
- **Revoke access**: Toggle off Mind⠶Flow in Accessibility settings
- **Delete data**: Uninstall app (no data persists after removal)
- **Contact us**: privacy@mindflow.app for questions or concerns

## Updates & Changes

### Policy Updates
- **Notification** - Users notified of any privacy policy changes
- **Version tracking** - Each policy version is dated and archived
- **No retroactive changes** - New policies don't affect existing installations without user consent

### Security Updates
- **Automatic updates** - Security patches delivered through App Store or auto-updater
- **Transparency** - Security fixes documented in release notes
- **Emergency response** - Critical security issues addressed within 24 hours

## Contact & Support

### Privacy Questions
- **Email**: privacy@mindflow.app
- **Response time**: Within 48 hours
- **Languages**: English (primary)

### Security Reports
- **Responsible disclosure** - security@mindflow.app
- **Bug bounty** - Rewards for verified security vulnerabilities
- **Public disclosure** - Security fixes disclosed after patches are available

### General Support
- **Documentation**: Available in app and online
- **Community**: GitHub discussions and issues
- **Feature requests**: Considered with privacy impact assessment

---

**Last Updated**: September 19, 2025  
**Effective Date**: Upon app installation  
**Policy Version**: 1.0

*This policy is designed to be clear and comprehensive. If you have questions about any aspect of our privacy or security practices, please don't hesitate to contact us.*

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-19T12:00:00Z -->


