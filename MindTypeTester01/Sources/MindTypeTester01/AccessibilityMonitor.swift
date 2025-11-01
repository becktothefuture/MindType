/*╔══════════════════════════════════════════════════════╗
  ║  ░  A C C E S S I B I L I T Y   M O N I T O R  ░░░░░  ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
  • WHAT ▸ System-wide text field monitoring for caret position detection
  • WHY  ▸ Track cursor position across all macOS apps to show ⠶ overlay
  • HOW  ▸ AX APIs with secure field detection and caret position extraction
*/

import Cocoa
import ApplicationServices

/// Monitors system-wide text field focus changes and caret positions
final class AccessibilityMonitor {
    private var axObserver: AXObserver?
    private var currentElement: AXUIElement?
    private var isMonitoring = false
    private var caretUpdateCallback: ((AXUIElement, CGPoint) async -> Void)?
    
    // Security guards - exclude sensitive fields
    private let secureFieldTypes = [
        "AXSecureTextField",
        "AXPasswordField", 
        "NSSecureTextField"
    ]
    
    private var isIMEActive = false
    private var lastCaretPosition = CGPoint.zero
    
    /// Start monitoring with async callback for caret position updates
    func start(_ callback: @escaping (AXUIElement, CGPoint) async -> Void) {
        guard !isMonitoring else { return }
        
        caretUpdateCallback = callback
        
        // Verify accessibility permissions
        guard AXIsProcessTrusted() else {
            print("❌ Accessibility permissions required for Mind⠶type⠶Tester⠶01")
            return
        }
        
        setupGlobalMonitoring()
        isMonitoring = true
        print("✅ Accessibility monitoring started for Mind⠶type⠶Tester⠶01")
    }
    
    /// Stop monitoring and cleanup resources
    func stop() {
        guard isMonitoring else { return }
        
        if let observer = axObserver {
            CFRunLoopRemoveSource(
                CFRunLoopGetCurrent(),
                AXObserverGetRunLoopSource(observer),
                .defaultMode
            )
        }
        
        axObserver = nil
        currentElement = nil
        caretUpdateCallback = nil
        isMonitoring = false
        print("⏹️ Accessibility monitoring stopped")
    }
    
    /// Setup global accessibility monitoring for focus changes
    private func setupGlobalMonitoring() {
        let systemWideElement = AXUIElementCreateSystemWide()
        
        var observer: AXObserver?
        let result = AXObserverCreate(getpid(), { observer, element, notification, userData in
            guard let monitor = Unmanaged<AccessibilityMonitor>.fromOpaque(userData!).takeUnretainedValue() else { return }
            monitor.handleAccessibilityNotification(element: element, notification: notification)
        }, &observer)
        
        guard result == .success, let axObserver = observer else {
            print("❌ Failed to create AX observer")
            return
        }
        
        self.axObserver = axObserver
        
        // Add to run loop for continuous monitoring
        CFRunLoopAddSource(
            CFRunLoopGetCurrent(),
            AXObserverGetRunLoopSource(axObserver),
            .defaultMode
        )
        
        // Monitor focus changes system-wide
        let selfPtr = Unmanaged.passUnretained(self).toOpaque()
        AXObserverAddNotification(axObserver, systemWideElement, kAXFocusedUIElementChangedNotification, selfPtr)
        
        print("✅ Global AX monitoring configured")
    }
    
    /// Handle accessibility notifications for focus and text changes
    private func handleAccessibilityNotification(element: AXUIElement, notification: CFString) {
        switch notification {
        case kAXFocusedUIElementChangedNotification:
            handleFocusChange(element: element)
            
        case kAXValueChangedNotification:
            handleTextChange(element: element)
            
        case kAXSelectedTextChangedNotification:
            handleSelectionChange(element: element)
            
        default:
            break
        }
    }
    
    /// Handle when focus changes to a new text field
    private func handleFocusChange(element: AXUIElement) {
        currentElement = element
        
        // Skip secure fields for privacy
        if isSecureField(element) {
            print("🔒 Secure field detected - skipping")
            return
        }
        
        // Update IME status
        updateIMEStatus()
        
        // Get caret position and notify callback
        if let caretPosition = getCaretPosition(from: element) {
            // Only notify if position actually changed
            if caretPosition != lastCaretPosition {
                lastCaretPosition = caretPosition
                Task {
                    await caretUpdateCallback?(element, caretPosition)
                }
            }
        }
    }
    
