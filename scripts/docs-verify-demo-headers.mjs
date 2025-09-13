#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const demoRoot = path.join(root, 'web-demo', 'public', 'demo');

function listHtml(dir) {
  const out = [];
  function walk(d) {
    let ents = [];
    try { ents = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of ents) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.isFile() && e.name === 'index.html') out.push(p);
    }
  }
  walk(dir);
  return out;
}

function hasIncludes(html) {
  return html.includes('mt-version') && html.includes('mt-last-updated');
}

const files = listHtml(demoRoot);
const missing = [];
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  if (!hasIncludes(s)) missing.push(path.relative(root, f));
}

if (missing.length) {
  console.error('Demo pages missing required header meta:');
  for (const m of missing) console.error(' - ' + m);
  process.exit(1);
}
console.log('All demo index.html files include required header meta.');


