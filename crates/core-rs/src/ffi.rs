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

#[no_mangle]
pub extern "C" fn mind_type_core_version() -> MTString {
    let s = format!("{}","0.2.0-alpha.0");
    let bytes = s.into_bytes();
    let len = bytes.len();
    let mut boxed = bytes.into_boxed_slice();
    let ptr = boxed.as_mut_ptr();
    std::mem::forget(boxed);
    MTString { ptr, len }
}


