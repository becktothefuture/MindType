/*
╔══════════════════════════════════════════════════════════════╗
║  ░  CONFIDENCE  T H R E S H O L D S  &  A D A P T I O N   ░░  ║
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
  • WHAT ▸ Compute dynamic thresholds vs caret distance and edit class
  • WHY  ▸ Gate edits to preserve trust; adapt using undo signals
  • HOW  ▸ Stateless calculators + small state for adaptation
*/

pub struct ConfidenceConfig {
    pub base_threshold: f32,
}

pub fn threshold_for_distance(cfg: &ConfidenceConfig, distance_chars: usize) -> f32 {
    let mut t = cfg.base_threshold + (distance_chars as f32) * 0.01;
    if t > 0.95 { t = 0.95; }
    t
}



