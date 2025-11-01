/*╔══════════════════════════════════════════════════════╗
  ║  ░  M I N D F L O W   M A C O S   A P P  ░░░░░░░░░░░  ║
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
  • WHAT ▸ Minimal macOS menu bar app with native AI capabilities
  • WHY  ▸ System-wide typing intelligence with premium UX
  • HOW  ▸ SwiftUI + MLX Swift + Accessibility APIs
*/

import SwiftUI
import Combine
import MLX

@main
struct MindFlowApp: App {
    @StateObject private var appState = AppState()
    
    var body: some Scene {
        MenuBarExtra {
            MenuBarView()
                .environmentObject(appState)
                .background(.ultraThinMaterial)
                .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        } label: {
            Text("⠶")
                .font(.system(size: 12, weight: .semibold, design: .monospaced))
                .accessibilityLabel("Mind Flow")
        }
        .menuBarExtraStyle(.window)
    }
}

@MainActor
class AppState: ObservableObject {
    @Published var isEnabled = false
    @Published var lmStatus: LMStatus = .initializing
    @Published var activeRegionWords = 20
    @Published var toneTarget: ToneTarget = .none
    @Published var confidenceThreshold = 0.80
    @Published var lastError: String?
    
    private var mlxModel: MLXModel?
    private var accessibilityMonitor: AccessibilityMonitor?
    
    enum LMStatus {
        case initializing
        case ready
        case error(String)
        case disabled
    }
    
    enum ToneTarget: String, CaseIterable {
        case none = "None"
        case casual = "Casual"
        case professional = "Professional"
        
        var displayName: String {
            switch self {
            case .none: return "None (default)"
            case .casual: return "Casual"
            case .professional: return "Professional"
            }
        }
    }
    
    init() {
        Task {
            await initializeMLX()
            do {
                try RustBridge.shared.initialize()
            } catch {
                await MainActor.run {
                    lmStatus = .error("Rust init failed: \(error.localizedDescription)")
                    lastError = lmStatus.description
                }
            }
        }
    }
    
    private func initializeMLX() async {
        do {
            // Use MLX Swift for native Apple Silicon AI processing
            mlxModel = try await MLXModel.load(modelPath: "qwen-mindflow-v06")
            await MainActor.run {
                lmStatus = .ready
                print("✅ MLX model loaded successfully")
            }
        } catch {
            await MainActor.run {
                lmStatus = .error(error.localizedDescription)
                lastError = error.localizedDescription
                print("❌ MLX model failed to load: \(error)")
            }
        }
    }
    
    func toggle() {
        isEnabled.toggle()
        
        if isEnabled {
            startAccessibilityMonitoring()
        } else {
            stopAccessibilityMonitoring()
        }
        
        print("Mind⠶Flow \(isEnabled ? "enabled" : "disabled")")
    }
    
    func restartLM() {
        lmStatus = .initializing
        lastError = nil
        
        Task {
            await initializeMLX()
        }
    }
    
    private func startAccessibilityMonitoring() {
        // Start monitoring text fields system-wide
        accessibilityMonitor = AccessibilityMonitor()
        accessibilityMonitor?.start()
    }
    
    private func stopAccessibilityMonitoring() {
        accessibilityMonitor?.stop()
        accessibilityMonitor = nil
    }
}

struct TestingGroundView: View {
    @State private var inputText: String = ""
    @State private var outputText: String = ""
    @State private var latencyMs: Double = 0
    @State private var lastError: String?

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Testing Ground")
                .font(.title3)
                .fontWeight(.semibold)
            HStack(spacing: 8){
                Button("Run Correction") { runOnce() }
                    .buttonStyle(.borderedProminent)
                if latencyMs > 0 {
                    Text(String(format: "Latency: %.1f ms", latencyMs))
                        .foregroundColor(.secondary)
                }
            }
            VStack(alignment: .leading, spacing: 6){
                Text("Input")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                TextEditor(text: $inputText)
                    .border(Color.gray.opacity(0.2))
                    .frame(minHeight: 120)
            }
            VStack(alignment: .leading, spacing: 6){
                Text("Output (applied region)")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
                TextEditor(text: $outputText)
                    .border(Color.gray.opacity(0.2))
                    .frame(minHeight: 120)
            }
            if let err = lastError {
                Text("Error: \(err)")
                    .foregroundColor(.orange)
            }
            Spacer()
        }
        .padding()
        .frame(width: 640, height: 520)
    }

    private func runOnce() {
        let start = DispatchTime.now()
        Task { @MainActor in
            do {
                let resp = try RustBridge.shared.processText(
                    text: inputText,
                    caret: inputText.count,
                    activeRegionWords: 20
                )
                let end = DispatchTime.now()
                latencyMs = Double(end.uptimeNanoseconds - start.uptimeNanoseconds) / 1_000_000.0
                if resp.corrections.isEmpty {
                    outputText = inputText
                } else {
                    // Apply corrections locally (simple model)
                    var working = inputText
                    for c in resp.corrections.sorted(by: { $0.start > $1.start }) {
                        let s = working.index(working.startIndex, offsetBy: max(0, c.start))
                        let e = working.index(working.startIndex, offsetBy: min(working.count, c.end))
                        working.replaceSubrange(s..<e, with: c.text)
                    }
                    outputText = working
                }
                lastError = nil
            } catch {
                lastError = error.localizedDescription
            }
        }
    }
}

