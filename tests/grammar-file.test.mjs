// Integrity checks on the grammar file itself, for mistakes that parse cleanly
// and then behave surprisingly.
//
// JSON.parse keeps the last of a repeated key and discards the earlier ones
// without complaint, so a rule can carry a comment or a pattern that silently
// never applies. That happened once already, when two "comment" keys collected
// on the tag rule during a merge. There is no parser hook for duplicates, so
// the file is scanned instead.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['fenom.tmLanguage.json', 'language-configuration.json'];
const sources = new Map();

const failures = [];

for (const name of files) {
  const source = fs.readFileSync(path.join(root, name), 'utf8');
  try {
    JSON.parse(source);
  } catch (error) {
    console.error(`\n${name} is not valid JSON: ${error.message}\n`);
    process.exit(1);
  }
  sources.set(name, source);
}

/** Every key that appears more than once in the same object literal. */
function duplicateKeys(text) {
  const duplicates = [];
  const stack = [];
  let inString = false;
  let escaped = false;
  let stringStart = -1;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') {
        inString = false;
        const frame = stack[stack.length - 1];
        // A string is a key when a colon follows it and an object encloses it.
        if (frame?.keys && /^\s*:/.test(text.slice(i + 1))) {
          const key = text.slice(stringStart + 1, i);
          if (frame.keys.has(key)) {
            duplicates.push({ key, line: text.slice(0, stringStart).split('\n').length });
          }
          frame.keys.add(key);
        }
      }
      continue;
    }

    if (char === '"') {
      inString = true;
      stringStart = i;
    } else if (char === '{') stack.push({ keys: new Set() });
    else if (char === '[') stack.push({});
    else if (char === '}' || char === ']') stack.pop();
  }

  return duplicates;
}

for (const [name, source] of sources) {
  for (const { key, line } of duplicateKeys(source)) {
    failures.push(
      `duplicate key ${JSON.stringify(key)} in ${name} at line ${line} — JSON.parse keeps the last one, so the earlier value never applies`
    );
  }
}

if (failures.length) {
  console.error(`\n${failures.length} grammar file check(s) failed:\n`);
  for (const failure of failures) console.error('  ' + failure + '\n');
  process.exit(1);
}

console.log(`✓ ${files.join(' and ')} are valid JSON with no duplicate keys.`);
