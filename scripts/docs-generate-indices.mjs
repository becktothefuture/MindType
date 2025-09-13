#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd());
const docsRoot = path.join(repoRoot, 'docs');

function isDir(p) {
  try { return fs.statSync(p).isDirectory(); } catch { return false; }
}

function listChildren(dir) {
  try { return fs.readdirSync(dir, { withFileTypes: true }); } catch { return []; }
}

function mdTitleFromFile(p) {
  try {
    const s = fs.readFileSync(p, 'utf8');
    const m1 = s.match(/^#\s+(.+)$/m);
    if (m1) return m1[1].trim();
    const m2 = s.match(/^<\!--[\s\S]*?░\s+(.+?)\s+░[\s\S]*?-->\s*/m);
    if (m2) return m2[1].trim();
  } catch {}
  return path.basename(p);
}

function swissHeader(title) {
  return `<!--══════════════════════════════════════════════════\n  ╔══════════════════════════════════════════════════════════════╗\n  ║  ░  ${title}  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  ║\n  ║                                                              ║\n  ║                                                              ║\n  ║                                                              ║\n  ║                                                              ║\n  ║           ╌╌  P L A C E H O L D E R  ╌╌                      ║\n  ║                                                              ║\n  ║                                                              ║\n  ║                                                              ║\n  ║                                                              ║\n  ╚══════════════════════════════════════════════════════════════╝\n    • WHAT ▸ Index of this folder\n    • WHY  ▸ Quick navigation and discovery\n    • HOW  ▸ Auto-generated; edit children, not this list\n-->`;
}

function generateIndex(dir) {
  const rel = path.relative(docsRoot, dir) || '.';
  const base = path.basename(dir);
  const title = `${base} — Index`;
  const entries = listChildren(dir)
    .filter(d => !(d.name.toLowerCase() === 'readme.md'))
    .map(d => {
      const p = path.join(dir, d.name);
      if (d.isDirectory()) {
        // Point to nested README if present
        const readme = path.join(p, 'README.md');
        const display = d.name;
        if (fs.existsSync(readme)) return `- [${display}](${encodeURI(`./${d.name}/README.md`)})`;
        return `- [${display}](${encodeURI(`./${d.name}/`)})`;
      }
      if (d.isFile() && d.name.toLowerCase().endsWith('.md')) {
        const title = mdTitleFromFile(p);
        return `- [${title}](${encodeURI(`./${d.name}`)})`;
      }
      return null;
    })
    .filter(Boolean)
    .join('\n');

  const out = `${swissHeader(title)}\n\n# ${base} — Folder Index\n\n${entries ? entries : '_No items_'}\n`;
  const outFile = path.join(dir, 'README.md');
  fs.writeFileSync(outFile, out, 'utf8');
}

function main() {
  const top = listChildren(docsRoot)
    .filter(d => d.isDirectory())
    .map(d => path.join(docsRoot, d.name));
  for (const dir of top) {
    // Only for numbered or utility folders
    const bn = path.basename(dir);
    if (/^\d{2}-[A-Za-z0-9_-]+$/.test(bn) || bn === '99-traceability') {
      generateIndex(dir);
    }
  }
  console.log('Generated README indices for top-level docs folders.');
}

main();


