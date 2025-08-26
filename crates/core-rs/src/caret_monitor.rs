/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  C A R E T   M O N I T O R   V 2  ( R U S T )   ░░░░░░░░  ║
  ║                                                              ║
  ║   Cross‑platform caret/typing state with O(1) updates,       ║
  ║   single‑flight phase timers, and snapshot ring buffer.      ║
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
  • WHAT ▸ Emits `CaretSnapshot` on state transitions; batched flush
  • WHY  ▸ Minimal latency; no GC churn; consistent cross‑platform model
  • HOW  ▸ Thin shims normalize events → `EventKind`; Rust resolves state
*/

use serde::{Deserialize, Serialize};

// ────────────────────────────────────────────────────────────────
// Public enums and structs (serialized over FFI/WASM)
// ────────────────────────────────────────────────────────────────

#[derive(Debug, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum CaretPrimaryState {
    Blur,
    ActiveIdle,
    Typing,
    Pasted,
    ShortPause,
    LongPause,
    Cut,
    DeleteBurst,
    SelectionActive,
    CaretJump,
    ImeComposing,
    Blocked,
    UndoRedo,
    Drop,
    Autocorrect,
}

#[derive(Debug, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum InputModality {
    Keyboard,
    Osk,
    Ime,
    Paste,
    Drop,
    Programmatic,
    Unknown,
}

impl Default for InputModality {
    fn default() -> Self { InputModality::Unknown }
}

#[derive(Debug, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum FieldKind {
    InputText,
    TextArea,
    ContentEditable,
    Password,
    Other,
}

impl Default for FieldKind {
    fn default() -> Self { FieldKind::Other }
}

#[derive(Debug, Copy, Clone, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum DeviceTier {
    WebGpu,
    Wasm,
    Cpu,
    Native,
}

#[derive(Debug, Copy, Clone, Serialize, Deserialize, Default)]
pub struct SelectionFacet {
    pub collapsed: bool,
    pub start: u32,
    pub end: u32,
}

#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
#[serde(rename_all = "SCREAMING_SNAKE_CASE")]
pub enum EventKind {
    FocusIn,
    FocusOut,
    SelectionChange,
    KeyDown,
    BeforeInput,
    Input,
    CompositionStart,
    CompositionUpdate,
    CompositionEnd,
    Paste,
    Cut,
    Drop,
    PointerDown,
    VisibilityHidden,
    VisibilityVisible,
    ProgrammaticChange,
    Undo,
    Redo,
    Autocorrect,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CaretEvent {
    pub kind: EventKind,
    pub timestamp_ms: u64,
    pub caret: u32,
    pub text_len: u32,
    #[serde(default)]
    pub selection: SelectionFacet,
    #[serde(default)]
    pub input_modality: InputModality,
    #[serde(default)]
    pub field_kind: FieldKind,
    #[serde(default)]
    pub ime_active: bool,
    #[serde(default)]
    pub blocked: bool,
    // Optional DOM "inputType" hint (e.g., "deleteContentBackward", "insertFromPaste")
    #[serde(default)]
    pub input_type: Option<String>,
}

#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
pub struct CaretSnapshot {
    pub primary: CaretPrimaryState,
    pub input_modality: InputModality,
    pub field_kind: FieldKind,
    pub selection: SelectionFacet,
    pub ime_active: bool,
    pub blocked: bool,
    pub caret: u32,
    pub text_len: u32,
    pub device_tier: DeviceTier,
    pub timestamp_ms: u64,
}

impl Default for CaretSnapshot {
    fn default() -> Self {
        Self {
            primary: CaretPrimaryState::Blur,
            input_modality: InputModality::Unknown,
            field_kind: FieldKind::Other,
            selection: SelectionFacet::default(),
            ime_active: false,
            blocked: false,
            caret: 0,
            text_len: 0,
            device_tier: DeviceTier::Wasm,
            timestamp_ms: 0,
        }
    }
}

#[derive(Debug, Copy, Clone, Serialize, Deserialize)]
pub struct Thresholds {
    pub short_pause_ms: u64,
    pub long_pause_ms: u64,
    pub decay_ms: u64,
    pub jump_threshold_chars: u32,
    pub delete_burst_window_ms: u64,
    pub delete_burst_min: u32,
}

impl Default for Thresholds {
    fn default() -> Self {
        Self {
            short_pause_ms: 300,
            long_pause_ms: 2000,
            decay_ms: 500,
            jump_threshold_chars: 6,
            delete_burst_window_ms: 250,
            delete_burst_min: 3,
        }
    }
}

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
pub struct MonitorStats {
    pub events_processed: u64,
    pub snapshots_emitted: u64,
    pub deletes_seen: u64,
    pub delete_bursts: u64,
    pub pastes: u64,
    pub cuts: u64,
    pub undos_redos: u64,
    pub caret_jumps: u64,
    // Typing metrics
    pub keystrokes: u64,
    pub avg_inter_key_ms: f64,
    pub eps_smoothed: f64,
    pub wpm_smoothed: f64,
    pub burst_len_current: u32,
    pub burst_len_max: u32,
}

// ────────────────────────────────────────────────────────────────
// Internal monitor state
// ────────────────────────────────────────────────────────────────

const RING_CAPACITY: usize = 128;

#[derive(Debug)]
pub struct CaretMonitor {
    thresholds: Thresholds,
    device_tier: DeviceTier,

