use log::debug;
use unicode_segmentation::UnicodeSegmentation;

const SENTENCE_TERMINATORS: &[char] = &['.', '?', '!', '。', '\n'];

pub struct FragmentExtractor;

impl FragmentExtractor {
    pub fn new() -> Self {
        FragmentExtractor
    }

    pub fn extract_fragment<'a>(&self, text: &'a str) -> Option<&'a str> {
        debug!("Attempting to extract fragment from text with length {}", text.len());
        
        let last_sentence = text.unicode_sentences().last();
        
        if let Some(sentence) = last_sentence {
            if sentence.trim().is_empty() {
                return None;
            }
            // A simple heuristic: if the last sentence ends with a terminator,
            // we might be at a good point to extract.
            if let Some(last_char) = sentence.trim().chars().last() {
                if SENTENCE_TERMINATORS.contains(&last_char) {
                    debug!("Found fragment: '{}'", sentence.trim());
                    return Some(sentence.trim());
                }
            }
        }
        
        debug!("No fragment found.");
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_extract_simple_sentence() {
        let extractor = FragmentExtractor::new();
        let text = "Hello world. This is a test.";
        assert_eq!(extractor.extract_fragment(text), Some("This is a test."));
    }

    #[test]
    fn test_extract_with_whitespace() {
        let extractor = FragmentExtractor::new();
        let text = "Hello world. This is a test.   ";
        assert_eq!(extractor.extract_fragment(text), Some("This is a test."));
    }

    #[test]
    fn test_no_terminator() {
        let extractor = FragmentExtractor::new();
        let text = "Hello world";
        assert_eq!(extractor.extract_fragment(text), None);
    }

    #[test]
    fn test_japanese_terminator() {
        let extractor = FragmentExtractor::new();
        let text = "こんにちは。元気ですか。";
        assert_eq!(extractor.extract_fragment(text), Some("元気ですか。"));
    }

    #[test]
    fn test_empty_string() {
        let extractor = FragmentExtractor::new();
        let text = "";
        assert_eq!(extractor.extract_fragment(text), None);
    }
} 