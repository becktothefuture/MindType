/*╔══════════════════════════════════════════════════════╗
  ║  ░  F F I   S T U B S   ( C )  ░░░░░░░░░░░░░░░░░░░░  ║
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
   • WHAT ▸ C stubs for Rust FFI to allow local macOS runs
   • WHY  ▸ Enable app startup without linking Rust library
   • HOW  ▸ Return minimal JSON; caller frees via free()
*/

#include <stdlib.h>
#include <string.h>

// Simple strdup portable shim
static char* mt_strdup(const char* s){
  size_t n = strlen(s) + 1;
  char* p = (char*)malloc(n);
  if(p){ memcpy(p, s, n); }
  return p;
}

// Initialize engine with JSON config; always returns true in stub
__attribute__((visibility("default")))
bool mindtype_init_engine(const char* config){
  (void)config;
  return true;
}

// Process text request (JSON in), return JSON string; caller must mindtype_free_string
__attribute__((visibility("default")))
const char* mindtype_process_text(const char* request){
  (void)request;
  // Minimal no-op response with empty corrections and zero latency
  const char* resp = "{\"corrections\":[],\"activeRegion\":{\"start\":0,\"end\":0},\"latencyMs\":0,\"error\":null}";
  return mt_strdup(resp);
}

// Free Rust-allocated string (stub uses malloc)
__attribute__((visibility("default")))
void mindtype_free_string(const char* s){
  free((void*)s);
}