    last_snapshot: CaretSnapshot,
    ring: Vec<CaretSnapshot>,
    ring_head: usize,
    ring_len: usize,

    stats: MonitorStats,

    // Timers and phase tracking (logical, time-based)
    last_activity_ms: u64,
    last_typing_ms: u64,
    paste_cut_decay_until_ms: u64,

    // Burst/jump trackers
    last_delete_ms: u64,
    delete_count_in_window: u32,
    last_caret: u32,
    last_key_ms: u64,
}

impl Default for CaretMonitor {
    fn default() -> Self {
        Self::new(Thresholds::default(), DeviceTier::Wasm)
    }
}

impl CaretMonitor {
    pub fn new(thresholds: Thresholds, device_tier: DeviceTier) -> Self {
        // Pre-allocate ring buffer and never reallocate; reuse slots
        let mut ring = Vec::with_capacity(RING_CAPACITY);
        // Fill with defaults so we can assign by index without push reallocs
        ring.resize(RING_CAPACITY, CaretSnapshot::default());
        Self {
            thresholds,
            device_tier,
            last_snapshot: CaretSnapshot::default(),
            ring,
            ring_head: 0,
            ring_len: 0,
            stats: MonitorStats::default(),
            last_activity_ms: 0,
            last_typing_ms: 0,
            paste_cut_decay_until_ms: 0,
            last_delete_ms: 0,
            delete_count_in_window: 0,
            last_caret: 0,
            last_key_ms: 0,
        }
    }

    pub fn thresholds(&self) -> &Thresholds { &self.thresholds }
    pub fn set_thresholds(&mut self, t: Thresholds) { self.thresholds = t; }
    pub fn stats(&self) -> &MonitorStats { &self.stats }
    pub fn device_tier(&self) -> DeviceTier { self.device_tier }
    pub fn set_device_tier(&mut self, tier: DeviceTier) { self.device_tier = tier; }

    pub fn get_state(&self) -> CaretSnapshot { self.last_snapshot }

    fn emit_snapshot(&mut self, snap: CaretSnapshot) {
        self.ring[self.ring_head] = snap;
        self.ring_head = (self.ring_head + 1) % RING_CAPACITY;
        if self.ring_len < RING_CAPACITY { self.ring_len += 1; }
        self.last_snapshot = snap;
        self.stats.snapshots_emitted += 1;
    }

