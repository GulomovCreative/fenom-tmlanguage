// Checks that the grammar composes with a real HTML grammar and the CSS and
// JavaScript grammars nested inside it.
//
// The snapshot suite stubs text.html.derivative out, which keeps those
// snapshots stable but means it cannot see interactions with the host grammar.
// This grammar is injected with L: priority, so a rule of ours that matches
// consumes the text before the host grammar can -- that is how a rule matching
// "{ " once swallowed the brace opening a CSS property list and left everything
// after it, </style> included, parsed as CSS.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHighlighter } from 'shiki';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');

const grammar = JSON.parse(
  fs.readFileSync(path.join(root, 'fenom.tmLanguage.json'), 'utf8')
);

const highlighter = await createHighlighter({
  themes: ['github-light'],
  langs: [
    { ...grammar, name: 'fenom', embeddedLangs: ['html-derivative'] },
    'html-derivative',
    'html',
    'css',
    'javascript',
  ],
});

const file = path.join(here, 'page.html');
const source = fs.readFileSync(file, 'utf8');
const { tokens } = highlighter.codeToTokens(source, {
  lang: 'fenom',
  theme: 'github-light',
  includeExplanation: true,
});

// Shiki merges adjacent tokens that share a colour; the explanation entries are
// the real grammar tokens.
const parsed = tokens.map((line) =>
  line.flatMap((token) =>
    (token.explanation ?? []).map((entry) => ({
      text: entry.content,
      scopes: entry.scopes.map((scope) => scope.scopeName),
    }))
  )
);

const lines = source.split(/\r?\n/);
const lineOf = (needle) => {
  const index = lines.findIndex((line) => line.includes(needle));
  if (index === -1) throw new Error(`fixture has no line containing ${needle}`);
  return index;
};

const failures = [];

function check(description, { line, text, occurrence = 0, expect }) {
  const matches = parsed[line].filter((token) => token.text === text);
  const token = matches[occurrence];
  if (!token) {
    failures.push(
      `${description}\n    no token ${JSON.stringify(text)} (occurrence ${occurrence}) on line ${line + 1}: ${lines[line]}`
    );
    return;
  }
  const missing = expect.filter((scope) => !token.scopes.includes(scope));
  if (missing.length) {
    failures.push(
      `${description}\n    token ${JSON.stringify(text)} on line ${line + 1} is missing ${missing.join(', ')}\n    actual: ${token.scopes.join(' ')}`
    );
  }
}

const css = lineOf('h1 {');
const plainCss = lineOf('.plain {');
const styleEnd = lineOf('</style>');
const jsVar = lineOf('var n =');
const jsObject = lineOf('var o =');
const jsTag = lineOf('{if $debug}');
const attributes = lineOf('<div class=');

// The host grammars must keep working: these are the parts a greedy Fenom rule
// breaks first.
check('CSS opens its property list', {
  line: css,
  text: '{',
  expect: ['source.css', 'punctuation.section.property-list.begin.bracket.curly.css'],
});
check('a CSS rule with no Fenom in it is untouched', {
  line: plainCss,
  text: 'font-size',
  expect: ['source.css', 'support.type.property-name.css'],
});
check('the style element still closes', {
  line: styleEnd,
  text: 'style',
  expect: ['meta.tag.metadata.style.end.html', 'entity.name.tag.html'],
});
check('JavaScript still parses, so <script> was entered as JavaScript', {
  line: jsObject,
  text: '{',
  expect: ['source.js', 'meta.objectliteral.js'],
});

// Fenom must still be highlighted in all three nested contexts.
check('Fenom inside an HTML attribute value', {
  line: attributes,
  text: 'cls',
  expect: ['string.quoted.double.html', 'source.fenom', 'variable.other.fenom'],
});
check('Fenom inside a CSS property value', {
  line: css,
  text: 'theme',
  expect: ['source.css', 'meta.property-value.css', 'source.fenom', 'variable.other.fenom'],
});
check('Fenom inside JavaScript', {
  line: jsVar,
  text: 'count',
  expect: ['source.js', 'source.fenom', 'variable.other.fenom'],
});
check('a Fenom tag inside JavaScript', {
  line: jsTag,
  text: 'if',
  expect: ['source.js', 'source.fenom', 'keyword.control.fenom'],
});

// An ignored region takes over its whole span, so the host grammar has to be
// included back into it explicitly. Without that the contents lose all
// highlighting rather than just the Fenom part of it.
const ignoredCss = lineOf('.ignored {');
check('CSS inside {ignore} is still highlighted', {
  line: ignoredCss,
  text: 'color',
  expect: [
    'meta.embedded.literal.fenom',
    'source.css',
    'support.type.property-name.css',
  ],
});

// The body of a tag carrying :ignore is emitted verbatim, so no Fenom scope
// may appear in it.
// text.html.fenom is the grammar's own root scope and sits on every token;
// meta.embedded.literal.fenom is the marker for the ignored region itself.
// Neither is Fenom syntax highlighting, so neither counts here.
const notSyntax = new Set(['text.html.fenom', 'meta.embedded.literal.fenom']);
const ignoredBody = lineOf('var item =');
const fenomInIgnoredBody = parsed[ignoredBody].filter((token) =>
  token.scopes.some((scope) => scope.endsWith('.fenom') && !notSyntax.has(scope))
);
if (fenomInIgnoredBody.length) {
  failures.push(
    `the body of a tag with :ignore carries no Fenom scope\n    ${fenomInIgnoredBody
      .map((t) => `${JSON.stringify(t.text)} -> ${t.scopes.join(' ')}`)
      .join('\n    ')}`
  );
}

if (failures.length) {
  console.error(`\n${failures.length} nesting check(s) failed:\n`);
  for (const failure of failures) console.error('  ' + failure + '\n');
  process.exit(1);
}

console.log('✓ tests/nesting/page.html composes correctly with HTML, CSS and JavaScript.');
