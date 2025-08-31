#!/usr/bin/env node
/*╔══════════════════════════════════════════════════════╗
  ║  ░  DOC2CODE COMPILER  ░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║
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
  • WHAT ▸ Parse SPEC blocks in docs, update headers, emit traceability
  • WHY  ▸ Keep code in sync with docs; docs are the master source
  • HOW  ▸ Scan docs → extract YAML in <!-- SPEC:... --> → write outputs
*/

// ⟢ Node built-ins
const fs = require('fs');
const path = require('path');
// ⟢ Deps
const fg = require('fast-glob');
const yaml = require('js-yaml');

const REPO_ROOT = path.resolve(__dirname, '..');
const DOCS_DIR = path.join(REPO_ROOT, 'docs');
const TRACE_JSON = path.join(DOCS_DIR, 'traceability.json');

/**
 * Extract SPEC blocks from a markdown string.
 * Blocks look like:
 * <!-- SPEC:REQ\n<yaml>\n-->
 */
function extractSpecBlocks(markdownText, filePath) {
  const blocks = [];
  const re = /<!--\s*SPEC:([A-Z]+)\s*([\s\S]*?)-->/g;
  let m;
  while ((m = re.exec(markdownText))) {
    const kind = m[1].trim();
    const body = m[2];
    try {
      const data = yaml.load(body);
      if (!data || typeof data !== 'object') continue;
      data.__kind = kind;
      data.__source = filePath;
      if (!data.id) {
        throw new Error(`SPEC block missing id in ${filePath}`);
      }
      blocks.push(data);
    } catch (e) {
      throw new Error(`Failed parsing SPEC block in ${filePath}: ${e.message}`);
    }
  }
  return blocks;
}

function readAllSpecs() {
  const files = fg.sync(['docs/**/*.md'], { cwd: REPO_ROOT, dot: false });
  const specs = [];
  for (const rel of files) {
    const abs = path.join(REPO_ROOT, rel);
    const md = fs.readFileSync(abs, 'utf8');
    const blocks = extractSpecBlocks(md, rel);
    specs.push(...blocks);
  }
  return specs;
}

function writeTraceability(specs) {
  const map = {};
  for (const s of specs) {
    map[s.id] = {
      kind: s.__kind,
      title: s.title || '',
      modules: s.modules || [],
      acceptance: s.acceptance || [],
      tests: s.tests || [],
      invariants: s.invariants || [],
      types: s.types || [],
      source: s.__source,
    };
  }
  fs.writeFileSync(TRACE_JSON, JSON.stringify(map, null, 2));
}

function formatBoxHeader(title, what, why, how, style = 'js') {
  // Box width must be 72 chars total; compose lines accordingly
  const lineStart = style === 'html' ? '<!--' : '/*';
  const lineEnd = style === 'html' ? '-->' : '*/';
  const top =
    (style === 'html' ? '' : '') +
    (style === 'html' ? '' : '') +
    (style === 'html' ? '' : '') +
    (style === 'html' ? '' : '') +
    (style === 'html' ? '' : '') +
    (style === 'html' ? '' : '') +
    (style === 'html' ? '' : '') +
    (style === 'html' ? '' : '') +
    (style === 'html' ? '' : '') +
    (style === 'html' ? '' : '');
  const headTop =
    (style === 'html' ? '<!--' : '/*') +
    '╔' +
    '══════════════════════════════════════════════════════'.padEnd(58, '═') +
    '╗\n';
  function lineCenter(text) {
    const innerWidth = 58; // width between ║  and  ║ with two spaces padding as in template
    const label = `  ░  ${text}  ░`;
    const padCount = Math.max(0, innerWidth - label.length);
    return `  ║${label}${'░'.repeat(padCount)}  ║\n`;
  }
  function lineBlank() {
    return '  ║' + ' '.repeat(58) + '  ║\n';
  }
  const mid = [
    lineCenter(title.toUpperCase()),
    lineBlank(),
    lineBlank(),
    lineBlank(),
    lineBlank(),
    '  ║           ╌╌  P L A C E H O L D E R  ╌╌              ║\n',
    lineBlank(),
    lineBlank(),
    lineBlank(),
    lineBlank(),
  ].join('');
  const bot =
    '  ╚' +
    '══════════════════════════════════════════════════════'.padEnd(58, '═') +
    '╝\n';
  const bullets = `  • WHAT ▸ ${what}\n  • WHY  ▸ ${why}\n  • HOW  ▸ ${how}\n`;
  const headBot = (style === 'html' ? '-->' : '*/') + '\n';
  return headTop + mid + bot + bullets + headBot;
}

