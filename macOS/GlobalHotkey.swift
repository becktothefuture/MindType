/*╔══════════════════════════════════════════════════════╗
  ║  ░  G L O B A L   H O T K E Y   H A N D L E R  ░░░░░  ║
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
  • WHAT ▸ Global Cmd+Alt+Z hotkey for wave rollback on macOS
  • WHY  ▸ System-wide rollback capability preserving native undo
  • HOW  ▸ Carbon event tap with proper key combination detection
*/

import Cocoa
import Carbon

class GlobalHotkey {
    private var eventTap: CFMachPort?
    private var runLoopSource: CFRunLoopSource?
    private var isActive = false
    
    typealias HotkeyHandler = () -> Void
    private var rollbackHandler: HotkeyHandler?
    
    func register(rollbackHandler: @escaping HotkeyHandler) {
        self.rollbackHandler = rollbackHandler
        
        guard !isActive else {
            print("⚠️ Global hotkey already registered")
            return
        }
        
        // Create event tap for key down events
        let eventMask = (1 << CGEventType.keyDown.rawValue)
        
        eventTap = CGEvent.tapCreate(
            tap: .cgSessionEventTap,
            place: .headInsertEventTap,
            options: .defaultTap,
            eventsOfInterest: CGEventMask(eventMask),
            callback: { proxy, type, event, refcon in
                guard let refcon = refcon else { return Unmanaged.passUnretained(event) }
                let hotkey = Unmanaged<GlobalHotkey>.fromOpaque(refcon).takeUnretainedValue()
                return hotkey.handleKeyEvent(proxy: proxy, type: type, event: event)
            },
            userInfo: Unmanaged.passUnretained(self).toOpaque()
        )
        
        guard let eventTap = eventTap else {
            print("❌ Failed to create event tap - check accessibility permissions")
            return
        }
        
        runLoopSource = CFMachPortCreateRunLoopSource(kCFAllocatorDefault, eventTap, 0)
        CFRunLoopAddSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
        CGEvent.tapEnable(tap: eventTap, enable: true)
        
        isActive = true
        print("✅ Global hotkey registered (Cmd+Alt+Z)")
    }
    
    func unregister() {
        guard isActive else { return }
        
        if let eventTap = eventTap {
            CGEvent.tapEnable(tap: eventTap, enable: false)
            CFRunLoopRemoveSource(CFRunLoopGetCurrent(), runLoopSource, .commonModes)
        }
        
        eventTap = nil
        runLoopSource = nil
        isActive = false
        rollbackHandler = nil
        
        print("✅ Global hotkey unregistered")
    }
    
    private func handleKeyEvent(proxy: CGEventTapProxy, type: CGEventType, event: CGEvent) -> Unmanaged<CGEvent> {
        guard type == .keyDown else {
            return Unmanaged.passUnretained(event)
        }
        
        let keyCode = event.getIntegerValueField(.keyboardEventKeycode)
        let flags = event.flags
        
        // Check for Cmd+Alt+Z (keycode 6 = Z)
        if keyCode == 6 && flags.contains(.maskCommand) && flags.contains(.maskAlternate) {
            print("🔄 Global rollback hotkey triggered")
            
            // Call the rollback handler
            DispatchQueue.main.async {
                self.rollbackHandler?()
            }
            
            // Consume the event (don't pass it through)
            return Unmanaged.passUnretained(CGEvent(source: nil)!)
        }
        
        // Let all other keys pass through (including native Cmd+Z)
        return Unmanaged.passUnretained(event)
    }
    
    deinit {
        unregister()
    }
}
