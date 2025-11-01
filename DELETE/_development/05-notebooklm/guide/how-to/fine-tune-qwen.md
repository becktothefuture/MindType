<!--══════════════════════════════════════════════════
  ╔══════════════════════════════════════════════════════╗
  ║  ░  F I N E - T U N I N G   Q W E N   F O R   M T  ░░  ║
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
    • WHAT ▸ How to fine‑tune Qwen for Mind::Type’s band‑bounded
             grammar/clarity corrections
    • WHY  ▸ Improve accuracy and determinism while preserving
             latency and caret safety
    • HOW  ▸ SFT (LoRA/QLoRA) on span‑labeled data → export to
             ONNX q4 → load via Transformers.js
-->

### Fine‑tuning Qwen for Mind::Type

In plain words: we’ll teach a small open‑source model (Qwen) to be a
great “micro‑editor.” You highlight a small bit of text (the Span), and
the model returns only the fixed version of that Span. We keep it fast
and stable so it works in your browser.

This guide explains how we fine‑tune a small Qwen variant to follow
Mind::Type’s constraints: correct only the selected Span, never add extra
words, and remain deterministic and low‑latency on WebGPU/WASM.

#### Before you start: a quick glossary

- Model: the “brain” that predicts text.
- Fine‑tune: show the model many example pairs so it learns our task.
- Span: the exact selection of text we want to fix.
- Context: a little text before and after the Span to give clues.
- Deterministic: same input → same output (we disable randomness).
- JSONL: one JSON object per line in a file.
- LoRA/QLoRA: a cheap way to fine‑tune by adding small adapters; QLoRA uses
  4‑bit math to save memory.
- ONNX/q4: a portable model format (ONNX) with 4‑bit weights (q4) so it’s
  small and fast in the browser.

### Current usage in the codebase (context)

In plain words: today we already run a small Qwen model in the browser.
We give it a short instruction and a prompt. It streams words back while
you type.

- The LM path is handled by the shared v0.4 LM stack (`core/lm/*`) with strict single‑string prompts from `core/lm/policy.ts` and device‑tiered fallbacks.

- Determinism: `do_sample: false`, small `max_new_tokens` (~32 by default)
  and boundary‑aware chunking.

### Goal

In plain words: make the model reliably return only the fixed Span.
We’ll measure how often it matches the right answer exactly, and make
sure it doesn’t add extra words.

- Teach the model to reliably output only the corrected Span given:
  Context before, Span, Context after. Evaluate by exact‑match and
  near‑match metrics; enforce guardrails against over‑generation.

## 1) Data design

In plain words: we build a list of tiny “before → after” examples. Each
example has the Span we want to fix, a bit of text before/after it, and
the correct fixed Span.

- Input unit: one band‑bounded correction.
- Fields:
  - language (string, optional)
  - ctx_before (string)
  - span_in (string)
  - ctx_after (string)
  - span_out (string) — target the model must return
  - tags (array, optional): ["typo", "agreement", "punctuation", ...]
  - id/source (optional)

### Recommended storage format

In plain words: save your examples as JSONL. It’s simple: one example
per line, easy to version and stream.

- JSONL preferred for training and versioning.

```json
{"language":"en","ctx_before":"I has","span_in":"went to the","ctx_after":" store.","span_out":"went to the","tags":["tense"]}
{"language":"en","ctx_before":"She said","span_in":"it are","ctx_after":" fine.","span_out":"it is","tags":["agreement"]}
```

### Chat‑style alternative (for SFT with chat templates)

In plain words: some trainers like a “chat” format with roles. We keep
system (rules), user (input), assistant (correct answer).

```json
{
  "messages": [
    {
      "role": "system",
      "content": "Correct ONLY the Span. Return just the corrected Span."
    },
    {
      "role": "user",
      "content": "Context before: «I has»\nSpan: «went to the»\nContext after: « store.»"
    },
    { "role": "assistant", "content": "went to the" }
  ]
}
```

Notes:

- Keep contexts short (e.g., ≤ 60 chars left/right, as in our policy).
- Prefer realistic error distributions; stratify by error type and length.
- Include “no‑op” examples where `span_out == span_in` to reduce spurious edits.

