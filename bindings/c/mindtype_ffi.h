/*╔══════════════════════════════════════════════════════╗
  ║  ░  M I N D T Y P E   F F I   H E A D E R  ░░░░░░░░░░░  ║
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
  • WHAT ▸ C header for FFI bridge to Rust core
  • WHY  ▸ Enable Swift/C++/C# integration with type safety
  • HOW  ▸ Matches Rust FFI definitions with C ABI
*/

#ifndef MINDTYPE_FFI_H
#define MINDTYPE_FFI_H

#include <stdint.h>
#include <stdbool.h>

#ifdef __cplusplus
extern "C" {
#endif

// String structure for cross-FFI string passing
typedef struct {
    uint8_t* ptr;
    uintptr_t len;
} MTString;

// Caret event structure
typedef struct {
    const uint8_t* text_ptr;
    uintptr_t text_len;
    uint32_t caret;
    uint64_t timestamp_ms;
    uint32_t event_kind; // 0=TYPING, 1=PAUSE, 2=SELECTION
} MTCaretEvent;

// Caret snapshot structure
typedef struct {
    uint32_t primary; // 0=TYPING, 1=SHORT_PAUSE, 2=LONG_PAUSE, 3=SELECTION_ACTIVE, 4=BLUR
    uint32_t caret;
    uint32_t text_len;
    uint64_t timestamp_ms;
    bool blocked;
    bool ime_active;
} MTCaretSnapshot;

// Band range structure
typedef struct {
    uint32_t start;
    uint32_t end;
    bool valid;
} MTBandRange;

// Core version and memory management
MTString mind_type_core_version(void);
void mind_type_core_free_string(MTString s);

// Caret monitor functions
void* mind_type_caret_monitor_new(void);
void mind_type_caret_monitor_free(void* monitor);
bool mind_type_caret_monitor_update(void* monitor, MTCaretEvent event);
uint32_t mind_type_caret_monitor_flush(void* monitor, uint64_t now_ms);
uint32_t mind_type_caret_monitor_get_snapshots(
    void* monitor, 
    MTCaretSnapshot* snapshots, 
    uint32_t max_count
);

// Text processing functions
MTString mind_type_extract_fragment(const uint8_t* text_ptr, uintptr_t text_len);
MTBandRange mind_type_compute_band(const uint8_t* text_ptr, uintptr_t text_len, uint32_t caret);

// Configuration functions
bool mind_type_set_tone(bool enabled, const uint8_t* target_ptr, uintptr_t target_len);

#ifdef __cplusplus
}
#endif

#endif // MINDTYPE_FFI_H
