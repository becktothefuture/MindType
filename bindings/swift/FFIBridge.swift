/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  F F I   B R I D G E   ( S W I F T  ↔  C / R U S T )  ░░  ║
  ║                                                              ║
  ║   Swift wrapper for Rust core FFI functions.                ║
  ║   Provides type-safe interface to C ABI.                    ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Swift-side FFI façade methods
  • WHY  ▸ FT-504 native bridge implementation
  • HOW  ▸ Wraps C ABI with Swift types and memory management
*/
import Foundation
import Darwin

// C ABI structures (matching Rust definitions)
public struct MTString {
    var ptr: UnsafeMutablePointer<UInt8>?
    var len: UInt
}

public struct MTCaretEvent {
    var text_ptr: UnsafePointer<UInt8>?
    var text_len: UInt
    var caret: UInt32
    var timestamp_ms: UInt64
    var event_kind: UInt32
}

public struct MTCaretSnapshot {
    var primary: UInt32
    var caret: UInt32
    var text_len: UInt32
    var timestamp_ms: UInt64
    var blocked: Bool
    var ime_active: Bool
}

public struct MTBandRange {
    var start: UInt32
    var end: UInt32
    var valid: Bool
}

// Swift enums for type safety
public enum CaretEventKind: UInt32 {
    case typing = 0
    case pause = 1
    case selection = 2
}

public enum CaretPrimaryState: UInt32 {
    case typing = 0
    case shortPause = 1
    case longPause = 2
    case selectionActive = 3
    case blur = 4
}

typealias mind_type_core_version_fn = @convention(c) () -> MTString
typealias mind_type_core_free_string_fn = @convention(c) (MTString) -> Void
typealias mind_type_caret_monitor_new_fn = @convention(c) () -> UnsafeMutableRawPointer?
typealias mind_type_caret_monitor_free_fn = @convention(c) (UnsafeMutableRawPointer?) -> Void
typealias mind_type_caret_monitor_update_fn = @convention(c) (UnsafeMutableRawPointer?, MTCaretEvent) -> Bool
typealias mind_type_caret_monitor_flush_fn = @convention(c) (UnsafeMutableRawPointer?, UInt64) -> UInt32
typealias mind_type_caret_monitor_get_snapshots_fn = @convention(c) (UnsafeMutableRawPointer?, UnsafeMutablePointer<MTCaretSnapshot>?, UInt32) -> UInt32
typealias mind_type_extract_fragment_fn = @convention(c) (UnsafePointer<UInt8>?, UInt) -> MTString
typealias mind_type_compute_band_fn = @convention(c) (UnsafePointer<UInt8>?, UInt, UInt32) -> MTBandRange
typealias mind_type_set_tone_fn = @convention(c) (Bool, UnsafePointer<UInt8>?, UInt) -> Bool

final class MindTypeCoreLoader {
    static let shared = MindTypeCoreLoader()

    private var handle: UnsafeMutableRawPointer?

    private(set) var core_version: mind_type_core_version_fn?
    private(set) var core_free_string: mind_type_core_free_string_fn?
    private(set) var caret_monitor_new: mind_type_caret_monitor_new_fn?
    private(set) var caret_monitor_free: mind_type_caret_monitor_free_fn?
    private(set) var caret_monitor_update: mind_type_caret_monitor_update_fn?
    private(set) var caret_monitor_flush: mind_type_caret_monitor_flush_fn?
    private(set) var caret_monitor_get_snapshots: mind_type_caret_monitor_get_snapshots_fn?
    private(set) var extract_fragment: mind_type_extract_fragment_fn?
    private(set) var compute_band: mind_type_compute_band_fn?
    private(set) var set_tone: mind_type_set_tone_fn?

    func loadIfNeeded() {
        if handle != nil { return }
        for path in candidatePaths() {
            if let h = dlopen(path, RTLD_NOW | RTLD_LOCAL) {
                handle = h
                resolveSymbols()
                // Keep even if some symbols missing; callers will guard
                return
            }
        }
    }