    fn compute_primary(&self, ev: &CaretEvent, now: u64, typing_active: bool, selection_active: bool, delete_burst: bool, caret_jump: bool) -> CaretPrimaryState {
        // Priority: BLOCKED > IME_COMPOSING > PASTED > DELETE_BURST > TYPING > SELECTION_ACTIVE > ACTIVE_IDLE > BLUR
        if ev.blocked { return CaretPrimaryState::Blocked; }
        if ev.ime_active { return CaretPrimaryState::ImeComposing; }
        if now < self.paste_cut_decay_until_ms { return CaretPrimaryState::Pasted; }
        if delete_burst { return CaretPrimaryState::DeleteBurst; }
        if caret_jump { return CaretPrimaryState::CaretJump; }
        if typing_active { return CaretPrimaryState::Typing; }
        if selection_active { return CaretPrimaryState::SelectionActive; }
        match ev.kind {
            EventKind::FocusOut => CaretPrimaryState::Blur,
            _ => CaretPrimaryState::ActiveIdle,
        }
    }

    fn maybe_phase_overrides(&self, base: CaretPrimaryState, now: u64) -> CaretPrimaryState {
        // Typing cadence phases: TYPING → SHORT_PAUSE → LONG_PAUSE
        // Apply when not in hard override states.
        match base {
            CaretPrimaryState::Blocked
            | CaretPrimaryState::ImeComposing
            | CaretPrimaryState::Pasted
            | CaretPrimaryState::Cut
            | CaretPrimaryState::DeleteBurst
            | CaretPrimaryState::SelectionActive
            | CaretPrimaryState::CaretJump
            | CaretPrimaryState::UndoRedo
            | CaretPrimaryState::Drop
            | CaretPrimaryState::Autocorrect
            | CaretPrimaryState::Blur => base,
            CaretPrimaryState::Typing | CaretPrimaryState::ActiveIdle | CaretPrimaryState::ShortPause => {
                let since = now.saturating_sub(self.last_typing_ms);
                if since >= self.thresholds.long_pause_ms {
                    CaretPrimaryState::LongPause
                } else if since >= self.thresholds.short_pause_ms {
                    CaretPrimaryState::ShortPause
                } else if matches!(base, CaretPrimaryState::Typing) {
                    CaretPrimaryState::Typing
                } else {
                    CaretPrimaryState::ActiveIdle
                }
            }
            CaretPrimaryState::LongPause => {
                // Already long pause; keep it unless a new input arrives
                CaretPrimaryState::LongPause
            }
        }
    }

    fn selection_active(selection: &SelectionFacet) -> bool {
        !selection.collapsed && selection.end > selection.start
    }

    fn is_delete_action(kind: &EventKind, input_type: &Option<String>) -> bool {
        if let Some(t) = input_type {
            if t.contains("delete") { return true; }
        }
        matches!(kind, EventKind::Input | EventKind::BeforeInput)
            && input_type.as_deref() == Some("deleteContentBackward")
    }

    fn is_paste_action(kind: &EventKind, input_type: &Option<String>) -> bool {
        if matches!(kind, EventKind::Paste) { return true; }
        input_type.as_deref() == Some("insertFromPaste")
    }

    fn is_cut_action(kind: &EventKind) -> bool {
        matches!(kind, EventKind::Cut)
    }

    fn is_undo_redo(kind: &EventKind, input_type: &Option<String>) -> bool {
        matches!(kind, EventKind::Undo | EventKind::Redo)
            || input_type.as_deref() == Some("historyUndo")
            || input_type.as_deref() == Some("historyRedo")
    }

    fn caret_jump(prev: u32, next: u32, threshold: u32) -> bool {
        let d = if next >= prev { next - prev } else { prev - next };
        d >= threshold
    }

    fn equal_snapshots(a: &CaretSnapshot, b: &CaretSnapshot) -> bool {
        a.primary == b.primary
            && a.input_modality == b.input_modality
            && a.field_kind == b.field_kind
            && a.selection.collapsed == b.selection.collapsed
            && a.selection.start == b.selection.start
            && a.selection.end == b.selection.end
            && a.ime_active == b.ime_active
            && a.blocked == b.blocked
            && a.caret == b.caret
            && a.text_len == b.text_len
            && a.device_tier == b.device_tier
    }