final class TestingGroundWindowController {
    static let shared = TestingGroundWindowController()
    private var window: NSWindow?

    func open() {
        if let window = window {
            window.makeKeyAndOrderFront(nil)
            NSApp.activate(ignoringOtherApps: true)
            return
        }
        let hosting = NSHostingView(rootView: TestingGroundView())
        let w = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 720, height: 560),
                         styleMask: [.titled, .closable, .resizable, .miniaturizable],
                         backing: .buffered, defer: false)
        w.center()
        w.title = "Mind⠶Flow Testing Ground"
        w.contentView = hosting
        w.isReleasedWhenClosed = false
        w.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        window = w
        NotificationCenter.default.addObserver(forName: NSWindow.willCloseNotification, object: w, queue: .main) { [weak self] _ in
            self?.window = nil
        }
    }
}

struct MenuBarView: View {
    @EnvironmentObject var appState: AppState
    @State private var showingSettings = false
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Header
            HStack {
                Text("Mind⠶Flow v0.6")
                    .font(.headline)
                    .fontWeight(.semibold)
                
                Spacer()
                
                statusIndicator
            }
            
            Divider()
            
            // Main Controls
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Toggle("Enable Corrections", isOn: $appState.isEnabled)
                        .toggleStyle(.switch)
                }
                
                if case .error(let errorMessage) = appState.lmStatus {
                    HStack {
                        Image(systemName: "exclamationmark.triangle")
                            .foregroundColor(.orange)
                        Text("LM Error")
                        Spacer()
                        Button("Restart") {
                            appState.restartLM()
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
            
            // Testing Ground
            Button("Open Testing Ground…") {
                TestingGroundWindowController.shared.open()
            }
            .buttonStyle(.borderless)

            // Settings Button
            Button("Settings...") {
                showingSettings.toggle()
            }
            .buttonStyle(.borderless)
            
            // Quit Button
            Button("Quit Mind⠶Flow") {
                NSApplication.shared.terminate(nil)
            }
            .buttonStyle(.borderless)
        }
        .padding()
        .frame(width: 280)
        .sheet(isPresented: $showingSettings) {
            SettingsView()
                .environmentObject(appState)
        }
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
        if !appState.isEnabled {
            return .gray
        }
        
        switch appState.lmStatus {
        case .ready:
            return .green
        case .error:
            return .red
        case .initializing:
            return .orange
        case .disabled:
            return .gray
        }
    }
    
    private var statusText: String {
        if !appState.isEnabled {
            return "Disabled"
        }
        
        switch appState.lmStatus {
        case .ready:
            return "Ready"
        case .error:
            return "Error"
        case .initializing:
            return "Loading"
        case .disabled:
            return "Disabled"
        }
    }
}

struct SettingsView: View {
    @EnvironmentObject var appState: AppState
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Header
            HStack {
                Text("Mind⠶Flow Settings")
                    .font(.title2)
                    .fontWeight(.semibold)
                
                Spacer()
                
                Button("Done") {
                    dismiss()
                }
                .buttonStyle(.borderedProminent)
            }
            
            Divider()
            
            // Active Region Settings
            VStack(alignment: .leading, spacing: 12) {
                Text("Active Region")
                    .font(.headline)
                
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Size:")
                        Spacer()
                        Text("\(appState.activeRegionWords) words")
                            .foregroundColor(.secondary)
                    }
                    
                    Slider(value: Binding(
                        get: { Double(appState.activeRegionWords) },
                        set: { appState.activeRegionWords = Int($0) }
                    ), in: 5...50, step: 1)
                    
                    Text("The region behind your cursor where corrections happen")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Divider()
            
            // Correction Settings
            VStack(alignment: .leading, spacing: 12) {
                Text("Corrections")
                    .font(.headline)
                
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Text("Tone:")
                        Spacer()
                        Picker("Tone", selection: $appState.toneTarget) {
                            ForEach(AppState.ToneTarget.allCases, id: \.self) { tone in
                                Text(tone.displayName).tag(tone)
                            }
                        }
                        .pickerStyle(.menu)
                        .frame(width: 150)
                    }
                    
                    HStack {
                        Text("Confidence:")
                        Spacer()
                        Text(String(format: "%.2f", appState.confidenceThreshold))
                            .foregroundColor(.secondary)
                    }
                    
                    Slider(value: $appState.confidenceThreshold, in: 0.5...0.95, step: 0.05)
                    
                    Text("Minimum confidence for applying corrections")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            Spacer()
        }
        .padding()
        .frame(width: 400, height: 350)
    }
}

// Placeholder classes for MLX integration
class MLXModel {
    static func load(modelPath: String) async throws -> MLXModel {
        // Simulate model loading
        try await Task.sleep(nanoseconds: 1_000_000_000) // 1 second
        return MLXModel()
    }
}

class AccessibilityMonitor {
    func start() {
        print("🔍 Starting accessibility monitoring")
        // TODO: Implement AX monitoring
    }
    
    func stop() {
        print("⏹️ Stopping accessibility monitoring")
        // TODO: Stop AX monitoring
    }
}
