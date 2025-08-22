use wasm_bindgen::prelude::*;
use crate::pause_timer::PauseTimer;
use crate::fragment::FragmentExtractor;
use crate::llm::{StubStream, TokenStream};
use crate::merge::Merger;

pub mod pause_timer;
pub mod fragment;
pub mod llm;
pub mod merge;
pub mod logger;
pub mod engine;
pub mod confidence;
pub mod tapestry;
pub mod ffi;

#[wasm_bindgen]
pub fn init_logger() {
    logger::init();
}

#[wasm_bindgen]
pub fn greet(name: &str) -> String {
    format!("Hello from Rust, {}!", name)
}

#[wasm_bindgen]
pub fn get_logs() -> JsValue {
    logger::get_logs()
}

#[wasm_bindgen]
pub struct WasmPauseTimer {
    timer: PauseTimer,
}

#[wasm_bindgen]
impl WasmPauseTimer {
    #[wasm_bindgen(constructor)]
    pub fn new(idle_threshold_ms: u64) -> Self {
        WasmPauseTimer {
            timer: PauseTimer::new(idle_threshold_ms),
        }
    }

    pub fn record_activity(&mut self) {
        self.timer.record_activity();
    }

    pub fn is_paused(&self) -> bool {
        self.timer.is_paused()
    }
}

#[wasm_bindgen]
pub struct WasmFragmentExtractor {
    extractor: FragmentExtractor,
}

#[wasm_bindgen]
impl WasmFragmentExtractor {
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        WasmFragmentExtractor {
            extractor: FragmentExtractor::new(),
        }
    }

    pub fn extract_fragment(&self, text: &str) -> Option<String> {
        self.extractor.extract_fragment(text).map(|s| s.to_string())
    }
}

#[wasm_bindgen]
pub struct WasmMerger {
    merger: Merger,
}

#[wasm_bindgen]
impl WasmMerger {
    #[wasm_bindgen(constructor)]
    pub fn new(initial_text: &str) -> Self {
        WasmMerger {
            merger: Merger::new(initial_text),
        }
    }

    pub fn apply_token(&mut self, token: &str) {
        self.merger.apply_token(&token.to_string());
    }

    pub fn get_result(&self) -> String {
        self.merger.get_result().to_string()
    }
}

#[wasm_bindgen]
pub struct WasmStubStream {
    stream: StubStream,
}

#[wasm_bindgen]
impl WasmStubStream {
    #[wasm_bindgen(constructor)]
    pub fn new(text: &str) -> Self {
        WasmStubStream {
            stream: StubStream::new(text),
        }
    }

    pub async fn next_token(&mut self) -> Option<String> {
        self.stream.next_token().await
    }
}