function ensureHeaderForFile(absPath, headerText, style = 'js') {
  if (!fs.existsSync(absPath)) return { changed: false, reason: 'missing' };
  const original = fs.readFileSync(absPath, 'utf8');
  const hdrRe = style === 'html' ? /<!--[\s\S]*?-->/ : /\/\*╔[\s\S]*?\*\//;
  let updated;
  if (hdrRe.test(original)) {
    updated = original.replace(hdrRe, headerText.trim());
  } else {
    updated = headerText.trim() + '\n' + original;
  }
  if (updated !== original) {
    fs.writeFileSync(absPath, updated);
    return { changed: true };
  }
  return { changed: false };
}

function computeHeaderFromSpecs(fileRel, specsById) {
  // Gather all specs that reference this module
  const entries = Object.values(specsById).filter((s) =>
    (s.modules || []).includes(fileRel),
  );
  if (entries.length === 0) return null;
  const title = path
    .basename(fileRel)
    .replace(/\.[tj]s$/, '')
    .replace(/\.(html|css)$/, '')
    .replace(/[-_]/g, ' ');
  const what =
    entries
      .map((e) => e.title)
      .filter(Boolean)
      .join('; ') || 'Managed by Doc2Code';
  const idParts = [];
  for (const e of entries) {
    idParts.push(e.id);
    if (Array.isArray(e.principles)) idParts.push(...e.principles);
    if (Array.isArray(e.adrs)) idParts.push(...e.adrs);
  }
  const whyIds = idParts.join(', ');
  const why = whyIds || 'See docs';
  const how = 'See linked contracts and guides in docs';
  const style = fileRel.endsWith('.html') ? 'html' : 'js';
  return formatBoxHeader(title, what, why, how, style);
}

function syncHeaders(specs) {
  const specsById = {};
  for (const s of specs) specsById[s.id] = s;
  const allModules = new Set();
  for (const s of specs) {
    (s.modules || []).forEach((m) => allModules.add(m));
  }
  const results = [];
  for (const rel of allModules) {
    const abs = path.join(REPO_ROOT, rel);
    const header = computeHeaderFromSpecs(rel, specsById);
    if (!header) continue;
    const style = rel.endsWith('.html') ? 'html' : 'js';
    const r = ensureHeaderForFile(abs, header, style);
    results.push({ file: rel, changed: r.changed });
  }
  return results;
}

function checkReferences(specs) {
  let ok = true;
  for (const s of specs) {
    for (const rel of s.modules || []) {
      const abs = path.join(REPO_ROOT, rel);
      if (!fs.existsSync(abs)) {
        console.error(`Missing module referenced by ${s.id}: ${rel}`);
        ok = false;
      }
    }
    for (const acc of s.acceptance || []) {
      const [p, anchor] = String(acc).split('#');
      const abs = path.join(REPO_ROOT, p);
      if (!fs.existsSync(abs)) {
        console.error(`Missing acceptance file for ${s.id}: ${p}`);
        ok = false;
      } else if (anchor) {
        const content = fs.readFileSync(abs, 'utf8');
        if (!content.includes(anchor)) {
          console.error(`Missing acceptance anchor ${anchor} in ${p} for ${s.id}`);
          ok = false;
        }
      }
    }
    for (const t of s.tests || []) {
      const abs = path.join(REPO_ROOT, t);
      if (!fs.existsSync(abs)) {
        console.error(`Missing test file for ${s.id}: ${t}`);
        ok = false;
      }
    }
  }
  return ok;
}