    private func resolveSymbols() {
        guard let handle = handle else { return }
        if let sym = dlsym(handle, "mind_type_core_version") { core_version = unsafeBitCast(sym, to: mind_type_core_version_fn.self) }
        if let sym = dlsym(handle, "mind_type_core_free_string") { core_free_string = unsafeBitCast(sym, to: mind_type_core_free_string_fn.self) }
        if let sym = dlsym(handle, "mind_type_caret_monitor_new") { caret_monitor_new = unsafeBitCast(sym, to: mind_type_caret_monitor_new_fn.self) }
        if let sym = dlsym(handle, "mind_type_caret_monitor_free") { caret_monitor_free = unsafeBitCast(sym, to: mind_type_caret_monitor_free_fn.self) }
        if let sym = dlsym(handle, "mind_type_caret_monitor_update") { caret_monitor_update = unsafeBitCast(sym, to: mind_type_caret_monitor_update_fn.self) }
        if let sym = dlsym(handle, "mind_type_caret_monitor_flush") { caret_monitor_flush = unsafeBitCast(sym, to: mind_type_caret_monitor_flush_fn.self) }
        if let sym = dlsym(handle, "mind_type_caret_monitor_get_snapshots") { caret_monitor_get_snapshots = unsafeBitCast(sym, to: mind_type_caret_monitor_get_snapshots_fn.self) }
        if let sym = dlsym(handle, "mind_type_extract_fragment") { extract_fragment = unsafeBitCast(sym, to: mind_type_extract_fragment_fn.self) }
        if let sym = dlsym(handle, "mind_type_compute_band") { compute_band = unsafeBitCast(sym, to: mind_type_compute_band_fn.self) }
        if let sym = dlsym(handle, "mind_type_set_tone") { set_tone = unsafeBitCast(sym, to: mind_type_set_tone_fn.self) }
    }

    private func candidatePaths() -> [String] {
        var paths: [String] = []
        if let override = ProcessInfo.processInfo.environment["CORE_RS_LIB_PATH"], !override.isEmpty { paths.append(override) }
        if let bundleURL = Bundle.main.bundleURL as URL? {
            paths.append(bundleURL.appendingPathComponent("Contents/Frameworks/libcore_rs.dylib").path)
        }
        if let derivedDir = ProcessInfo.processInfo.environment["DERIVED_FILE_DIR"] {
            paths.append(derivedDir + "/core-rs/libcore_rs.dylib")
        }
        paths.append("/usr/local/lib/libcore_rs.dylib")
        paths.append("/opt/homebrew/lib/libcore_rs.dylib")
        return paths
    }

    deinit {
        if let handle = handle { dlclose(handle) }
    }
}

public class CaretSnapshot {
    public let primary: CaretPrimaryState
    public let caret: UInt32
    public let textLen: UInt32
    public let timestampMs: UInt64
    public let blocked: Bool
    public let imeActive: Bool
    
    init(from mtSnapshot: MTCaretSnapshot) {
        self.primary = CaretPrimaryState(rawValue: mtSnapshot.primary) ?? .typing
        self.caret = mtSnapshot.caret
        self.textLen = mtSnapshot.text_len
        self.timestampMs = mtSnapshot.timestamp_ms
        self.blocked = mtSnapshot.blocked
        self.imeActive = mtSnapshot.ime_active
    }
}

public struct BandRange {
    public let start: UInt32
    public let end: UInt32
    public let valid: Bool
    
    init(from mtBand: MTBandRange) {
        self.start = mtBand.start
        self.end = mtBand.end
        self.valid = mtBand.valid
    }
}

public class FFIBridge {
    private var caretMonitor: UnsafeMutableRawPointer?
    
    public init() {
        MindTypeCoreLoader.shared.loadIfNeeded()
        self.caretMonitor = MindTypeCoreLoader.shared.caret_monitor_new?()
    }
    
    deinit {
        if let monitor = caretMonitor {
            MindTypeCoreLoader.shared.caret_monitor_free?(monitor)
        }
    }
    
