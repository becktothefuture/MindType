/*╔══════════════════════════════════════════════════════╗
  ║  ░  M I N D ⠶ T Y P E ⠶ T E S T E R ⠶ 0 1   A P P  ░░  ║
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
  • WHAT ▸ Main SwiftUI app for Mind⠶type⠶Tester⠶01 status bar application
  • WHY  ▸ Provide system-wide caret enhancement with ⠶ symbol overlay
  • HOW  ▸ SwiftUI MenuBarExtra + Accessibility monitoring + Core Animation overlay
*/

import SwiftUI
import Combine
import AppKit
import ApplicationServices

@main
struct MindTypeTester01App: App {
    @StateObject private var appState = AppState()
    
    var body: some Scene {
        MenuBarExtra {
            MenuBarView()
                .environmentObject(appState)
                .glassContainer(cornerRadius: 12, material: .ultraThinMaterial)
        } label: {
            Text("⠶")
                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                .accessibilityLabel("Mind⠶type⠶Tester⠶01")
        }
        .menuBarExtraStyle(.window)
    }
}

/// App-wide state management with modern Swift patterns
@MainActor
final class AppState: ObservableObject {
    @Published var isEnabled = false
    @Published var overlayOpacity: Double = 0.8
    @Published var overlaySize: Double = 1.0
    @Published var lastError: String?
    @Published var isMonitoring = false
    
    private var accessibilityMonitor: AccessibilityMonitor?
    private var caretOverlayManager: CaretOverlayManager?
    
    init() {
        // Initialize subsystems when app starts
        setupSubsystems()
    }
    
    private func setupSubsystems() {
        caretOverlayManager = CaretOverlayManager()
    }
    
    func toggleMonitoring() {
        isEnabled.toggle()
        
        if isEnabled {
            startMonitoring()
        } else {
            stopMonitoring()
        }
    }
    
    private func startMonitoring() {
        guard !isMonitoring else { return }
        
        // Check accessibility permissions first
        guard AXIsProcessTrusted() else {
            lastError = "Accessibility permissions required"
            requestAccessibilityPermissions()
            return
        }
        
        // Start accessibility monitoring
        accessibilityMonitor = AccessibilityMonitor()
        accessibilityMonitor?.start { [weak self] element, caretPosition in
            await self?.handleCaretUpdate(element: element, position: caretPosition)
        }
        
        isMonitoring = true
        lastError = nil
        print("✅ Mind⠶type⠶Tester⠶01 monitoring started")
    }
    
    private func stopMonitoring() {
        guard isMonitoring else { return }
        
        accessibilityMonitor?.stop()
        accessibilityMonitor = nil
        caretOverlayManager?.hideOverlay()
        
        isMonitoring = false
        print("⏹️ Mind⠶type⠶Tester⠶01 monitoring stopped")
    }
    
    private func handleCaretUpdate(element: AXUIElement, position: CGPoint) async {
        // Show the ⠶ overlay at caret position
        await caretOverlayManager?.showOverlay(at: position, opacity: overlayOpacity, scale: overlaySize)
    }
    
    private func requestAccessibilityPermissions() {
        let alert = NSAlert()
        alert.messageText = "Mind⠶type⠶Tester⠶01 Needs Accessibility Access"
        alert.informativeText = "To show the ⠶ symbol next to your text cursor system-wide, this app needs permission to monitor text fields. This data never leaves your device."
        alert.addButton(withTitle: "Open System Settings")
        alert.addButton(withTitle: "Cancel")
        
        if alert.runModal() == .alertFirstButtonReturn {
            let url = URL(string: "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility")!
            NSWorkspace.shared.open(url)
        }
        
        isEnabled = false
    }
    
    deinit {
        stopMonitoring()
    }
}

/// Menu bar view with modern SwiftUI design
struct MenuBarView: View {
    @EnvironmentObject var appState: AppState
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header with status
            HStack {
                Text("Mind⠶type⠶Tester⠶01")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                statusIndicator
            }
            
            Divider()
            
            // Main controls
            VStack(alignment: .leading, spacing: 8) {
                Toggle("Enable ⠶ Overlay", isOn: $appState.isEnabled)
                    .toggleStyle(.switch)
                    .onChange(of: appState.isEnabled) { _, _ in
                        appState.toggleMonitoring()
                    }
                
                if let error = appState.lastError {
                    HStack {
                        Image(systemName: "exclamationmark.triangle")
                            .foregroundColor(.orange)
                        Text("Permission Required")
                        Spacer()
                        Button("Fix") {
                            appState.requestAccessibilityPermissions()
                        }
                        .buttonStyle(.borderless)
                        .foregroundColor(.blue)
                    }
                    .padding(.vertical, 4)
                    .padding(.horizontal, 8)
                    .background(Color.orange.opacity(0.1))
                    .cornerRadius(6)
                }
            }
            
            Divider()
            
            // Overlay settings
            VStack(alignment: .leading, spacing: 12) {
                Text("Overlay Settings")
                    .font(.headline)
                
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Opacity:")
                        Spacer()
                        Text(String(format: "%.1f", appState.overlayOpacity))
                            .foregroundColor(.secondary)
                    }
                    
                    Slider(value: $appState.overlayOpacity, in: 0.1...1.0, step: 0.1)
                }
                
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Size:")
                        Spacer()
                        Text(String(format: "%.1fx", appState.overlaySize))
                            .foregroundColor(.secondary)
                    }
                    
                    Slider(value: $appState.overlaySize, in: 0.5...2.0, step: 0.1)
                }
            }
            
            Spacer()
            
            // Footer actions
            Button("Quit Mind⠶type⠶Tester⠶01") {
                NSApplication.shared.terminate(nil)
            }
            .buttonStyle(.borderless)
        }
        .padding()
        .frame(width: 280)
    }
    
    @ViewBuilder
    private var statusIndicator: some View {
        HStack(spacing: 4) {
            Circle()
                .fill(statusColor)
                .frame(width: 8, height: 8)
            
            Text(statusText)
                .font(.caption)
                .foregroundColor(.secondary)
        }
    }
    
    private var statusColor: Color {
        if let error = appState.lastError {
            return .orange
        }
        
        return appState.isEnabled ? .green : .gray
    }
    
    private var statusText: String {
        if let error = appState.lastError {
            return "Permission Needed"
        }
        
        return appState.isEnabled ? "Active" : "Inactive"
    }
}
