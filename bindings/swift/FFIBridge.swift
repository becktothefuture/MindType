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

// C function declarations
@_silgen_name("mind_type_core_version")
func mind_type_core_version() -> MTString

@_silgen_name("mind_type_core_free_string")
func mind_type_core_free_string(_ s: MTString)

@_silgen_name("mind_type_caret_monitor_new")
func mind_type_caret_monitor_new() -> UnsafeMutableRawPointer?

@_silgen_name("mind_type_caret_monitor_free")
func mind_type_caret_monitor_free(_ monitor: UnsafeMutableRawPointer?)

@_silgen_name("mind_type_caret_monitor_update")
func mind_type_caret_monitor_update(_ monitor: UnsafeMutableRawPointer?, _ event: MTCaretEvent) -> Bool

@_silgen_name("mind_type_caret_monitor_flush")
func mind_type_caret_monitor_flush(_ monitor: UnsafeMutableRawPointer?, _ now_ms: UInt64) -> UInt32

@_silgen_name("mind_type_caret_monitor_get_snapshots")
func mind_type_caret_monitor_get_snapshots(
    _ monitor: UnsafeMutableRawPointer?,
    _ snapshots: UnsafeMutablePointer<MTCaretSnapshot>?,
    _ max_count: UInt32
) -> UInt32

@_silgen_name("mind_type_extract_fragment")
func mind_type_extract_fragment(_ text_ptr: UnsafePointer<UInt8>?, _ text_len: UInt) -> MTString

@_silgen_name("mind_type_compute_band")
func mind_type_compute_band(_ text_ptr: UnsafePointer<UInt8>?, _ text_len: UInt, _ caret: UInt32) -> MTBandRange

@_silgen_name("mind_type_set_tone")
func mind_type_set_tone(_ enabled: Bool, _ target_ptr: UnsafePointer<UInt8>?, _ target_len: UInt) -> Bool

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

// Swift wrapper classes
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
        self.caretMonitor = mind_type_caret_monitor_new()
    }
    
    deinit {
        if let monitor = caretMonitor {
            mind_type_caret_monitor_free(monitor)
        }
    }
    
    // Get core version
    public func getCoreVersion() -> String {
        let mtString = mind_type_core_version()
        defer { mind_type_core_free_string(mtString) }
        
        guard let ptr = mtString.ptr, mtString.len > 0 else {
            return "unknown"
        }
        
        let data = Data(bytes: ptr, count: Int(mtString.len))
        return String(data: data, encoding: .utf8) ?? "unknown"
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
            return mind_type_caret_monitor_update(monitor, event)
        }
    }
    
    // Flush caret monitor and get snapshot count
    public func flush() -> UInt32 {
        guard let monitor = caretMonitor else { return 0 }
        let nowMs = UInt64(Date().timeIntervalSince1970 * 1000)
        return mind_type_caret_monitor_flush(monitor, nowMs)
    }
    
    // Get caret snapshots
    public func getSnapshots(maxCount: Int = 10) -> [CaretSnapshot] {
        guard let monitor = caretMonitor else { return [] }
        
        let snapshots = UnsafeMutablePointer<MTCaretSnapshot>.allocate(capacity: maxCount)
        defer { snapshots.deallocate() }
        
        let count = mind_type_caret_monitor_get_snapshots(monitor, snapshots, UInt32(maxCount))
        
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
            let mtString = mind_type_extract_fragment(UnsafePointer(textPtr), UInt(text.utf8.count))
            defer { mind_type_core_free_string(mtString) }
            
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
            let mtBand = mind_type_compute_band(
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
            return mind_type_set_tone(enabled, UnsafePointer(targetPtr), UInt(target.utf8.count))
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