function createMissingStubs(specs) {
  for (const s of specs) {
    for (const acc of s.acceptance || []) {
      const [p, anchor] = String(acc).split('#');
      const abs = path.join(REPO_ROOT, p);
      const dir = path.dirname(abs);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (!fs.existsSync(abs)) {
        const name = s.title || s.id;
        const scen = anchor || 'SCEN-PLACEHOLDER';
        const body = `Feature: ${name}\n\n  # ${s.id}\n  Scenario: ${name}\n    # ${scen}\n    Given a precondition\n    When an action happens\n    Then an outcome is observed\n`;
        fs.writeFileSync(abs, body);
        console.log(`Created acceptance stub: ${p}`);
      } else if (anchor) {
        const content = fs.readFileSync(abs, 'utf8');
        if (!content.includes(anchor)) {
          const add = `\n  # ${s.id}\n  Scenario: ${s.title || s.id}\n    # ${anchor}\n    Given a precondition\n    When an action happens\n    Then an outcome is observed\n`;
          fs.appendFileSync(abs, add);
          console.log(`Appended scenario stub ${anchor} to ${p}`);
        }
      }
    }
    for (const t of s.tests || []) {
      const abs = path.join(REPO_ROOT, t);
      const dir = path.dirname(abs);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      if (!fs.existsSync(abs)) {
        const name = path.basename(t).replace(/\.[tj]s$/, '');
        const file = `/* Auto-generated test stub for ${s.id} */\nimport { describe, it, expect } from 'vitest';\n\ndescribe('${s.id} ${name}', () => {\n  it('TODO: implement test for ${s.id}', () => {\n    expect(true).toBe(true);\n  });\n});\n`;
        fs.writeFileSync(abs, file);
        console.log(`Created test stub: ${t}`);
      }
    }
  }
}

function emitGeneratedTypes(specs) {
  const contracts = specs.filter((s) => s.__kind === 'CONTRACT');
  const pieces = [];
  pieces.push('/* Auto-generated by doc2code — do not edit by hand */\n');
  for (const c of contracts) {
    for (const t of c.types || []) {
      pieces.push(String(t.ts).trim() + '\n');
    }
  }
  const outDir = path.join(REPO_ROOT, 'core', 'lm');
  const outFile = path.join(outDir, 'types.generated.ts');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outFile, pieces.join('\n'));
}

function main() {
  const mode = process.argv[2] || 'check';
  const flags = new Set(process.argv.slice(3));
  const specs = readAllSpecs();
  if (specs.length === 0) {
    console.warn('No SPEC blocks found');
  }
  writeTraceability(specs);
  emitGeneratedTypes(specs);
  if (mode === 'sync' && flags.has('--create-missing-tests')) {
    createMissingStubs(specs);
  }
  const refsOk = checkReferences(specs);
  if (mode === 'sync') {
    const results = syncHeaders(specs);
    const changed = results.filter((r) => r.changed).length;
    console.log(
      `Doc2Code: headers synced for ${results.length} files (${changed} changed)`,
    );
    process.exit(refsOk ? 0 : 2);
  } else {
    // check mode: compute would-be headers and report diffs
    // For simplicity, reuse syncHeaders but avoid writing; instead, see if any change would occur
    const specsById = {};
    for (const s of specs) specsById[s.id] = s;
    let needsSync = false;
    const moduleSet = new Set();
    for (const s of specs) (s.modules || []).forEach((m) => moduleSet.add(m));
    for (const rel of moduleSet) {
      const abs = path.join(REPO_ROOT, rel);
      const header = computeHeaderFromSpecs(rel, specsById);
      if (!header) continue;
      if (!fs.existsSync(abs)) continue;
      const original = fs.readFileSync(abs, 'utf8');
      const style = rel.endsWith('.html') ? 'html' : 'js';
      const hdrRe = style === 'html' ? /<!--\s*╔[\s\S]*?-->/ : /\/\*╔[\s\S]*?\*\//;
      let wouldChange = false;
      if (hdrRe.test(original)) {
        const replaced = original.replace(hdrRe, header.trim());
        wouldChange = replaced !== original;
      } else {
        wouldChange = true;
      }
      if (wouldChange) {
        console.error(`[OUT-OF-SYNC] ${rel}`);
        needsSync = true;
      }
    }
    if (!refsOk) process.exit(2);
    process.exit(needsSync ? 1 : 0);
  }
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err.stack || err.message);
    process.exit(2);
  }
}
