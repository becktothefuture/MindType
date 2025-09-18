/*╔══════════════════════════════════════════════════════╗
  ║  ░  C O R R E C T I O N   A P P L I C A T O R  ░░░░░  ║
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
  • WHAT ▸ Apply corrections to macOS text fields with caret safety
  • WHY  ▸ System-wide corrections via Accessibility APIs
  • HOW  ▸ AXUIElement manipulation with safety checks
*/

import Cocoa
import ApplicationServices

class CorrectionApplicator {
    
    func applyCorrections(_ corrections: [Correction], to element: AXUIElement) {
        guard !corrections.isEmpty else { return }
        
        // Get current text and caret for safety validation
        guard let (currentText, currentCaret) = getCurrentTextAndCaret(from: element) else {
            print("⚠️ Failed to get current text state")
            return
        }
        
        // Apply corrections in reverse order (right-to-left) to preserve indices
        let sortedCorrections = corrections.sorted { $0.start > $1.start }
        var workingText = currentText
        
        for correction in sortedCorrections {
            // Caret safety check: never edit at or after caret
            guard correction.end <= currentCaret else {
                print("⚠️ Skipping correction that crosses caret: \(correction)")
                continue
            }
            
            // Bounds safety check
            guard correction.start >= 0 && correction.end <= workingText.count else {
                print("⚠️ Skipping out-of-bounds correction: \(correction)")
                continue
            }
            
            // Apply the correction
            let startIndex = workingText.index(workingText.startIndex, offsetBy: correction.start)
            let endIndex = workingText.index(workingText.startIndex, offsetBy: correction.end)
            workingText.replaceSubrange(startIndex..<endIndex, with: correction.text)
            
            print("✅ Applied \(correction.stage) correction: \(workingText[startIndex..<workingText.index(startIndex, offsetBy: correction.text.count)])")
        }
        
        // Apply the final text if changes were made
        if workingText != currentText {
            setTextValue(workingText, to: element, preservingCaret: currentCaret)
        }
    }
    
    private func getCurrentTextAndCaret(from element: AXUIElement) -> (String, Int)? {
        var textValue: CFTypeRef?
        var caretValue: CFTypeRef?
        
        // Get text value
        guard AXUIElementCopyAttributeValue(element, kAXValueAttribute, &textValue) == .success,
              let text = textValue as? String else {
            return nil
        }
        
        // Get caret position (try multiple attributes)
        var caret = 0
        if AXUIElementCopyAttributeValue(element, kAXInsertionPointLineNumberAttribute, &caretValue) == .success,
           let caretInt = caretValue as? Int {
            caret = caretInt
        } else if AXUIElementCopyAttributeValue(element, kAXSelectedTextAttribute, &caretValue) == .success {
            // Fallback: use selection start
            var selectionValue: CFTypeRef?
            if AXUIElementCopyAttributeValue(element, kAXSelectedTextRangeAttribute, &selectionValue) == .success,
               let range = selectionValue as? CFRange {
                caret = range.location
            }
        }
        
        return (text, caret)
    }
    
    private func setTextValue(_ text: String, to element: AXUIElement, preservingCaret caret: Int) {
        // Set the new text value
        let result = AXUIElementSetAttributeValue(element, kAXValueAttribute, text as CFString)
        
        if result == .success {
            // Restore caret position (clamped to new text length)
            let newCaret = min(caret, text.count)
            let caretRange = CFRange(location: newCaret, length: 0)
            AXUIElementSetAttributeValue(element, kAXSelectedTextRangeAttribute, AXValueCreate(.cfRange, &caretRange)!)
            
            print("✅ Text applied successfully, caret preserved at \(newCaret)")
        } else {
            print("❌ Failed to apply text changes: \(result)")
            
            // Fallback: try clipboard method
            applyViaClipboard(text, to: element, preservingCaret: caret)
        }
    }
    
    private func applyViaClipboard(_ text: String, to element: AXUIElement, preservingCaret caret: Int) {
        print("🔄 Attempting clipboard fallback")
        
        // Save current clipboard
        let pasteboard = NSPasteboard.general
        let originalContents = pasteboard.string(forType: .string)
        
        // Set corrected text to clipboard
        pasteboard.clearContents()
        pasteboard.setString(text, forType: .string)
        
        // Select all text in the field
        AXUIElementPerformAction(element, kAXSelectAllAction)
        
        // Paste the corrected text
        let source = CGEventSource(stateID: .hidSystemState)
        let pasteEvent = CGEvent(keyboardEventSource: source, virtualKey: 9, keyDown: true) // Cmd+V
        pasteEvent?.flags = .maskCommand
        pasteEvent?.post(tap: .cghidEventTap)
        
        // Restore original clipboard after a brief delay
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
            if let original = originalContents {
                pasteboard.clearContents()
                pasteboard.setString(original, forType: .string)
            }
        }
        
        print("✅ Clipboard fallback applied")
    }
}
