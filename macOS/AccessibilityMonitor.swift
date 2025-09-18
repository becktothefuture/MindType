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
  • WHAT ▸ System-wide text field monitoring with security guards
  • WHY  ▸ Enable Mind⠶Flow corrections across all macOS apps
  • HOW  ▸ AX APIs with secure field/IME detection and caret safety
*/

import Cocoa
import ApplicationServices

class AccessibilityMonitor {
    private var axObserver: AXObserver?
    private var currentElement: AXUIElement?
    private var isMonitoring = false
    
    // Security guards
    private let secureFieldTypes = [
        "AXSecureTextField",
        "AXPasswordField", 
        "NSSecureTextField"
    ]
    
    private var isIMEActive = false
    private var lastText = ""
    private var lastCaret = 0
    
    func start() {
        guard !isMonitoring else { return }
        
        // Check accessibility permissions
        guard AXIsProcessTrusted() else {
            print("❌ Accessibility permissions required")
            requestAccessibilityPermissions()
            return
        }
        
        setupGlobalMonitoring()
        isMonitoring = true
        print("✅ Accessibility monitoring started")
    }
    
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
        isMonitoring = false
        print("⏹️ Accessibility monitoring stopped")
    }
    
    private func requestAccessibilityPermissions() {
        let alert = NSAlert()
        alert.messageText = "Mind⠶Flow Needs Accessibility Access"
        alert.informativeText = "To provide system-wide typing corrections, Mind⠶Flow needs permission to monitor text fields. This data never leaves your device."
        alert.addButton(withTitle: "Open System Preferences")
        alert.addButton(withTitle: "Cancel")
        
        if alert.runModal() == .alertFirstButtonReturn {
            let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")!
            NSWorkspace.shared.open(url)
        }
    }
    
    private func setupGlobalMonitoring() {
        // Monitor focused element changes
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
        
        // Add to run loop
        CFRunLoopAddSource(
            CFRunLoopGetCurrent(),
            AXObserverGetRunLoopSource(axObserver),
            .defaultMode
        )
        
        // Monitor focus changes
        let selfPtr = Unmanaged.passUnretained(self).toOpaque()
        AXObserverAddNotification(axObserver, systemWideElement, kAXFocusedUIElementChangedNotification, selfPtr)
        
        print("✅ Global AX monitoring configured")
    }
    
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
    
    private func handleFocusChange(element: AXUIElement) {
        currentElement = element
        
        // Check if focused element is a secure field
        if isSecureField(element) {
            print("🔒 Secure field detected - disabling corrections")
            return
        }
        
        // Check IME status
        updateIMEStatus()
        
        // Get initial text and caret position
        if let (text, caret) = getTextAndCaret(from: element) {
            lastText = text
            lastCaret = caret
            
            // Process with Mind⠶Flow pipeline
            processTextChange(text: text, caret: caret)
        }
    }
    
    private func handleTextChange(element: AXUIElement) {
        guard !isIMEActive else { return }
        guard !isSecureField(element) else { return }
        
        if let (text, caret) = getTextAndCaret(from: element) {
            // Only process if text actually changed
            if text != lastText || caret != lastCaret {
                lastText = text
                lastCaret = caret
                processTextChange(text: text, caret: caret)
            }
        }
    }
    
    private func handleSelectionChange(element: AXUIElement) {
        guard !isIMEActive else { return }
        guard !isSecureField(element) else { return }
        
        if let (text, caret) = getTextAndCaret(from: element) {
            lastCaret = caret
            // Update Active Region visualization if needed
        }
    }
    
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
    
    private func getTextAndCaret(from element: AXUIElement) -> (String, Int)? {
        var textValue: CFTypeRef?
        var caretValue: CFTypeRef?
        
        guard AXUIElementCopyAttributeValue(element, kAXValueAttribute, &textValue) == .success,
              AXUIElementCopyAttributeValue(element, kAXInsertionPointLineNumberAttribute, &caretValue) == .success else {
            return nil
        }
        
        guard let text = textValue as? String,
              let caret = caretValue as? Int else {
            return nil
        }
        
        return (text, caret)
    }
    
    private func updateIMEStatus() {
        // Check if IME is active (simplified detection)
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
    
    private func processTextChange(text: String, caret: Int) {
        // This is where we'd call the Rust core LM-only pipeline
        print("📝 Processing text change: \(text.count) chars, caret: \(caret)")
        
        // TODO: Integrate with Rust core via FFI
        // let result = rust_process_text(text, caret, activeRegionWords)
        // if let corrections = result.corrections {
        //     applyCorrections(corrections, to: currentElement)
        // }
    }
}
