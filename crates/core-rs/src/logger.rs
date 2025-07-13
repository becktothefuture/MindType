use lazy_static::lazy_static;
use log::{Level, Log, Metadata, Record};
use serde::Serialize;
use std::sync::Mutex;
use wasm_bindgen::prelude::*;

#[derive(Serialize, Clone)]
pub struct LogEntry {
    pub level: String,
    pub message: String,
    pub timestamp: String,
}

struct FrontendLogger;

lazy_static! {
    static ref LOGS: Mutex<Vec<LogEntry>> = Mutex::new(Vec::new());
}

impl Log for FrontendLogger {
    fn enabled(&self, _metadata: &Metadata) -> bool {
        true
    }

    fn log(&self, record: &Record) {
        if self.enabled(record.metadata()) {
            let mut logs = LOGS.lock().unwrap();
            logs.push(LogEntry {
                level: record.level().to_string(),
                message: format!("{}", record.args()),
                timestamp: chrono::Utc::now().to_rfc3339(),
            });
        }
    }

    fn flush(&self) {}
}

static LOGGER: FrontendLogger = FrontendLogger;

pub fn init() {
    log::set_logger(&LOGGER)
        .map(|()| log::set_max_level(Level::Trace.to_level_filter()))
        .expect("Failed to set logger");
}

pub fn get_logs() -> JsValue {
    let logs = LOGS.lock().unwrap();
    serde_wasm_bindgen::to_value(&*logs).unwrap()
} 