use crate::llm::Token;
use log::debug;

pub struct Merger {
    buffer: String,
}

impl Merger {
    pub fn new(initial_text: &str) -> Self {
        debug!("Initializing Merger with text: '{}'", initial_text);
        Self {
            buffer: initial_text.to_string(),
        }
    }

    pub fn apply_token(&mut self, token: &Token) {
        debug!("Applying token: '{}'", token);
        // For now, we just append with a space.
        // A real implementation would involve diffing.
        if !self.buffer.is_empty() {
            self.buffer.push(' ');
        }
        self.buffer.push_str(token);
    }

    pub fn get_result(&self) -> &str {
        &self.buffer
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_merger() {
        let mut merger = Merger::new("Initial text.");
        merger.apply_token(&"Here".to_string());
        merger.apply_token(&"is".to_string());
        merger.apply_token(&"more.".to_string());

        assert_eq!(merger.get_result(), "Initial text. Here is more.");
    }
} 