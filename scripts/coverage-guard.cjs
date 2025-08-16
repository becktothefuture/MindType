/*╔══════════════════════════════════════════════════════════════╗
  ║  ░  C O V E R A G E   G U A R D   ( U T I L S  B R A N C H ) ░  ║
  ║                                                              ║
  ║   Enforces 100% branch coverage for files under utils/**.    ║
  ║   Fails CI if any utils file drops below the requirement.    ║
  ║                                                              ║
  ╚══════════════════════════════════════════════════════════════╝
  • WHAT ▸ Read coverage-summary.json and assert utils/** branches = 100
  • WHY  ▸ Safety-critical helpers must be fully tested
  • HOW  ▸ Parse summary; filter utils; exit(1) on violation
*/

const fs = require('fs');
const path = require('path');

function readJsonIfExists(targetPath) {
  try {
    const raw = fs.readFileSync(targetPath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    return null;
  }
}

const summaryPath = path.join('coverage', 'coverage-summary.json');
const summary = readJsonIfExists(summaryPath);

if (!summary) {
  console.error(`Coverage summary not found at ${summaryPath}`);
  process.exit(1);
}

const failures = [];

for (const [filePath, metrics] of Object.entries(summary)) {
  if (filePath === 'total') continue;
  const isUtils =
    filePath.includes(`${path.sep}utils${path.sep}`) || filePath.includes('/utils/');
  if (!isUtils) continue;

  const branchesPct = metrics?.branches?.pct ?? 0;
  if (branchesPct < 100) {
    failures.push({ filePath, branchesPct });
  }
}

if (failures.length > 0) {
  console.error('Utils coverage guard failed: expected 100% branch coverage');
  for (const f of failures) {
    console.error(` - ${f.filePath}: branches ${f.branchesPct}%`);
  }
  process.exit(1);
}

console.log('Utils coverage guard passed: 100% branches for utils/**');
process.exit(0);
