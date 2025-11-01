<!--══════════════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════════════╗
  ║  ░  C I   S E T U P   G U I D E  ░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
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
    • WHAT ▸ CI/CD setup guide for macOS build, signing, and notarization
    • WHY  ▸ Automate secure release pipeline with proper Apple compliance
    • HOW  ▸ Step-by-step GitHub Actions configuration with secrets management
-->

# CI/CD Setup Guide for macOS

## Overview

This guide walks through setting up automated builds, code signing, and notarization for the Mind⠶Flow macOS app using GitHub Actions.

## Prerequisites

### Apple Developer Account
- **Paid Apple Developer Program membership** ($99/year)
- **Developer ID certificates** for code signing
- **App Store Connect API key** for notarization

### Development Environment
- **Xcode 15+** with command line tools
- **macOS 14+** for building and testing
- **GitHub repository** with Actions enabled

## Step 1: Generate Certificates

### 1.1 Create Developer ID Certificates

1. **Open Keychain Access** on your Mac
2. **Request Certificate from Certificate Authority**:
   - Certificate Information: Your email and name
   - Request is: Saved to disk
   - Let me specify key pair information: ✓
   - Key Size: 2048 bits, Algorithm: RSA

3. **Upload to Apple Developer Portal**:
   - Go to [developer.apple.com](https://developer.apple.com)
   - Certificates, Identifiers & Profiles → Certificates
   - Create new "Developer ID Application" certificate
   - Upload your Certificate Signing Request (CSR)

4. **Download and Install**:
   - Download the certificate (.cer file)
   - Double-click to install in Keychain Access
   - Verify it appears in "My Certificates"

### 1.2 Export Certificate for CI

1. **In Keychain Access**:
   - Find your "Developer ID Application" certificate
   - Right-click → Export
   - Format: Personal Information Exchange (.p12)
   - Set a strong password (save for later)

2. **Convert to Base64**:
   ```bash
   base64 -i certificate.p12 -o certificate.txt
   ```

## Step 2: App Store Connect API Key

### 2.1 Create API Key

1. **Go to App Store Connect**:
   - [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - Users and Access → Keys → App Store Connect API

2. **Generate Key**:
   - Name: "CI Notarization Key"
   - Access: Developer
   - Download the .p8 file (save securely)
   - Note the Key ID and Issuer ID

### 2.2 API Key Information

You'll need these values for GitHub secrets:
- **Key ID**: 10-character identifier
- **Issuer ID**: UUID from App Store Connect
- **Team ID**: Your Apple Developer Team ID

## Step 3: Configure GitHub Secrets

### 3.1 Required Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions:

```bash
# Code Signing
SIGNING_CERTIFICATE_P12_DATA=<base64-encoded-certificate>
SIGNING_CERTIFICATE_PASSWORD=<certificate-password>

# Notarization
NOTARIZATION_USERNAME=<your-apple-id-email>
NOTARIZATION_PASSWORD=<app-specific-password>
NOTARIZATION_TEAM_ID=<your-team-id>
```

### 3.2 App-Specific Password

1. **Go to Apple ID account page**: [appleid.apple.com](https://appleid.apple.com)
2. **Sign-In and Security → App-Specific Passwords**
3. **Generate password** with label "GitHub Actions CI"
4. **Copy the password** (16 characters with dashes)

### 3.3 Find Your Team ID

```bash
# Method 1: Xcode
# Open Xcode → Preferences → Accounts → View Details
# Your Team ID is shown next to your team name

# Method 2: Developer Portal
# developer.apple.com → Membership → Team ID

# Method 3: Command line (if certificate is installed)
security find-identity -v -p codesigning
```

## Step 4: Test CI Pipeline

### 4.1 Trigger Build

1. **Push to main branch** or **create pull request**
2. **Check Actions tab** in GitHub repository
3. **Monitor build progress** and logs

### 4.2 Debug Common Issues

**Certificate Issues**:
```bash
# Check if certificate is properly imported
security find-identity -v -p codesigning

# Verify certificate chain
security verify-cert -c certificate.p12
```

**Notarization Issues**:
```bash
# Check notarization status
xcrun notarytool history --apple-id <email> --password <password> --team-id <team-id>

# Get detailed log for failed submission
xcrun notarytool log <submission-id> --apple-id <email> --password <password> --team-id <team-id>
```

**Build Issues**:
```bash
# Test XcodeGen locally
cd macOS
xcodegen generate --spec Template/project.yml

# Test Rust build
cd crates/core-rs
cargo build --features ffi
```

## Step 5: Release Process

### 5.1 Create Release

1. **Tag your release**:
   ```bash
   git tag v1.0.0
   git push origin v1.0.0
   ```

2. **CI automatically**:
   - Builds release configuration
   - Signs the app bundle
   - Submits for notarization
   - Creates DMG installer
   - Uploads to GitHub Releases

### 5.2 Manual Release Steps

If you need to create releases manually:

```bash
# 1. Build release
cd macOS
xcodegen generate --spec Template/project.yml
xcodebuild -project MindTypeStatusBar.xcodeproj -scheme MindTypeStatusBar -configuration Release archive

# 2. Export app
xcodebuild -exportArchive -archivePath MindTypeStatusBar.xcarchive -exportPath export -exportOptionsPlist ../scripts/ExportOptions.plist

# 3. Notarize
cd export
ditto -c -k --keepParent MindTypeStatusBar.app MindTypeStatusBar.zip
xcrun notarytool submit MindTypeStatusBar.zip --apple-id <email> --password <password> --team-id <team-id> --wait

# 4. Staple and verify
xcrun stapler staple MindTypeStatusBar.app
spctl --assess --verbose MindTypeStatusBar.app

# 5. Create DMG
create-dmg --volname "Mind⠶Flow" MindTypeStatusBar.dmg MindTypeStatusBar.app
```

## Step 6: Security Best Practices

### 6.1 Secret Management

- **Rotate certificates** annually before expiration
- **Use app-specific passwords** instead of main Apple ID password
- **Limit API key permissions** to minimum required scope
- **Monitor secret usage** in GitHub Actions logs

### 6.2 Build Security

- **Pin action versions** (use @v4 instead of @latest)
- **Verify checksums** of downloaded dependencies
- **Use ephemeral runners** for sensitive builds
- **Clean up artifacts** after successful releases

### 6.3 Access Control

- **Limit repository access** to essential team members
- **Use branch protection** rules for main branch
- **Require reviews** for CI configuration changes
- **Monitor failed builds** for potential security issues

## Troubleshooting

### Common Error Messages

**"No signing identity found"**:
- Certificate not properly imported to keychain
- Wrong certificate type (need Developer ID Application)
- Certificate expired or revoked

**"Notarization failed"**:
- App not properly signed
- Missing entitlements or privacy manifest
- Hardened runtime not enabled
- Invalid app-specific password

**"XcodeGen command not found"**:
- XcodeGen not installed in CI environment
- Wrong Homebrew formula name
- PATH not properly configured

### Getting Help

- **Apple Developer Forums**: [developer.apple.com/forums](https://developer.apple.com/forums)
- **GitHub Actions Docs**: [docs.github.com/actions](https://docs.github.com/actions)
- **XcodeGen Issues**: [github.com/yonaskolb/XcodeGen](https://github.com/yonaskolb/XcodeGen)

## Maintenance

### Regular Tasks

- **Update Xcode** and command line tools
- **Renew certificates** before expiration
- **Update GitHub Actions** to latest versions
- **Test release process** quarterly
- **Monitor build times** and optimize as needed

### Monitoring

- **Set up notifications** for failed builds
- **Track build metrics** (time, success rate)
- **Monitor certificate expiration** dates
- **Review security advisories** for dependencies

---

**Last Updated**: September 19, 2025  
**Next Review**: Before certificate renewal

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-19T12:00:00Z -->