## 2) Training approach

In plain words: we “teach” Qwen using our examples. LoRA/QLoRA lets us
train cheaply on a single GPU by adding small adapters instead of
changing the whole model.

- Method: Supervised Fine‑Tuning (SFT) with LoRA/QLoRA.
- Base: `Qwen2.5-0.5B-Instruct` (fits in modest VRAM; QLoRA works on
  consumer GPUs).
- Objective: Next‑token loss on the assistant’s reply (= `span_out`).
- Determinism at inference (no sampling); training should discourage
  verbosity via instructions and curated data.

Hardware note (simple): QLoRA can work on a single consumer GPU (e.g.,
8–24 GB). More VRAM → bigger batches → faster training.

### Minimal Python stack

In plain words: these are the tools you install.

- transformers: model and tokenizer code
- peft: LoRA/QLoRA adapters
- trl: training helpers for language models
- datasets: loading JSONL files
- bitsandbytes: 4‑bit training (QLoRA)
- accelerate: multi‑GPU/efficiency utilities
- optimum: exporting/optimizing to ONNX

- transformers, peft, trl, datasets, bitsandbytes (for QLoRA),
  accelerate, evaluate, numpy, optimum (for export).

### Example SFT (LoRA/QLoRA) sketch

In plain words: copy‑paste template. Point it at your `train.jsonl` and
`eval.jsonl`. It learns to answer with only the corrected Span.

```python
from datasets import load_dataset
from transformers import AutoTokenizer, AutoModelForCausalLM
from trl import SFTTrainer, SFTConfig
from peft import LoraConfig

model_id = "Qwen/Qwen2.5-0.5B-Instruct"
ds = load_dataset("json", data_files={"train": "train.jsonl", "eval": "eval.jsonl"})

tok = AutoTokenizer.from_pretrained(model_id, use_fast=True)
tok.pad_token = tok.eos_token

def format_example(ex):
    system = "Correct ONLY the Span. Return just the corrected Span."
    user = f"Context before: «{ex['ctx_before']}»\nSpan: «{ex['span_in']}»\nContext after: «{ex['ctx_after']}»"
    assistant = ex["span_out"]
    return tok.apply_chat_template([
        {"role": "system", "content": system},
        {"role": "user", "content": user},
        {"role": "assistant", "content": assistant},
    ], tokenize=False)

ds = ds.map(lambda ex: {"text": format_example(ex)})

lora = LoraConfig(r=16, lora_alpha=32, lora_dropout=0.05, target_modules=["q_proj","v_proj"])

trainer = SFTTrainer(
    model=AutoModelForCausalLM.from_pretrained(model_id, torch_dtype="auto"),
    train_dataset=ds["train"],
    eval_dataset=ds["eval"],
    tokenizer=tok,
    peft_config=lora,
    args=SFTConfig(
        output_dir="./out-qwen-span",
        per_device_train_batch_size=4,
        per_device_eval_batch_size=4,
        gradient_accumulation_steps=4,
        learning_rate=5e-5,
        lr_scheduler_type="cosine",
        num_train_epochs=3,
        max_seq_length=512,
        bf16=True,
        logging_steps=25,
        eval_strategy="steps",
        eval_steps=200,
        save_steps=200,
        save_total_limit=2,
    ),
)

trainer.train()
trainer.save_model("./out-qwen-span-lora")
```

Tips:

- Use QLoRA (4‑bit) for lower VRAM; increase `r` if underfitting.
- Early stop on evaluation loss/accuracy plateau; seed all runs.
- Add 10–20% “no‑change” examples to prevent gratuitous edits.

## 3) Export for web inference (Transformers.js)

In plain words: convert the trained model to ONNX and compress to 4‑bit
so it loads fast in the browser via Transformers.js.

We run ONNX with 4‑bit weights (`dtype: 'q4'`). Steps:

1. Merge LoRA into base (to remove PEFT dependency at inference):

```python
from peft import PeftModel
from transformers import AutoModelForCausalLM

base = AutoModelForCausalLM.from_pretrained(model_id)
merged = PeftModel.from_pretrained(base, "./out-qwen-span-lora")
merged = merged.merge_and_unload()
merged.save_pretrained("./out-qwen-span-merged")
```

