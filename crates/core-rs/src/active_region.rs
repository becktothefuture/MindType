/*╔══════════════════════════════════════════════════════════╗
  ║  ░  ACTIVE REGION.RS  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ No edits at or after the caret; Active region policy (render vs context ranges)
  • WHY  ▸ REQ-IME-CARETSAFE, CONTRACT-ACTIVE-REGION
  • HOW  ▸ See linked contracts and guides in docs
*/

/// Represents an active region in text
#[derive(Debug, Clone, PartialEq)]
pub struct ActiveRegion {
    /// Start position in text
    pub start: usize,
    /// End position in text
    pub end: usize,
    /// Number of words in region
    pub word_count: usize,
}

impl ActiveRegion {
    /// Create a new active region
    pub fn new(start: usize, end: usize, word_count: usize) -> Self {
        Self {
            start,
            end,
            word_count,
        }
    }

    /// Check if position is within the active region
    pub fn contains(&self, position: usize) -> bool {
        position >= self.start && position <= self.end
    }

    /// Get the length of the active region
    pub fn length(&self) -> usize {
        self.end.saturating_sub(self.start)
    }
}

/// Active region policy for calculating boundaries
pub struct ActiveRegionPolicy {
    /// Target number of words in region
    pub target_words: usize,
}

impl ActiveRegionPolicy {
    /// Create a new policy with target word count
    pub fn new(target_words: usize) -> Self {
        Self { target_words }
    }

    /// Calculate active region around caret position
    pub fn calculate_region(&self, text: &str, caret: usize) -> ActiveRegion {
        // Stub implementation - returns simple region around caret
        let start = caret.saturating_sub(50).min(text.len());
        let end = (caret + 50).min(text.len());
        let word_count = text[start..end].split_whitespace().count();
        
        ActiveRegion::new(start, end, word_count)
    }
}

impl Default for ActiveRegionPolicy {
    fn default() -> Self {
        Self::new(20) // Default to 20 words as specified in PRD
    }
}