    pub fn update(&mut self, ev: CaretEvent) -> bool {
        self.stats.events_processed += 1;

        let now = ev.timestamp_ms;

        // Track activity
        self.last_activity_ms = now;

        let mut typing_active = false;
        let mut delete_burst = false;
        let selection_active = Self::selection_active(&ev.selection);

        // Detect paste/cut with decay override
        if Self::is_paste_action(&ev.kind, &ev.input_type) {
            self.paste_cut_decay_until_ms = now + self.thresholds.decay_ms;
            self.stats.pastes += 1;
        } else if Self::is_cut_action(&ev.kind) {
            self.paste_cut_decay_until_ms = now + self.thresholds.decay_ms;
            self.stats.cuts += 1;
        }

        // Undo/redo counter
        if Self::is_undo_redo(&ev.kind, &ev.input_type) {
            self.stats.undos_redos += 1;
        }

        // Delete burst detection
        if Self::is_delete_action(&ev.kind, &ev.input_type) {
            self.stats.deletes_seen += 1;
            if now.saturating_sub(self.last_delete_ms) <= self.thresholds.delete_burst_window_ms {
                self.delete_count_in_window = self.delete_count_in_window.saturating_add(1);
            } else {
                self.delete_count_in_window = 1;
            }
            self.last_delete_ms = now;
            if self.delete_count_in_window >= self.thresholds.delete_burst_min {
                delete_burst = true;
                self.stats.delete_bursts += 1;
            }
        }

        // Typing activity detection (non-delete input counts as typing)
        let is_typingish = matches!(ev.kind, EventKind::Input | EventKind::BeforeInput | EventKind::CompositionUpdate | EventKind::KeyDown);
        if is_typingish && !delete_burst && now >= self.paste_cut_decay_until_ms {
            typing_active = true;
            self.last_typing_ms = now;
            // Update typing metrics
            if self.last_key_ms > 0 {
                let dt = (now - self.last_key_ms) as f64;
                // Exponential smoothing for average inter-key interval
                if self.stats.avg_inter_key_ms <= 0.0 { self.stats.avg_inter_key_ms = dt; }
                let alpha = 0.2f64;
                self.stats.avg_inter_key_ms = self.stats.avg_inter_key_ms + alpha * (dt - self.stats.avg_inter_key_ms);
                // Smoothed characters per second and EPS (approx)
                let inst_cps = if dt > 0.0 { 1000.0 / dt } else { 0.0 };
                if self.stats.eps_smoothed <= 0.0 { self.stats.eps_smoothed = inst_cps; }
                self.stats.eps_smoothed = self.stats.eps_smoothed + alpha * (inst_cps - self.stats.eps_smoothed);
                self.stats.wpm_smoothed = self.stats.eps_smoothed * 60.0 / 5.0;
                // Burst length tracking (typing within 300ms)
                if dt <= self.thresholds.short_pause_ms as f64 {
                    self.stats.burst_len_current = self.stats.burst_len_current.saturating_add(1);
                    if self.stats.burst_len_current > self.stats.burst_len_max {
                        self.stats.burst_len_max = self.stats.burst_len_current;
                    }
                } else {
                    self.stats.burst_len_current = 1; // start new burst with this key
                }
            } else {
                // first key in session
                self.stats.burst_len_current = 1;
            }
            self.stats.keystrokes = self.stats.keystrokes.saturating_add(1);
            self.last_key_ms = now;
        }

        // Caret jump detection (collapsed selection moves beyond threshold)
        let mut caret_jump = false;
        if ev.selection.collapsed {
            if Self::caret_jump(self.last_caret, ev.caret, self.thresholds.jump_threshold_chars) {
                caret_jump = true;
                self.stats.caret_jumps += 1;
            }
        }
        self.last_caret = ev.caret;

        // Base primary using precedence rules
        let base = self.compute_primary(&ev, now, typing_active, selection_active, delete_burst, caret_jump);
        let primary = self.maybe_phase_overrides(base, now);

        let next = CaretSnapshot {
            primary,
            input_modality: ev.input_modality,
            field_kind: ev.field_kind,
            selection: ev.selection,
            ime_active: ev.ime_active,
            blocked: ev.blocked,
            caret: ev.caret,
            text_len: ev.text_len,
            device_tier: self.device_tier,
            timestamp_ms: now,
        };

        // Emit snapshot only on meaningful change
        let changed = !Self::equal_snapshots(&next, &self.last_snapshot);
        if changed {
            self.emit_snapshot(next);
        }
        changed
    }

