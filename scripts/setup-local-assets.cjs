/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  L O C A L   A S S E T S   S E T U P   S C R I P T  ░░░░░  ║
  ║                                                              ║
  ║   Copies ONNX WASM to /assets/wasm and downloads             ║
  ║   Qwen2.5-0.5B-Instruct model files to /assets/models        ║
  ║   for local-only serving (host-agnostic).                    ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Prepare static assets for offline/Local-Only mode
  • WHY  ▸ Avoid runtime network dependency while developing
  • HOW  ▸ Copy wasm; fetch model tree from HF and stream to disk
*/

const fs = require('node:fs');
const path = require('node:path');
const ROOT = path.resolve(__dirname, '..');
const ASSETS_ROOT = path.join(ROOT, 'assets');
const DEMO_PUBLIC = path.join(ROOT, 'web-demo', 'public');
const WASM_DST = path.join(ASSETS_ROOT, 'wasm');
const MODELS_DST = path.join(ASSETS_ROOT, 'models');
const REPO = 'onnx-community/Qwen2.5-0.5B-Instruct';
const REPO_DST = path.join(MODELS_DST, REPO);
const BRAND_BG_SRC = path.join(ROOT, 'docs', 'brand', 'assets', 'background-video.webm');
const BRAND_BG_DST = path.join(DEMO_PUBLIC, 'assets', 'background-video.webm');

async function ensureDir(p) {
  await fs.promises.mkdir(p, { recursive: true });
}

async function copyWasm() {
  // Locate wasm in @xenova/onnxruntime-web
  const ortDist = path.join(ROOT, 'node_modules', '@xenova', 'onnxruntime-web', 'dist');
  const files = [
    'ort-wasm.wasm',
    'ort-wasm-threaded.wasm',
    'ort-wasm-simd.wasm',
    'ort-wasm-simd-threaded.wasm',
  ];
  await ensureDir(WASM_DST);
  for (const f of files) {
    const src = path.join(ortDist, f);
    const dst = path.join(WASM_DST, f);
    try {
      await fs.promises.copyFile(src, dst);
      console.log(`Copied ${f}`);
    } catch (e) {
      console.warn(`Skip copy ${f}: ${e.message}`);
    }
  }
}

async function copyBrandAssets() {
  try {
    await ensureDir(path.dirname(BRAND_BG_DST));
    await fs.promises.copyFile(BRAND_BG_SRC, BRAND_BG_DST);
    console.log(`Copied background video to ${path.relative(ROOT, BRAND_BG_DST)}`);
  } catch (e) {
    console.warn(`Skip background video: ${e.message}`);
  }
}

async function downloadFile(url, outPath) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} for ${url}`);
  await ensureDir(path.dirname(outPath));
  const fileStream = fs.createWriteStream(outPath);
  // @ts-ignore Node18 fetch body is a web stream; convert via reader
  const reader = res.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    fileStream.write(Buffer.from(value));
  }
  await new Promise((r) => fileStream.end(r));
}

async function downloadModelTree(repo) {
  // query the model tree and download files
  const api = `https://huggingface.co/api/models/${repo}/tree/main?recursive=1`;
  console.log(`Listing ${repo} ...`);
  const res = await fetch(api);
  if (!res.ok) throw new Error(`Failed to list ${repo}: ${res.status}`);
  const entries = await res.json();
  // Download a curated subset first (tokenizer/config) then queue heavy weights
  const priority = new Set([
    'config.json',
    'tokenizer.json',
    'tokenizer_config.json',
    'generation_config.json',
    'special_tokens_map.json',
  ]);
  const base = `https://huggingface.co/${repo}/resolve/main/`;

  // Helper to enqueue downloads
  const queue = [];
  for (const e of entries) {
    if (e.type !== 'file') continue;
    const rel = e.path;
    const url = base + rel;
    const out = path.join(REPO_DST, rel);
    const isPriority = priority.has(rel);
    if (isPriority) {
      queue.unshift({ url, out });
    } else {
      queue.push({ url, out });
    }
  }
  console.log(`Downloading ${queue.length} files to ${REPO_DST} ...`);
  let ok = 0,
    fail = 0;
  for (const job of queue) {
    try {
      await downloadFile(job.url, job.out);
      ok++;
      if (ok % 10 === 0) console.log(`Downloaded ${ok}/${queue.length}`);
    } catch (e) {
      fail++;
      console.warn(`Failed: ${job.url} → ${e.message}`);
    }
  }
  console.log(`Done. Success: ${ok}, Failed: ${fail}`);
}

async function main() {
  console.log('Setting up Local-Only assets...');
  await ensureDir(DEMO_PUBLIC);
  await ensureDir(ASSETS_ROOT);
  await ensureDir(MODELS_DST);
  await copyWasm();
  await copyBrandAssets();
  await ensureDir(REPO_DST);
  await downloadModelTree(REPO);
  console.log(
    'Local-Only assets ready. In the demo, enable “Local models only” and click Load LM.',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