    /// Handle text content changes
    private func handleTextChange(element: AXUIElement) {
        guard !isIMEActive else { return }
        guard !isSecureField(element) else { return }
        
        // Update caret position when text changes
        if let caretPosition = getCaretPosition(from: element) {
            if caretPosition != lastCaretPosition {
                lastCaretPosition = caretPosition
                Task {
                    await caretUpdateCallback?(element, caretPosition)
                }
            }
        }
    }
    
    /// Handle selection/caret position changes
    private func handleSelectionChange(element: AXUIElement) {
        guard !isIMEActive else { return }
        guard !isSecureField(element) else { return }
        
        // Update caret position when selection changes
        if let caretPosition = getCaretPosition(from: element) {
            if caretPosition != lastCaretPosition {
                lastCaretPosition = caretPosition
                Task {
                    await caretUpdateCallback?(element, caretPosition)
                }
            }
        }
    }
    
    /// Check if element is a secure field that should be excluded
    private func isSecureField(_ element: AXUIElement) -> Bool {
        var roleValue: CFTypeRef?
        guard AXUIElementCopyAttributeValue(element, kAXRoleAttribute, &roleValue) == .success else {
            return false
        }
        
        if let role = roleValue as? String {
            return secureFieldTypes.contains(role)
        }
        
        return false
    }
    
    /// Get current caret position in screen coordinates
    private func getCaretPosition(from element: AXUIElement) -> CGPoint? {
        // Base element position
        var positionValue: CFTypeRef?
        guard AXUIElementCopyAttributeValue(element, kAXPositionAttribute, &positionValue) == .success,
              let origin = positionValue as? CGPoint else {
            return nil
        }

        // Try parameterized attribute for caret bounds if available
        // Prefer using the selected text range (insertion point when length == 0)
        var selectedRangeValue: CFTypeRef?
        var caretRange: CFRange = CFRange(location: 0, length: 0)
        if AXUIElementCopyAttributeValue(element, kAXSelectedTextRangeAttribute, &selectedRangeValue) == .success,
           let axRange = selectedRangeValue as? AXValue,
           AXValueGetType(axRange) == .cfRange {
            var r = CFRange()
            if AXValueGetValue(axRange, .cfRange, &r) {
                caretRange = r
            }
        }
        var caretBoundsValue: Unmanaged<AnyObject>?
        let hasCaretBounds = AXUIElementCopyParameterizedAttributeValue(
            element,
            kAXBoundsForRangeParameterizedAttribute,
            caretRange as CFTypeRef,
            &caretBoundsValue
        ) == .success

        if hasCaretBounds, let boxed = caretBoundsValue?.takeRetainedValue() as? AXValue {
            var rect = CGRect.zero
            if AXValueGetType(boxed) == .cgRect, AXValueGetValue(boxed, .cgRect, &rect) {
                // AX gives us screen coordinates already for bounds-for-range
                return CGPoint(x: rect.maxX + 2, y: rect.midY)
            }
        }

        // Fallback: approximate using line number + rough metrics
        var caretLineValue: CFTypeRef?
        guard AXUIElementCopyAttributeValue(element, kAXInsertionPointLineNumberAttribute, &caretLineValue) == .success,
              let caretLine = caretLineValue as? Int else {
            return nil
        }

        let lineHeight: CGFloat = 20
        let caretX = origin.x + 8
        let caretY = origin.y + (CGFloat(caretLine) * lineHeight) + (lineHeight / 2)
        return CGPoint(x: caretX, y: caretY)
    }
    
    /// Update IME (Input Method Editor) status for accurate caret tracking
    private func updateIMEStatus() {
        let inputSource = TISCopyCurrentKeyboardInputSource()
        if let inputSource = inputSource?.takeUnretainedValue() {
            let sourceID = TISGetInputSourceProperty(inputSource, kTISPropertyInputSourceID)
            let sourceIDString = Unmanaged<CFString>.fromOpaque(sourceID!).takeUnretainedValue() as String
            
            // Common IME input source patterns
            isIMEActive = sourceIDString.contains("IM") || 
                         sourceIDString.contains("Input") ||
                         sourceIDString.contains("Pinyin") ||
                         sourceIDString.contains("Hiragana")
        }
    }
    
    deinit {
        stop()
    }
}
