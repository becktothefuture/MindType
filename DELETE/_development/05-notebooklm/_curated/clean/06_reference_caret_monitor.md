### Primary states

- BLUR, ACTIVE_IDLE, TYPING, PASTED, SHORT_PAUSE, LONG_PAUSE, CUT, DELETE_BURST, SELECTION_ACTIVE, CARET_JUMP, IME_COMPOSING, BLOCKED, UNDO_REDO, DROP, AUTOCORRECT

### Facets

- input_modality, field_kind, selection {collapsed,start,end}, ime_active, device_tier

### APIs

- update(event) -> Option<CaretSnapshot)
- on_snapshot(cb) batched on rAF
- get_state(), set_thresholds({...}), get_stats(), flush(), attach/detach (shim)

### Precedence

BLOCKED > IME_COMPOSING > PASTED > DELETE_BURST > TYPING > SELECTION_ACTIVE > ACTIVE_IDLE > BLUR

### Temporal phases

TYPING → SHORT_PAUSE (≥300ms) → LONG_PAUSE (≥2000ms). PASTE/CUT override during decay then revert.

### Web shim

Captures: focusin/out, selectionchange, keydown, beforeinput, input, composition\*, paste, cut, drop, pointerdown. Emits `mindtype:caretSnapshots` with snapshots array.

### Thresholds

short_pause_ms, long_pause_ms, decay_ms, jump_threshold_chars, delete_burst_window_ms, delete_burst_min.