    pub fn flush(&mut self, now: u64) -> usize {
        // Re-evaluate cadence phases and drop temporary overrides (e.g., paste decay) without new events.
        let mut emitted = 0usize;
        let mut snap = self.last_snapshot;

        // Compute a base state snapshot for now, considering expiring overrides.
        let base_now = if snap.blocked {
            CaretPrimaryState::Blocked
        } else if snap.ime_active {
            CaretPrimaryState::ImeComposing
        } else if now < self.paste_cut_decay_until_ms {
            CaretPrimaryState::Pasted
        } else if Self::selection_active(&snap.selection) {
            CaretPrimaryState::SelectionActive
        } else if matches!(snap.primary, CaretPrimaryState::Blur) {
            CaretPrimaryState::Blur
        } else {
            CaretPrimaryState::ActiveIdle
        };

        let primary = self.maybe_phase_overrides(base_now, now);
        if primary != snap.primary {
            snap.primary = primary;
            snap.timestamp_ms = now;
            self.emit_snapshot(snap);
            emitted += 1;
        }
        emitted
    }

    pub fn drain_snapshots(&mut self) -> Vec<CaretSnapshot> {
        let mut out = Vec::new();
        if self.ring_len == 0 { return out; }
        // Drain oldest→newest
        let start = (self.ring_head + RING_CAPACITY - self.ring_len) % RING_CAPACITY;
        for i in 0..self.ring_len {
            let idx = (start + i) % RING_CAPACITY;
            out.push(self.ring[idx]);
        }
        self.ring_len = 0;
        out
    }
}

// ────────────────────────────────────────────────────────────────
// WASM bindings
// ────────────────────────────────────────────────────────────────

#[cfg(target_arch = "wasm32")]
mod wasm_bindings {
    use super::*;
    use wasm_bindgen::prelude::*;
    use serde_wasm_bindgen as swb;
    use js_sys::{Array, Function, Date};

    #[wasm_bindgen]
    pub struct WasmCaretMonitor {
        inner: CaretMonitor,
        on_snapshot_cb: Option<Function>,
    }

    #[wasm_bindgen]
    impl WasmCaretMonitor {
        #[wasm_bindgen(constructor)]
        pub fn new() -> WasmCaretMonitor {
            WasmCaretMonitor { inner: CaretMonitor::default(), on_snapshot_cb: None }
        }

        #[wasm_bindgen(js_name = set_thresholds)]
        pub fn set_thresholds_js(&mut self, js: JsValue) {
            if let Ok(t) = swb::from_value::<Thresholds>(js) {
                self.inner.set_thresholds(t);
            }
        }

        #[wasm_bindgen(js_name = get_thresholds)]
        pub fn get_thresholds_js(&self) -> JsValue {
            swb::to_value(self.inner.thresholds()).unwrap_or(JsValue::NULL)
        }

        #[wasm_bindgen(js_name = update)]
        pub fn update_js(&mut self, event: JsValue) -> bool {
            match swb::from_value::<CaretEvent>(event) {
                Ok(ev) => self.inner.update(ev),
                Err(_) => false,
            }
        }

        #[wasm_bindgen(js_name = flush)]
        pub fn flush_js(&mut self, now_ms: Option<f64>) -> u32 {
            let now = now_ms.unwrap_or_else(|| Date::now()) as u64;
            let n = self.inner.flush(now);
            let drained = self.inner.drain_snapshots();
            if let Some(cb) = &self.on_snapshot_cb {
                if !drained.is_empty() {
                    let arr = Array::new();
                    for s in drained {
                        let js = swb::to_value(&s).unwrap_or(JsValue::NULL);
                        arr.push(&js);
                    }
                    let _ = cb.call1(&JsValue::NULL, &arr.into());
                }
            }
            n as u32
        }

