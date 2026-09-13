// One loaded copy of the grammar for the suites that need to tokenize arbitrary
// text rather than a fixture.
//
// Loading a grammar is the expensive part -- the WASM regex engine and the
// embedded HTML, CSS and JavaScript grammars come with it -- so the suites that
// tokenize hundreds of inputs share this module rather than each building their
// own highlighter.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createHighlighter } from 'shiki'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** The grammar as published, loaded over a real HTML grammar as an editor would. */
export async function fenomHighlighter(themes = ['github-light']) {
  const grammar = JSON.parse(fs.readFileSync(path.join(root, 'fenom.tmLanguage.json'), 'utf8'))
  return createHighlighter({
    themes,
    langs: [
      { ...grammar, name: 'fenom', embeddedLangs: ['html-derivative'] },
      'html-derivative',
      'html',
      'css',
      'javascript',
    ],
  })
}

/**
 * Lines of { text, scopes } for the given source.
 *
 * Shiki merges adjacent tokens that share a colour, so the explanation entries
 * are read instead: those are the tokens the grammar actually produced.
 */
export function tokenizeToScopes(highlighter, source, theme = 'github-light') {
  const { tokens } = highlighter.codeToTokens(source, { lang: 'fenom', theme, includeExplanation: true })
  return tokens.map((line) =>
    line.flatMap((token) =>
      (token.explanation ?? []).map((entry) => ({
        text: entry.content,
        scopes: entry.scopes.map((scope) => scope.scopeName),
      }))
    )
  )
}

/**
 * The scopes this grammar assigned, with the ones every token carries removed.
 *
 * `text.html.fenom` sits on every token because it is the grammar's own scope,
 * so it says nothing about whether a rule matched. What is left is the evidence
 * that one did.
 */
export function ownScopes(token) {
  return token.scopes.filter((scope) => scope !== 'text.html.fenom' && scope.endsWith('.fenom'))
}