2. Export to ONNX and quantize (Optimum):

```bash
python -m pip install optimum onnxruntime onnx
python -m optimum.exporters.onnx --model ./out-qwen-span-merged ./onnx-out

# Quantize (example; pick a 4‑bit QDQ flow supported by transformers.js)
python -m optimum.onnxruntime.quantize --model ./onnx-out --per_channel --reduce_range \
  --nbits 4 --quantization_method qdq --output ./onnx-q4
```

3. Publish to a HF repo (e.g., `your-org/qwen2.5-0.5b-span-q4-onxx`).

4. Point Mind::Type to the model by setting `modelId` or hosting locally:

- Remote: configure the worker to load your `modelId` (Transformers.js).
- Local hosting: serve the model dir and pass `localOnly: true` and
  `localModelPath` to the runner options.

## 4) Automatic evaluation and gating

In plain words: we add tests that feed examples to the model and check
its answers. If quality drops, CI fails so we notice immediately.

We evaluate end‑to‑end with the same prompts used in production.

- Golden set: add `shared-tests/fixtures/qwen_span_eval.jsonl` with ~200
  balanced examples (stratified by error type and length).
- Test harness (JS, Vitest): for each item, build the prompt using
  `selectSpanAndPrompt`, stream tokens via the workerized runner,
  post‑process with `postProcessLMOutput`, compare to `span_out`.
- Metrics (simple meanings):
  - Exact match rate: how often the output equals the expected Span.
  - Levenshtein distance: number of single‑character edits needed.
  - chrF: character‑level F‑score (balance of precision/recall).
  - “Overrun” rate: output is longer than our cap.
  - “Verbose” rate: output contains extra words/spaces.
- Gating: require ≥ X% exact match and ≤ Y% verbose on PRs touching LM.

Sketch:

```ts
// Pseudocode inside a vitest spec
const runner = createQwenTokenStreamer({ modelId: "your-org/...", localOnly: false });
for (const case of loadEvalCases()) {
  const { band, prompt } = selectSpanAndPrompt(case.text, case.caret);
  if (!band || !prompt) continue;
  let out = "";
  for await (const chunk of runner.generateStream({ prompt })) out += chunk;
  const fixed = postProcessLMOutput(out, band.end - band.start);
  expect(similarity(fixed, case.span_out)).toBeGreaterThan(THRESHOLD);
}
```

CI suggestions:

- Run a small eval subset (e.g., 50 samples) on PR to keep CI fast.
- Run full eval nightly; report trends (store metrics in artifacts).

## 5) Best practices we’ll follow

In plain words: how to keep training clean and stable.

- Data hygiene: deduplicate, decontaminate near‑duplicates between
  train/eval; maintain a fixed evaluation set.
- Stratified splits by error types and span lengths.
- Determinism: fix seeds, no sampling at inference, small `max_new_tokens`.
- Guardrails: include “no‑op” and adversarial cases (instructions inside
  Span) to minimize instruction‑following outside scope.
- Incremental iteration: tighten prompts in `policy.ts` only if training
  alone cannot remove errors; avoid conflating changes.

## 6) Step‑by‑step checklist

In plain words: do these steps in order.

1. Curate JSONL dataset (train/eval) per schema above.
2. Run SFT with LoRA/QLoRA; monitor eval exact‑match and chrF.
3. Merge LoRA and export to ONNX; quantize to q4.
4. Publish the model; plug `modelId` into Mind::Type.
5. Run automated eval; compare vs baseline and enforce gates.
6. Iterate on data (hard cases), hyper‑params, and prompt policy.

## 7) Troubleshooting

In plain words: common issues and quick fixes.

- Chat template mismatch: ensure `apply_chat_template` matches the
  model’s tokenizer; verify special tokens.
- Over‑length outputs: lower `max_new_tokens` and reinforce with data.
- Web inference issues: confirm ONNX opset and quantization are supported
  by Transformers.js backends (WebGPU/WASM). Test `localOnly` with
  `wasmPaths` for offline validation.
