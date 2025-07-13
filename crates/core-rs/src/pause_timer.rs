use chrono::{DateTime, Utc};
use log::info;
use std::time::Duration;

pub struct PauseTimer {
    idle_threshold: Duration,
    last_activity: DateTime<Utc>,
}

impl PauseTimer {
    pub fn new(idle_threshold_ms: u64) -> Self {
        info!("Initializing PauseTimer with threshold {}ms", idle_threshold_ms);
        Self {
            idle_threshold: Duration::from_millis(idle_threshold_ms),
            last_activity: Utc::now(),
        }
    }

    pub fn record_activity(&mut self) {
        self.last_activity = Utc::now();
    }

    pub fn is_paused(&self) -> bool {
        let now = Utc::now();
        let idle_time = now.signed_duration_since(self.last_activity);
        
        let is_paused = idle_time > chrono::Duration::from_std(self.idle_threshold).unwrap();
        if is_paused {
            log::debug!("Paused. Idle time: {}ms", idle_time.num_milliseconds());
        }
        is_paused
    }
} 