/* Auto-generated test for REQ-LANGUAGE-GATING */
import { describe, it, expect } from 'vitest';
import { detectLanguage } from '../core/languageDetection';

describe('languageDetection', () => {
  it('detects English on simple samples', () => {
    expect(detectLanguage('This is a simple English sentence.')).toBe('en');
  });
  it('falls back to other for non-English-looking samples', () => {
    expect(detectLanguage('これは日本語の文章です。')).toBe('other');
  });
});
