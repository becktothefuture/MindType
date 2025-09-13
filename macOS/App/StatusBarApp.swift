/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  S T A T U S   B A R   A P P   ( S W I F T )  ░░░░░░░░░░  ║
  ║                                                              ║
  ║   Minimal NSStatusItem with menu to toggle processing.       ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ macOS menu bar app shell
  • WHY  ▸ FT-504 platform foundation scaffold
  • HOW  ▸ NSApplicationDelegate + NSStatusItem
*/
import Cocoa

@main
class AppDelegate: NSObject, NSApplicationDelegate {
    var statusItem: NSStatusItem!

    func applicationDidFinishLaunching(_ aNotification: Notification) {
        statusItem = NSStatusBar.system.statusItem(withLength: NSStatusItem.variableLength)
        if let button = statusItem.button {
            button.title = "MindType"
        }

        let menu = NSMenu()
        menu.addItem(NSMenuItem(title: "Start", action: #selector(start), keyEquivalent: "s"))
        menu.addItem(NSMenuItem(title: "Stop", action: #selector(stop), keyEquivalent: "x"))
        menu.addItem(NSMenuItem.separator())
        menu.addItem(NSMenuItem(title: "Quit", action: #selector(quit), keyEquivalent: "q"))
        statusItem.menu = menu
    }

    @objc func start() {
        // TODO: initialize AccessibilityBridge and FFI bridge
    }

    @objc func stop() {
        // TODO: tear down resources
    }

    @objc func quit() {
        NSApp.terminate(nil)
    }
}

