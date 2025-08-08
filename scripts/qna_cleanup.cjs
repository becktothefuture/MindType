/*
  MindTyper — Questionnaire Cleanup

  Goal: Fix duplicated "Your answer" markers and remove outdated markers.
  Actions on docs/questionnaire/*.md (excluding archive, index, README, questions-incomplete, answer_quality_review):
  - Normalize any line like "→ **Your answer:**" or with bold/italics to a single "→ Your answer:" per question block
  - Remove lines that are exactly "**Answer:**"
  - Remove heavy "Primer:" marker lines that are not in italic one-liner form (e.g., leading "**Primer:**" or plain "Primer:")
*/

const fs = require("fs");
const path = require("path");

const root = path.resolve("/Users/alexanderbeck/Coding Folder /MindTyper");
const qDir = path.join(root, "docs", "questionnaire");

function listTargets() {
  return fs
    .readdirSync(qDir)
    .filter((f) => f.endsWith(".md"))
    .filter(
      (f) =>
        ![
          "index.md",
          "README.md",
          "answer_quality_review.md",
          "questions-incomplete.md",
        ].includes(f),
    )
    .filter((f) => !f.startsWith("archive"))
    .sort();
}

function isQuestionHeader(line) {
  return /^\*\*\d+\.\s.+\*\*$/.test(line.trim());
}

function isArrowLine(line) {
  return /^→\s*(\*\*|\*)?\s*Your answer:\s*(\*\*|\*)?\s*$/i.test(line.trim());
}

function isLegacyAnswerMarker(line) {
  return /^\*\*Answer:\*\*$/.test(line.trim());
}

function isHeavyPrimerMarker(line) {
  const t = line.trim();
  if (/^\*\*Primer:\*\*/i.test(t)) return true;
  if (/^Primer:/i.test(t) && !/^\*Primer:.*\*$/.test(t)) return true; // plain Primer: not italic
  return false;
}

function cleanupFile(filePath) {
  const orig = fs.readFileSync(filePath, "utf8");
  const lines = orig.split(/\r?\n/);
  const out = [];
  let withinQuestion = false;
  let arrowSeen = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (isQuestionHeader(line)) {
      withinQuestion = true;
      arrowSeen = false;
      out.push(line);
      continue;
    }

    if (withinQuestion) {
      if (isArrowLine(line)) {
        if (!arrowSeen) {
          out.push("→ Your answer:");
          arrowSeen = true;
        }
        // Skip any duplicates
        continue;
      }
      if (isLegacyAnswerMarker(line)) {
        // Drop "**Answer:**" markers
        continue;
      }
      if (isHeavyPrimerMarker(line)) {
        // Drop bold/plain Primer markers; retain italic one-liner already standardized elsewhere
        continue;
      }
      // On encountering a new question or separator, state resets naturally above
    }

    out.push(line);

    // Reset withinQuestion on hard separators followed by blank lines? Better to reset only when encountering next question header
  }

  const next = out.join("\n");
  if (next !== orig) {
    fs.writeFileSync(filePath, next, "utf8");
    return true;
  }
  return false;
}

function main() {
  const targets = listTargets();
  let changed = 0;
  targets.forEach((f) => {
    const p = path.join(qDir, f);
    if (cleanupFile(p)) changed++;
  });
  console.log(`Cleaned ${changed} files.`);
}

main();
