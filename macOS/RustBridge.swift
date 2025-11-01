/*╔══════════════════════════════════════════════════════╗
  ║  ░  R U S T   F F I   B R I D G E  ░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ Swift FFI bridge to Rust core LM-only pipeline
  • WHY  ▸ Connect macOS app to v0.6 correction engine
  • HOW  ▸ C bindings with JSON serialization for safety
*/

import Foundation
import Darwin

typealias mindtype_process_text_fn = @convention(c) (UnsafePointer<CChar>) -> UnsafePointer<CChar>?
typealias mindtype_free_string_fn = @convention(c) (UnsafePointer<CChar>) -> Void
typealias mindtype_init_engine_fn = @convention(c) (UnsafePointer<CChar>) -> Bool

enum RustCoreLoadError: Error, LocalizedError {
    case libraryNotFound
    case symbolMissing(String)

    var errorDescription: String? {
        switch self {
        case .libraryNotFound:
            return "Rust core library not found"
        case .symbolMissing(let name):
            return "Missing Rust symbol: \(name)"
        }
    }
}

final class RustCoreDynamicLoader {
    static let shared = RustCoreDynamicLoader()

    private var handle: UnsafeMutableRawPointer?
    private(set) var processText: mindtype_process_text_fn?
    private(set) var freeString: mindtype_free_string_fn?
    private(set) var initEngine: mindtype_init_engine_fn?

    func loadIfNeeded() throws {
        if handle != nil { return }

        for path in candidatePaths() {
            if let h = dlopen(path, RTLD_NOW | RTLD_LOCAL) {
                handle = h
                resolveSymbols()
                if processText != nil, freeString != nil, initEngine != nil {
                    return
                } else {
                    // If symbols missing, close and continue
                    dlclose(h)
                    handle = nil
                }
            }
        }
        throw RustCoreLoadError.libraryNotFound
    }

    private func resolveSymbols() {
        guard let handle = handle else { return }
        if let sym = dlsym(handle, "mindtype_process_text") {
            processText = unsafeBitCast(sym, to: mindtype_process_text_fn.self)
        }
        if let sym = dlsym(handle, "mindtype_free_string") {
            freeString = unsafeBitCast(sym, to: mindtype_free_string_fn.self)
        }
        if let sym = dlsym(handle, "mindtype_init_engine") {
            initEngine = unsafeBitCast(sym, to: mindtype_init_engine_fn.self)
        }
    }

    private func candidatePaths() -> [String] {
        var paths: [String] = []
        // Allow override via env var
        if let override = ProcessInfo.processInfo.environment["CORE_RS_LIB_PATH"], !override.isEmpty {
            paths.append(override)
        }
        // App bundle Frameworks folder (macOS layout)
        if let bundleURL = Bundle.main.bundleURL as URL? {
            let frameworks = bundleURL.appendingPathComponent("Contents/Frameworks/libcore_rs.dylib").path
            paths.append(frameworks)
        }
        // PrivateFrameworks (just in case)
        if let privateFW = Bundle.main.privateFrameworksURL?.appendingPathComponent("libcore_rs.dylib").path {
            paths.append(privateFW)
        }
        // Derived data fallback (useful while developing)
        if let derivedDir = ProcessInfo.processInfo.environment["DERIVED_FILE_DIR"] {
            paths.append(derivedDir + "/core-rs/libcore_rs.dylib")
        }
        // Common local install
        paths.append("/usr/local/lib/libcore_rs.dylib")
        paths.append("/opt/homebrew/lib/libcore_rs.dylib")
        return paths
    }

    deinit {
        if let handle = handle {
            dlclose(handle)
        }
    }
}

// Swift wrapper for type safety
struct CorrectionRequest: Codable {
    let text: String
    let caret: Int
    let activeRegionWords: Int
    let toneTarget: String
    let confidenceThreshold: Double
    let timestamp: TimeInterval
}

struct CorrectionResponse: Codable {
    let corrections: [Correction]
    let activeRegion: ActiveRegion
    let latencyMs: Double
    let error: String?
}

struct Correction: Codable {
    let start: Int
    let end: Int
    let text: String
    let stage: String // "noise", "context", "tone"
    let confidence: Double
}

struct ActiveRegion: Codable {
    let start: Int
    let end: Int
}

class RustBridge {
    private var isInitialized = false
    static let shared = RustBridge()
    
    func initialize() throws {
        do {
            try RustCoreDynamicLoader.shared.loadIfNeeded()
        } catch {
            throw RustBridgeError.initializationFailed
        }

        let config = [
            "lm_only": true,
            "default_active_region_words": 20,
            "tone_default": "None",
            "device_tier_auto": true
        ]

        guard let configData = try? JSONSerialization.data(withJSONObject: config),
              let configString = String(data: configData, encoding: .utf8) else {
            throw RustBridgeError.configSerialization
        }

        guard let initEngine = RustCoreDynamicLoader.shared.initEngine else {
            throw RustBridgeError.initializationFailed
        }

        let success = configString.withCString { configPtr in
            initEngine(configPtr)
        }

        guard success else {
            throw RustBridgeError.initializationFailed
        }

        isInitialized = true
        print("✅ Rust core initialized")
    }
    
    func processText(
        text: String,
        caret: Int,
        activeRegionWords: Int = 20,
        toneTarget: String = "None",
        confidenceThreshold: Double = 0.80
    ) throws -> CorrectionResponse {
        guard isInitialized else {
            throw RustBridgeError.notInitialized
        }
        
        let request = CorrectionRequest(
            text: text,
            caret: caret,
            activeRegionWords: activeRegionWords,
            toneTarget: toneTarget,
            confidenceThreshold: confidenceThreshold,
            timestamp: Date().timeIntervalSince1970
        )
        
        guard let requestData = try? JSONEncoder().encode(request),
              let requestString = String(data: requestData, encoding: .utf8) else {
            throw RustBridgeError.requestSerialization
        }
        
        // Ensure loader is ready
        try? RustCoreDynamicLoader.shared.loadIfNeeded()
        
        guard let processText = RustCoreDynamicLoader.shared.processText,
              let freeString = RustCoreDynamicLoader.shared.freeString else {
            throw RustBridgeError.processingFailed
        }
        
        guard let responsePtr = requestString.withCString({ requestPtr in
            processText(requestPtr)
        }) else {
            throw RustBridgeError.processingFailed
        }
        
        defer { freeString(responsePtr) }
        
        let responseString = String(cString: responsePtr)
        
        guard let responseData = responseString.data(using: .utf8),
              let response = try? JSONDecoder().decode(CorrectionResponse.self, from: responseData) else {
            throw RustBridgeError.responseParsing
        }
        
        return response
    }
}

enum RustBridgeError: Error, LocalizedError {
    case notInitialized
    case configSerialization
    case initializationFailed
    case requestSerialization
    case processingFailed
    case responseParsing
    
    var errorDescription: String? {
        switch self {
        case .notInitialized:
            return "Rust core not initialized"
        case .configSerialization:
            return "Failed to serialize configuration"
        case .initializationFailed:
            return "Rust core initialization failed"
        case .requestSerialization:
            return "Failed to serialize request"
        case .processingFailed:
            return "Text processing failed"
        case .responseParsing:
            return "Failed to parse response"
        }
    }
}
