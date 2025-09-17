<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  F U Z Z Y   T E X T   D A T A S E T   ( E N )  ░░  ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ║                                                      ║
  ╚══════════════════════════════════════════════════════╝
    • WHAT ▸ English fuzzy→clear span-bounded dataset for Qwen SFT
    • WHY  ▸ Train deterministic micro‑edits for clarity/grammar in MT
    • HOW  ▸ JSONL (ctx_before, span_in, ctx_after → span_out, tags)
-->

### Overview

This document defines the English fuzzy‑text dataset used to fine‑tune Qwen for Mind⠶Flow, aligned with `docs/06-guides/06-02-how-to/fine-tune-qwen.md`.

- Span‑bounded: the model must return only the corrected Span.
- Short contexts: keep `ctx_before` and `ctx_after` ≤ 60 chars each.
- Deterministic: targets are exact strings; no randomness at inference.

### JSONL Schema

Each line is one training case.

Fields:

- `language` (string): "en" for this dataset
- `ctx_before` (string): short left context
- `span_in` (string): fuzzy text to fix (only this is returned corrected)
- `ctx_after` (string): short right context
- `span_out` (string): exact corrected Span
- `tags` (string[]): categories like `typo`, `transposition`, `spacing`, `ocr_noise`, etc.
- `id` (optional): stable id

Example:

```json
{
  "language": "en",
  "ctx_before": "I will",
  "span_in": "definately",
  "ctx_after": " be there.",
  "span_out": "definitely",
  "tags": ["typo"]
}
```

### Category Catalog

Use these tags to stratify examples. Include 10–20% `noop` where `span_out == span_in`.

- typo, transposition, missing_punctuation, capitalization, spacing, homophone,
  agreement, tense, article, apostrophe, ocr_noise, repetition, missing_vowels,
  keyboard_adjacent, diacritic, run_on, split_words, hyphenation, number_format,
  quote_marks, comma_splice, subject_verb, preposition, spelling_brand, uk_us, noop

Notes:

- Favor Levenshtein/Damerau‑Levenshtein edits (insert/delete/substitute/transpose).
- Prefer realistic keyboard‑adjacent substitutions for typos.
- Keep contexts semantically disambiguating when needed (e.g., homophones).

### Alignment with LM Policy

From `core/lm/policy.ts`, the instruction requires Span‑only output, no quotations, and concise rewrites. Ensure all examples can be corrected by modifying only the Span.

### File Location

- Dataset file: `datasets/fuzzy_text_en.jsonl`

### Using This Dataset with the Fine‑Tune Guide

Follow `docs/06-guides/06-02-how-to/fine-tune-qwen.md`. Minimal steps (copy/paste):

```python
from datasets import load_dataset, DatasetDict
from sklearn.model_selection import train_test_split
import json

# 1) Load JSONL as a Python list
with open('datasets/fuzzy_text_en.jsonl', 'r', encoding='utf-8') as f:
    rows = [json.loads(line) for line in f if line.strip()]

# 2) Split train/eval (e.g., 90/10 stratified by first tag)
tags = [r['tags'][0] if r.get('tags') else 'other' for r in rows]
train_rows, eval_rows = train_test_split(rows, test_size=0.1, random_state=42, stratify=tags)

# 3) Save splits to JSONL for the guide's SFT loader
def write_jsonl(path, data):
    with open(path, 'w', encoding='utf-8') as out:
        for r in data:
            out.write(json.dumps(r, ensure_ascii=False) + '\n')

write_jsonl('train.jsonl', train_rows)
write_jsonl('eval.jsonl', eval_rows)

# 4) Proceed with the guide's SFT script (apply_chat_template, SFTTrainer)
```

Then in the guide’s SFT script, map each example to chat text using:

```python
def format_example(ex):
    system = "Correct ONLY the Span. Return just the corrected Span."
    user = f"Context before: «{ex['ctx_before']}»\nSpan: «{ex['span_in']}»\nContext after: «{ex['ctx_after']}»"
    assistant = ex["span_out"]
    return tok.apply_chat_template([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
        {"role": "assistant", "content": assistant},
    ], tokenize=False)
```

Tips:

- Keep `max_new_tokens` small relative to span length.
- Include `noop` cases to discourage gratuitous edits.
- Ensure English‑only; avoid double quotes in fields unless escaped.

### Full‑sentence denoising as Span

Many training cases are full‑sentence denoising where the entire noisy sentence is the Span. In these, `ctx_before` and `ctx_after` can be empty strings, `span_in` contains the noisy sentence, and `span_out` contains the cleaned sentence.

JSONL example lines:

```json
{"language":"en","ctx_before":"","span_in":",y name is a,lex what ia youe bname?","ctx_after":"","span_out":"My name is Alex, what is your name?","tags":["denoise_full","mixed"]}
{"language":"en","ctx_before":"","span_in":"mi   emial  is  nme @ exa mple . com","ctx_after":"","span_out":"My email is name@example.com","tags":["denoise_full","email","spacing"]}
```

How training uses this file (Qwen SFT):

- We split JSONL into `train.jsonl` and `eval.jsonl`.
- For each example, we construct a chat text using the guide’s `format_example(ex)` where the User message embeds `ctx_before`, `span_in`, and `ctx_after`; the Assistant target is exactly `span_out` (Span‑only).
- Full‑sentence denoising works naturally because the Span is the entire sentence, and the model learns to return only the cleaned Span.

Evaluation reminder:

- Use exact‑match on `span_out` and track Levenshtein distance to measure denoising quality.
- Keep contexts short or empty to focus the model on denoising the Span.

### Rules for Denoising Examples

- No semantic changes: do not alter meaning or substitute different words.
- Keystroke/noise only: fix typos, spacing, quotes/parentheses, dashes, OCR/confusables, zero‑width/BOM, ligatures, units/currency formatting, URL/email spacing, and casing.
- Full‑sentence denoise is allowed when the Span is the entire sentence (contexts empty).
- Assistant output must be exactly the cleaned Span; no extra words or explanations.

<!-- DOC META: VERSION=1.0 | UPDATED=2025-09-17T20:45:45Z -->
