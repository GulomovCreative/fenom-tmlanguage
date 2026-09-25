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

// Every place that includes the host HTML grammar lists text.html.derivative
// and then text.html.basic straight after it, as the fallback for hosts that
// load only the plain grammar. Shiki always loads basic alongside derivative,
// so the nesting tests tokenize the same with or without the derivative
// include and cannot tell whether it is there or in front; this can.
const grammar = JSON.parse(sources.get('fenom.tmLanguage.json'));
const hostIncludes = [];
(function walk(node, where) {
  if (Array.isArray(node)) return node.forEach((item, i) => walk(item, `${where}[${i}]`));
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node.patterns)) {
    const includes = node.patterns.map((p) => p.include);
    if (includes.some((include) => /^text\.html\./.test(include ?? ''))) {
      hostIncludes.push({ where: `${where}.patterns`, includes });
    }
  }
  for (const [key, value] of Object.entries(node)) walk(value, `${where}.${key}`);
})(grammar, 'grammar');

for (const { where, includes } of hostIncludes) {
  const hosts = includes.filter((include) => /^text\.html\./.test(include ?? ''));
  const at = includes.indexOf('text.html.derivative');
  if (hosts.length !== 2 || at === -1 || includes[at + 1] !== 'text.html.basic') {
    failures.push(
      `${where} includes ${hosts.join(', ')} — the host must be text.html.derivative followed directly by text.html.basic`
    );
  }
}
if (hostIncludes.length === 0) {
  failures.push('fenom.tmLanguage.json includes no host HTML grammar at all');
}

if (failures.length) {
  console.error(`\n${failures.length} grammar file check(s) failed:\n`);
  for (const failure of failures) console.error('  ' + failure + '\n');
  process.exit(1);
}

console.log(
  `✓ ${files.join(' and ')} are valid JSON with no duplicate keys; ${hostIncludes.length} host HTML includes list derivative then basic.`
);
