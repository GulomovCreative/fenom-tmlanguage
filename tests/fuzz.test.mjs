// Generated inputs, checked against the two things this grammar must never do.
//
// Both failures have happened here. A rule matching `{ ` once consumed the brace
// that opens a CSS property list and left the rest of the document -- `</style>`
// included -- parsed as CSS. An unterminated construct once coloured everything
// after it. Neither shows up in a fixture, because fixtures are written by
// someone who already has the failing case in mind.
//
// The inputs are generated from a fixed seed, so a failure is reproducible: the
// seed is printed, and FUZZ_SEED runs that exact set again.

import test from 'node:test'
import assert from 'node:assert/strict'
import { fenomHighlighter, tokenizeToScopes, ownScopes } from './highlighter.mjs'

const seed = Number(process.env.FUZZ_SEED ?? 20260913)
const cases = Number(process.env.FUZZ_CASES ?? 120)
const highlighter = await fenomHighlighter()

/** mulberry32: small, seedable, and the same sequence everywhere. */
function random(state) {
  return () => {
    state = (state + 0x6d2b79f5) | 0
    let t = Math.imul(state ^ (state >>> 15), 1 | state)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const pick = (next, list) => list[Math.floor(next() * list.length)]

// Markup with no brace in it, salted with the characters that are meaningful
// *inside* a tag -- `$name`, `->`, `|`, quotes, `@index`. None of them may mean
// anything out here.
const markupPieces = [
  '<div class="a">', '</div>', '<p>', '</p>', '<br>', '<!-- html comment -->',
  'text', 'Tom &amp; Jerry', '5 &lt; 7', 'v1.2.0', '$notAVariable', 'a->b',
  'a | b', "it's fine", '"quoted"', '@index', 'price: 42',
]

// Braces Fenom itself reads as literal text: it takes a brace as opening a tag
// only when the next character is neither whitespace nor a closing brace. These
// are the ones that must stay with the host grammar -- a rule that swallowed
// them once ate the property list of a CSS rule and everything after it.
const literalBracePieces = [
  '<style>a::after { content: "x" }</style>', 'a { color: red }', '{ }', '{}',
  '<script>const o = { a: 1 };</script>', 'if (x) { y }', 'text { more text',
]

const tagPieces = [
  '{$user.name}', '{$user.name|upper}', '{if $a == 1}x{/if}', '{foreach $xs as $x}{$x}{/foreach}',
  '{* a comment *}', '{$_modx->runSnippet("x")}', '{$.get.page}', '{var $a = 1}',
  '{include "file.tpl"}', '{$a ? $b : $c}', '{ignore}{$literal}{/ignore}',
]

function markup(next, words = 6) {
  return Array.from({ length: 1 + Math.floor(next() * words) }, () => pick(next, markupPieces)).join(' ')
}

function describe(source) {
  return '\n  seed ' + seed + ', input: ' + JSON.stringify(source.length > 300 ? source.slice(0, 300) + '…' : source)
}

test('markup without a brace is left entirely to the host grammar', () => {
  const next = random(seed)
  for (let i = 0; i < cases; i++) {
    const source = Array.from({ length: 1 + Math.floor(next() * 4) }, () => markup(next)).join('\n')
    assert.ok(!source.includes('{'), 'the generator produced a brace')

    for (const line of tokenizeToScopes(highlighter, source)) {
      for (const token of line) {
        assert.deepEqual(
          ownScopes(token),
          [],
          'markup carrying no tag was scoped as Fenom: ' + JSON.stringify(token.text) + describe(source)
        )
      }
    }
  }
})

test('a brace that Fenom reads as text is left as text', () => {
  const next = random(seed + 3)
  let sawBrace = false

  for (let i = 0; i < cases; i++) {
    const source = Array.from({ length: 1 + Math.floor(next() * 3) }, () =>
      [markup(next, 3), pick(next, literalBracePieces), markup(next, 3)].join(' ')
    ).join('\n')
    sawBrace = sawBrace || source.includes('{')

    for (const line of tokenizeToScopes(highlighter, source)) {
      for (const token of line) {
        assert.deepEqual(
          ownScopes(token),
          [],
          'a literal brace was read as a tag: ' + JSON.stringify(token.text) + describe(source)
        )
      }
    }
  }

  assert.ok(sawBrace, 'no braces were generated — the check proves nothing')
})

test('a closed tag does not colour what follows it', () => {
  const next = random(seed + 1)
  for (let i = 0; i < cases; i++) {
    const tail = markup(next)
    const source = markup(next) + ' ' + pick(next, tagPieces) + ' ' + tail
    const [line] = tokenizeToScopes(highlighter, source)

    // Everything after the tag is markup again; walk back from the end of the
    // line over exactly that text and require it unscoped.
    let remaining = tail.length
    for (const token of [...line].reverse()) {
      if (remaining <= 0) break
      remaining -= token.text.length
      assert.deepEqual(
        ownScopes(token),
        [],
        'text after a closed tag stayed inside it: ' + JSON.stringify(token.text) + describe(source)
      )
    }
  }
})

test('any mixture of the two tokenizes completely and without throwing', () => {
  const next = random(seed + 2)
  for (let i = 0; i < cases; i++) {
    // Deliberately unbalanced: braces, quotes and closing tags that match
    // nothing are the inputs a half-typed template is made of.
    const source = Array.from({ length: 1 + Math.floor(next() * 6) }, () =>
      pick(next, [...markupPieces, ...tagPieces, '{', '}', '{/if}', '{*', '*}', '{$', '"', '{if $a'])
    ).join(next() < 0.3 ? '\n' : ' ')

    const lines = tokenizeToScopes(highlighter, source)
    const sourceLines = source.split('\n')
    assert.equal(lines.length, sourceLines.length, 'a line went missing' + describe(source))

    lines.forEach((line, index) => {
      const covered = line.map((token) => token.text).join('')
      assert.equal(
        covered.replace(/\n$/, ''),
        sourceLines[index],
        'the tokens do not add up to the line' + describe(source)
      )
    })
  }
})
