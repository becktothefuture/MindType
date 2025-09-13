/*
╔══════════════════════════════════════════════════════════════╗
║  ░  F F I   S U R F A C E   ( C  A P I )                 ░░░  ║
║                                                              ║
║                                                              ║
║                                                              ║
║                                                              ║
║           ╌╌  P L A C E H O L D E R  ╌╌                      ║
║                                                              ║
║                                                              ║
║                                                              ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ C‑ABI friendly types for Swift/C#/C++ integration
  • WHY  ▸ Cross‑platform host calls into Rust core
  • HOW  ▸ Minimal extern "C" signatures; memory mgmt helpers later
*/

#[repr(C)]
pub struct MTString {
    pub ptr: *mut u8,
    pub len: usize,
}

#[repr(C)]
pub struct MTCaretEvent {
    pub text_ptr: *const u8,
    pub text_len: usize,
    pub caret: u32,
    pub timestamp_ms: u64,
    pub event_kind: u32, // 0=TYPING, 1=PAUSE, 2=SELECTION, etc.
}

#[repr(C)]
pub struct MTCaretSnapshot {
    pub primary: u32,
    pub caret: u32,
    pub text_len: u32,
    pub timestamp_ms: u64,
    pub blocked: bool,
    pub ime_active: bool,
}

#[repr(C)]
pub struct MTBandRange {
    pub start: u32,
    pub end: u32,
    pub valid: bool,
}

// Core version and memory management
#[no_mangle]
pub extern "C" fn mind_type_core_version() -> MTString {
    let s = format!("{}","0.4.0-alpha.0");
    let bytes = s.into_bytes();
    let len = bytes.len();
    let mut boxed = bytes.into_boxed_slice();
    let ptr = boxed.as_mut_ptr();
    std::mem::forget(boxed);
    MTString { ptr, len }
}

#[no_mangle]
pub extern "C" fn mind_type_core_free_string(s: MTString) {
    if s.ptr.is_null() || s.len == 0 { return; }
    unsafe {
        let _ = Vec::from_raw_parts(s.ptr, s.len, s.len);
    }
}

// Caret Monitor FFI functions
#[no_mangle]
pub extern "C" fn mind_type_caret_monitor_new() -> *mut crate::caret_monitor::CaretMonitor {
    Box::into_raw(Box::new(crate::caret_monitor::CaretMonitor::default()))
}

#[no_mangle]
pub extern "C" fn mind_type_caret_monitor_free(monitor: *mut crate::caret_monitor::CaretMonitor) {
    if !monitor.is_null() {
        unsafe { 
            let _ = Box::from_raw(monitor);
        }
    }
}

#[no_mangle]
pub extern "C" fn mind_type_caret_monitor_update(
    monitor: *mut crate::caret_monitor::CaretMonitor,
    event: MTCaretEvent,
) -> bool {
    if monitor.is_null() || event.text_ptr.is_null() { return false; }
    
    unsafe {
        let text_slice = std::slice::from_raw_parts(event.text_ptr, event.text_len);
        if let Ok(text) = std::str::from_utf8(text_slice) {
            let rust_event = crate::caret_monitor::CaretEvent {
                kind: match event.event_kind {
                    0 => crate::caret_monitor::EventKind::Input,
                    1 => crate::caret_monitor::EventKind::Pause,
                    2 => crate::caret_monitor::EventKind::Selection,
                    _ => crate::caret_monitor::EventKind::Input,
                },
                text: text.to_string(),
                caret: event.caret as usize,
                timestamp_ms: event.timestamp_ms,
            };
            (*monitor).update(rust_event)
        } else {
            false
        }
    }
}

#[no_mangle]
pub extern "C" fn mind_type_caret_monitor_flush(
    monitor: *mut crate::caret_monitor::CaretMonitor,
    now_ms: u64,
) -> u32 {
    if monitor.is_null() { return 0; }
    unsafe {
        (*monitor).flush(now_ms) as u32
    }
}

