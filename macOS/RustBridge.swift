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

// C FFI declarations for Rust core
@_silgen_name("mindtype_process_text")
func mindtype_process_text(_ request: UnsafePointer<CChar>) -> UnsafePointer<CChar>?

@_silgen_name("mindtype_free_string")
func mindtype_free_string(_ str: UnsafePointer<CChar>)

@_silgen_name("mindtype_init_engine")
func mindtype_init_engine(_ config: UnsafePointer<CChar>) -> Bool

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
    
    func initialize() throws {
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
        
        let success = configString.withCString { configPtr in
            mindtype_init_engine(configPtr)
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
        
        guard let responsePtr = requestString.withCString({ requestPtr in
            mindtype_process_text(requestPtr)
        }) else {
            throw RustBridgeError.processingFailed
        }
        
        defer { mindtype_free_string(responsePtr) }
        
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
