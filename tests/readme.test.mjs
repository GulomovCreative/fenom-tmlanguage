// Holds the README to the grammar.
//
// The scope names are a public interface: themes target them, and a theme can
// only target what it knows about. Documentation that is only kept up by
// remembering to keep it up goes stale on the first change that adds a rule --
// the new scope simply never reaches the table, and nobody finds out until
// someone asks why their theme does not colour it.

import fs from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const grammar = JSON.parse(fs.readFileSync(path.join(root, 'fenom.tmLanguage.json'), 'utf8'))
const readme = fs.readFileSync(path.join(root, 'README.md'), 'utf8')

// A scope that does not start with one of these is ignored by every theme, and
// the token it names renders unstyled.
const textmateRoots = new Set([
  'comment', 'constant', 'entity', 'invalid', 'keyword', 'markup', 'meta',
  'punctuation', 'source', 'storage', 'string', 'support', 'text', 'variable',
])

/**
 * Every scope the grammar assigns to a token. Only the rule sections are
 * walked: the top-level `name` and `scopeName` are the grammar's own name and
 * scope, not scopes of tokens.
 */
function collectScopeNames(node, found = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectScopeNames(item, found)
    return found
  }
  if (node && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      if ((key === 'name' || key === 'contentName') && typeof value === 'string') found.push(value)
      else collectScopeNames(value, found)
    }
  }
  return found
}

const scopeNames = [...new Set(collectScopeNames([grammar.patterns, grammar.repository, grammar.injections]))]

test('the walk over the grammar finds scopes at all', () => {
  // Without this the two tests below pass trivially if the walk ever breaks.
  assert.ok(scopeNames.length > 20, 'found only ' + scopeNames.length + ' scopes — the walk is broken')
})

test('every scope starts with a root themes recognise', () => {
  const bad = scopeNames.filter((name) => !textmateRoots.has(name.split('.')[0])).sort()
  assert.deepEqual(bad, [], 'themes will not colour these: ' + bad.join(', '))
})

test('every scope ends in .fenom', () => {
  // A theme targets the whole language with one selector, which only works if
  // the suffix is on all of them. Compound scopes carry it on each part.
  const bad = scopeNames.filter((name) => !name.split(' ').every((part) => part.endsWith('.fenom'))).sort()
  assert.deepEqual(bad, [], 'not scoped to this language: ' + bad.join(', '))
})

test('every scope is documented in the README', () => {
  const undocumented = scopeNames.filter((name) => !readme.includes(name)).sort()
  assert.deepEqual(
    undocumented,
    [],
    'missing from the README\'s Scopes section: ' + undocumented.join(', ')
  )
})

test('the README documents no scope the grammar does not assign', () => {
  // The other direction: a scope that was renamed leaves its old name behind
  // in the table, where it reads as something a theme can still target.
  const documented = [...new Set(readme.match(/[a-z][a-z0-9.-]*\.fenom/g) || [])]
  const assigned = new Set(scopeNames.flatMap((name) => name.split(' ')))
  // text.html.fenom is the grammar's own scope, named in the prose above the
  // tables rather than assigned to any token.
  const stale = documented.filter((name) => !assigned.has(name) && name !== 'text.html.fenom').sort()
  assert.deepEqual(stale, [], 'named in the README but not in the grammar: ' + stale.join(', '))
})

test('the file types the grammar claims are documented', () => {
  assert.ok(grammar.fileTypes.length > 0, 'fileTypes is empty — the grammar activates on nothing')
  const undocumented = grammar.fileTypes.filter((type) => !readme.includes('`.' + type + '`'))
  assert.deepEqual(undocumented, [], 'not in the README: ' + undocumented.join(', '))
})

test('the grammar and the language configuration are reachable as the README says', () => {
  // The README tells consumers to require three paths. If one of them stops
  // resolving, the instructions are wrong and nothing else notices.
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
  for (const subpath of Object.keys(manifest.exports)) {
    const target = manifest.exports[subpath]
    assert.ok(fs.existsSync(path.join(root, target)), 'exports "' + subpath + '" points at a missing file')
  }
  assert.equal(grammar.scopeName, 'text.html.fenom')
})