#[no_mangle]
pub extern "C" fn mind_type_caret_monitor_get_snapshots(
    monitor: *mut crate::caret_monitor::CaretMonitor,
    snapshots: *mut MTCaretSnapshot,
    max_count: u32,
) -> u32 {
    if monitor.is_null() || snapshots.is_null() { return 0; }
    
    unsafe {
        let drained = (*monitor).drain_snapshots();
        let count = std::cmp::min(drained.len(), max_count as usize);
        
        for (i, snapshot) in drained.iter().take(count).enumerate() {
            let mt_snapshot = MTCaretSnapshot {
                primary: match snapshot.primary {
                    crate::caret_monitor::PrimaryState::Typing => 0,
                    crate::caret_monitor::PrimaryState::ShortPause => 1,
                    crate::caret_monitor::PrimaryState::LongPause => 2,
                    crate::caret_monitor::PrimaryState::SelectionActive => 3,
                    crate::caret_monitor::PrimaryState::Blur => 4,
                    _ => 0,
                },
                caret: snapshot.caret as u32,
                text_len: snapshot.text_len as u32,
                timestamp_ms: snapshot.timestamp_ms,
                blocked: snapshot.blocked,
                ime_active: snapshot.ime_active,
            };
            *snapshots.add(i) = mt_snapshot;
        }
        
        count as u32
    }
}

// Fragment extraction
#[no_mangle]
pub extern "C" fn mind_type_extract_fragment(text_ptr: *const u8, text_len: usize) -> MTString {
    if text_ptr.is_null() { 
        return MTString { ptr: std::ptr::null_mut(), len: 0 };
    }
    
    unsafe {
        let text_slice = std::slice::from_raw_parts(text_ptr, text_len);
        if let Ok(text) = std::str::from_utf8(text_slice) {
            let extractor = crate::fragment::FragmentExtractor::new();
            if let Some(fragment) = extractor.extract_fragment(text) {
                let bytes = fragment.into_bytes();
                let len = bytes.len();
                let mut boxed = bytes.into_boxed_slice();
                let ptr = boxed.as_mut_ptr();
                std::mem::forget(boxed);
                return MTString { ptr, len };
            }
        }
        MTString { ptr: std::ptr::null_mut(), len: 0 }
    }
}

// Band/active region calculation
#[no_mangle]
pub extern "C" fn mind_type_compute_band(
    text_ptr: *const u8,
    text_len: usize,
    caret: u32,
) -> MTBandRange {
    if text_ptr.is_null() {
        return MTBandRange { start: 0, end: 0, valid: false };
    }
    
    unsafe {
        let text_slice = std::slice::from_raw_parts(text_ptr, text_len);
        if let Ok(text) = std::str::from_utf8(text_slice) {
            // Simple band computation - take last ~50 chars before caret
            let caret_pos = std::cmp::min(caret as usize, text.len());
            let start = if caret_pos > 50 { caret_pos - 50 } else { 0 };
            
            // Find word boundaries
            let start_boundary = text[..start].rfind(char::is_whitespace)
                .map(|i| i + 1)
                .unwrap_or(start);
            
            return MTBandRange {
                start: start_boundary as u32,
                end: caret_pos as u32,
                valid: start_boundary < caret_pos,
            };
        }
        MTBandRange { start: 0, end: 0, valid: false }
    }
}

// Tone setting (placeholder for future LM integration)
#[no_mangle]
pub extern "C" fn mind_type_set_tone(enabled: bool, target_ptr: *const u8, target_len: usize) -> bool {
    if target_ptr.is_null() { return false; }
    
    unsafe {
        let target_slice = std::slice::from_raw_parts(target_ptr, target_len);
        if let Ok(target) = std::str::from_utf8(target_slice) {
            // TODO: Store tone settings in global state
            log::info!("Tone setting: enabled={}, target={}", enabled, target);
            return true;
        }
        false
    }
}



