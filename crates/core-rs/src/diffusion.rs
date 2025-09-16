/*╔══════════════════════════════════════════════════════════╗
  ║  ░  DIFFUSION.RS  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ║                                                            ║
  ╚══════════════════════════════════════════════════════════╝
  • WHAT ▸ Streamed diffusion of LM corrections
  • WHY  ▸ REQ-STREAMED-DIFFUSION
  • HOW  ▸ See linked contracts and guides in docs
*/

/// Diffusion controller for managing streaming text transformations
pub struct DiffusionController {
    /// Current active region boundaries
    pub active_region: (usize, usize),
    /// Processing state
    pub is_processing: bool,
}

impl DiffusionController {
    /// Create a new diffusion controller
    pub fn new() -> Self {
        Self {
            active_region: (0, 0),
            is_processing: false,
        }
    }

    /// Update the active region boundaries
    pub fn update_region(&mut self, start: usize, end: usize) {
        self.active_region = (start, end);
    }

    /// Start processing diffusion
    pub fn start_processing(&mut self) {
        self.is_processing = true;
    }

    /// Stop processing diffusion
    pub fn stop_processing(&mut self) {
        self.is_processing = false;
    }
}

impl Default for DiffusionController {
    fn default() -> Self {
        Self::new()
    }
}