        #[wasm_bindgen(js_name = on_snapshot)]
        pub fn on_snapshot(&mut self, cb: Function) {
            self.on_snapshot_cb = Some(cb);
        }

        #[wasm_bindgen(js_name = get_state)]
        pub fn get_state_js(&self) -> JsValue {
            swb::to_value(&self.inner.get_state()).unwrap_or(JsValue::NULL)
        }

        #[wasm_bindgen(js_name = get_stats)]
        pub fn get_stats_js(&self) -> JsValue {
            swb::to_value(self.inner.stats()).unwrap_or(JsValue::NULL)
        }

        #[wasm_bindgen(js_name = set_device_tier)]
        pub fn set_device_tier_js(&mut self, tier: JsValue) {
            if let Ok(t) = swb::from_value::<DeviceTier>(tier) { self.inner.set_device_tier(t); }
        }
    }
}

// ────────────────────────────────────────────────────────────────
// Tests
// ────────────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    fn ev(kind: EventKind, t: u64, caret: u32) -> CaretEvent {
        CaretEvent {
            kind,
            timestamp_ms: t,
            caret,
            text_len: 10,
            selection: SelectionFacet { collapsed: true, start: caret, end: caret },
            input_modality: InputModality::Keyboard,
            field_kind: FieldKind::TextArea,
            ime_active: false,
            blocked: false,
            input_type: None,
        }
    }

    #[test]
    fn typing_short_then_long_pause() {
        let mut m = CaretMonitor::default();
        // Typing event at t=0
        let mut e = ev(EventKind::Input, 0, 1);
        e.input_type = Some("insertText".into());
        m.update(e);
        // Flush at 350ms => SHORT_PAUSE
        m.flush(350);
        let s = m.get_state();
        assert_eq!(s.primary, CaretPrimaryState::ShortPause);
        // Flush at 2050ms => LONG_PAUSE
        m.flush(2050);
        let s = m.get_state();
        assert_eq!(s.primary, CaretPrimaryState::LongPause);
    }

    #[test]
    fn paste_overrides_temporarily() {
        let mut m = CaretMonitor::default();
        let mut e = ev(EventKind::Paste, 0, 0);
        e.input_modality = InputModality::Paste;
        m.update(e);
        let s = m.get_state();
        assert_eq!(s.primary, CaretPrimaryState::Pasted);
        // Within decay window, still Pasted on flush
        m.flush(200);
        assert_eq!(m.get_state().primary, CaretPrimaryState::Pasted);
        // After decay, falls back to ActiveIdle/pauses
        m.flush(800);
        assert!(matches!(m.get_state().primary, CaretPrimaryState::ShortPause | CaretPrimaryState::LongPause | CaretPrimaryState::ActiveIdle));
    }

    #[test]
    fn delete_burst_detected() {
        let mut m = CaretMonitor::default();
        for i in 0..3u64 {
            let mut e = ev(EventKind::BeforeInput, i * 50, 1);
            e.input_type = Some("deleteContentBackward".into());
            m.update(e);
        }
        let s = m.get_state();
        assert_eq!(s.primary, CaretPrimaryState::DeleteBurst);
        assert!(m.stats.delete_bursts >= 1);
    }

    #[test]
    fn caret_jump_detected() {
        let mut m = CaretMonitor::default();
        m.update(ev(EventKind::SelectionChange, 0, 1));
        // Large jump beyond threshold
        let e2 = CaretEvent {
            kind: EventKind::SelectionChange,
            timestamp_ms: 10,
            caret: 100,
            text_len: 10,
            selection: SelectionFacet { collapsed: true, start: 100, end: 100 },
            input_modality: InputModality::Keyboard,
            field_kind: FieldKind::TextArea,
            ime_active: false,
            blocked: false,
            input_type: None,
        };
        m.update(e2);
        assert_eq!(m.get_state().primary, CaretPrimaryState::CaretJump);
    }
}


