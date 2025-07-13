use async_trait::async_trait;
use log::debug;

pub type Token = String;

#[async_trait]
pub trait TokenStream {
    async fn next_token(&mut self) -> Option<Token>;
}

pub struct StubStream {
    tokens: Vec<Token>,
    cursor: usize,
}

impl StubStream {
    pub fn new(text: &str) -> Self {
        let tokens = text.split_whitespace().map(|s| s.to_string()).collect();
        debug!("Created StubStream with text: '{}'", text);
        Self {
            tokens,
            cursor: 0,
        }
    }
}

#[async_trait]
impl TokenStream for StubStream {
    async fn next_token(&mut self) -> Option<Token> {
        if self.cursor < self.tokens.len() {
            let token = self.tokens[self.cursor].clone();
            self.cursor += 1;
            debug!("StubStream produced token: '{}'", token);
            Some(token)
        } else {
            debug!("StubStream finished.");
            None
        }
    }
}

// Placeholder for OpenAI implementation
pub struct OpenAIStream;
// Placeholder for CoreML implementation
pub struct CoreMLStream;

#[cfg(test)]
mod tests {
    use super::*;

    #[tokio::test]
    async fn test_stub_stream() {
        let mut stream = StubStream::new("This is a test.");
        assert_eq!(stream.next_token().await, Some("This".to_string()));
        assert_eq!(stream.next_token().await, Some("is".to_string()));
        assert_eq!(stream.next_token().await, Some("a".to_string()));
        assert_eq!(stream.next_token().await, Some("test.".to_string()));
        assert_eq!(stream.next_token().await, None);
    }
} 