    // Get core version
    public func getCoreVersion() -> String {
        MindTypeCoreLoader.shared.loadIfNeeded()
        if let coreVersion = MindTypeCoreLoader.shared.core_version {
            let mtString = coreVersion()
            defer { MindTypeCoreLoader.shared.core_free_string?(mtString) }
            guard let ptr = mtString.ptr, mtString.len > 0 else {
                return "unknown"
            }
            let data = Data(bytes: ptr, count: Int(mtString.len))
            return String(data: data, encoding: .utf8) ?? "unknown"
        }
        return "unknown"
    }
    
    // Ingest text and caret position
    public func ingest(text: String, caret: Int, eventKind: CaretEventKind = .typing) -> Bool {
        guard let monitor = caretMonitor else { return false }
        
        return text.withCString { textPtr in
            let event = MTCaretEvent(
                text_ptr: UnsafePointer(textPtr),
                text_len: UInt(text.utf8.count),
                caret: UInt32(caret),
                timestamp_ms: UInt64(Date().timeIntervalSince1970 * 1000),
                event_kind: eventKind.rawValue
            )
            return MindTypeCoreLoader.shared.caret_monitor_update?(monitor, event) ?? false
        }
    }
    
    // Flush caret monitor and get snapshot count
    public func flush() -> UInt32 {
        guard let monitor = caretMonitor else { return 0 }
        let nowMs = UInt64(Date().timeIntervalSince1970 * 1000)
        return MindTypeCoreLoader.shared.caret_monitor_flush?(monitor, nowMs) ?? 0
    }
    
    // Get caret snapshots
    public func getSnapshots(maxCount: Int = 10) -> [CaretSnapshot] {
        guard let monitor = caretMonitor else { return [] }
        
        let snapshots = UnsafeMutablePointer<MTCaretSnapshot>.allocate(capacity: maxCount)
        defer { snapshots.deallocate() }
        
        let count = MindTypeCoreLoader.shared.caret_monitor_get_snapshots?(monitor, snapshots, UInt32(maxCount)) ?? 0
        
        var result: [CaretSnapshot] = []
        for i in 0..<Int(count) {
            let mtSnapshot = snapshots[i]
            result.append(CaretSnapshot(from: mtSnapshot))
        }
        
        return result
    }
    
    // Extract text fragment
    public func extractFragment(from text: String) -> String? {
        return text.withCString { textPtr in
            guard let extractFragment = MindTypeCoreLoader.shared.extract_fragment else { return nil }
            let mtString = extractFragment(UnsafePointer(textPtr), UInt(text.utf8.count))
            if let coreFree = MindTypeCoreLoader.shared.core_free_string {
                defer { coreFree(mtString) }
            }
            
            guard let ptr = mtString.ptr, mtString.len > 0 else {
                return nil
            }
            
            let data = Data(bytes: ptr, count: Int(mtString.len))
            return String(data: data, encoding: .utf8)
        }
    }
    
    // Compute active region band
    public func computeBand(text: String, caret: Int) -> BandRange? {
        return text.withCString { textPtr in
            guard let computeBand = MindTypeCoreLoader.shared.compute_band else { return nil }
            let mtBand = computeBand(
                UnsafePointer(textPtr),
                UInt(text.utf8.count),
                UInt32(caret)
            )
            
            let band = BandRange(from: mtBand)
            return band.valid ? band : nil
        }
    }
    
    // Set tone configuration
    public func setTone(enabled: Bool, target: String) -> Bool {
        return target.withCString { targetPtr in
            return MindTypeCoreLoader.shared.set_tone?(enabled, UnsafePointer(targetPtr), UInt(target.utf8.count)) ?? false
        }
    }
    
    // Convenience method for processing text changes
    public func processTextChange(
        text: String,
        caret: Int,
        eventKind: CaretEventKind = .typing
    ) -> (success: Bool, band: BandRange?, snapshots: [CaretSnapshot]) {
        
        let ingestSuccess = ingest(text: text, caret: caret, eventKind: eventKind)
        let _ = flush()
        let band = computeBand(text: text, caret: caret)
        let snapshots = getSnapshots()
        
        return (ingestSuccess, band, snapshots)
    }
}

