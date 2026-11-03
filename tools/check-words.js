// Checks words.js before a pull request: every word has all four fields, and no word appears twice.
// Usage: node tools/check-words.js
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const file = path.join(__dirname, "..", "words.js");
const context = {};
try {
  vm.runInNewContext(fs.readFileSync(file, "utf8") + "\n;this.CATEGORIES = CATEGORIES;", context);
} catch (e) {
  console.error("words.js could not be read: " + e.message);
  console.error("Check for a missing comma or bracket near the line above.");
  process.exit(1);
}

const problems = [];
const seen = new Map();
const names = new Set();
for (const cat of context.CATEGORIES) {
  const label = cat.nameEn || cat.name || "(unnamed category)";
  if (!cat.name || !cat.nameEn) problems.push(label + ": the category needs both name and nameEn.");
  if (names.has(cat.nameEn)) problems.push(label + ": another category already uses this nameEn.");
  names.add(cat.nameEn);
  if (!Array.isArray(cat.words) || !cat.words.length) {
    problems.push(label + ": the category has no words.");
    continue;
  }
  for (const w of cat.words) {
    for (const key of ["word", "wordEn", "hint", "hintEn"]) {
      if (!String(w[key] || "").trim()) problems.push(label + ": \"" + (w.word || "?") + "\" is missing " + key + ".");
    }
    const k = String(w.word || "").trim().toLowerCase();
    if (seen.has(k)) problems.push(label + ": \"" + w.word + "\" is already in " + seen.get(k) + ".");
    else seen.set(k, label);
  }
}

const total = context.CATEGORIES.reduce((n, c) => n + (c.words ? c.words.length : 0), 0);
if (problems.length) {
  console.error(problems.join("\n"));
  console.error("\n" + problems.length + " problem(s) found.");
  process.exit(1);
}
console.log("words.js looks good: " + context.CATEGORIES.length + " categories, " + total + " words.");
