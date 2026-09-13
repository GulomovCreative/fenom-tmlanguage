// A time budget on tokenization.
//
// These patterns run in the editor on every keystroke, once per line. A regex
// that backtracks catastrophically does not produce a wrong colour -- it stops
// the editor, and that is the one failure a user feels immediately. The cost is
// also invisible in every other suite here: the fixtures are short and
// well-formed, which is exactly the input that never triggers it.
//
// The budget is deliberately loose. Catastrophic backtracking is exponential:
// the cases below take single-digit to tens of milliseconds today, and a rule
// that starts backtracking takes seconds or minutes. A tight budget would only
// buy flaky failures on a loaded runner.

import test from 'node:test'
import assert from 'node:assert/strict'
import { fenomHighlighter, tokenizeToScopes } from './highlighter.mjs'

const budgetMs = 1000
const highlighter = await fenomHighlighter()

// Inputs built to make each family of rules work as hard as it can: long
// alternations, unterminated constructs, and deep repetition of the pieces that
// appear inside a tag.
const cases = {
  'a long chain of method calls': '{' + '$foo->bar('.repeat(60) + '}',
  'many operators in one tag': '{' + '$a ~ $b + '.repeat(400) + '$c}',
  'an unterminated string': '{"' + 'x'.repeat(4000) + '}',
  'deeply repeated brackets': '{' + '['.repeat(500) + '}',
  'an unterminated tag with many parameters': '{foreach $x as $y' + ' &p=1'.repeat(300),
  'a tag head that never closes': '{if:ignore ' + '$a == "} " '.repeat(200),
  'many tags on one line': '{$a|upper}'.repeat(400),
  'markup with braces that open nothing': '<div style="a { b }">'.repeat(200),
  'a comment that never ends': '{*' + ' text'.repeat(800),
}

// The first call pays for lazy initialisation inside the tokenizer; measuring it
// would measure the wrong thing.
tokenizeToScopes(highlighter, '{$warmup|upper}')

for (const [name, source] of Object.entries(cases)) {
  test('tokenizing ' + name + ' stays within the budget', () => {
    const started = process.hrtime.bigint()
    const lines = tokenizeToScopes(highlighter, source)
    const elapsed = Number(process.hrtime.bigint() - started) / 1e6

    assert.ok(lines.length > 0, 'nothing was tokenized')
    assert.ok(
      elapsed < budgetMs,
      'took ' + elapsed.toFixed(0) + ' ms, budget is ' + budgetMs + ' ms — a rule is backtracking'
    )
  })
}
