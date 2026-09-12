// Checks the indentation rules in language-configuration.json.
//
// VS Code applies the two patterns from opposite ends: decreaseIndentPattern
// against the line just typed, to pull it back out, and increaseIndentPattern
// against the line above, to push the next one in. A mid-block marker such as
// {else} therefore has to appear in both — it pulls itself back to the {if} and
// pushes the branch under it back in. Listing it in only one is what makes a
// branch chain walk to the right a level at a time.
//
// This runs the same two-ended rule over a template rather than driving the
// editor: every line is stripped of its indentation and re-indented from
// scratch, and the result has to come back identical to the template below.
// So the template is both the fixture and the expectation, and a rule that
// drifts shows up as the line where the two part company.

import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const config = JSON.parse(readFileSync(join(root, 'language-configuration.json'), 'utf8'))

const { increaseIndentPattern, decreaseIndentPattern } = config.indentationRules
const increase = new RegExp(increaseIndentPattern)
const decrease = new RegExp(decreaseIndentPattern)

const INDENT = '    '

// Correctly indented. Blocks that close on their own line, branch chains that
// have to stay level with the tag they belong to, tags carrying options, the
// two {var} forms, and constructs that are not blocks at all and must leave the
// indentation alone.
const template = `<div class="{if $user.active}on{/if}">
{if $user.admin}
    <p>{$user.name}</p>
{elseif $user.editor}
    <p>editor</p>
{else}
    <p>guest</p>
{/if}

{foreach $list as $key => $value}
    <li>{$value}</li>
{foreachelse}
    <li>empty</li>
{/foreach}

{for $i = 0 to=10 step=2}
    {$i}
{forelse}
    none
{/for}

{while $queue}
    {do $queue->pop()}
{/while}

{switch $type}
{case 'a'}
    <b>a</b>
{case 'b', 'c'}
    <i>bc</i>
{default}
    <span>?</span>
{/switch}

{block 'content'}
    {parent}
{/block}

{macro plus($x, $y, $z=0)}
    {$x + $y + $z}
{/macro}

{filter|strip}
    <p>filtered</p>
{/filter}

{strip}
    <p>stripped</p>
{/strip}

{escape 'html'}
    {$raw}
{/escape}

{autoescape true}
    {$raw}
{/autoescape}

{ignore}
    <style>a { color: red }</style>
{/ignore}

{var $greeting}
    Hello
{/var}

{var $count = 0}
{set $count = $count + 1}
{add $seen[] = $count}

{if:ignore $cdn.yandex}
    var item = {cdn: "//yandex.st/"};
{/if}

{foreach:ignore:strip $list as $v}
    {not a tag here}
{/foreach}

{$title}
{'plain string'}
{* a comment *}
{include 'file.tpl'}
{$a ? $b : $c}
</div>
`

function reindent(text) {
  let level = 0
  return text.split('\n').map((line) => {
    const content = line.trim()
    if (content === '') return ''
    if (decrease.test(content)) level = Math.max(0, level - 1)
    const indented = INDENT.repeat(level) + content
    if (increase.test(content)) level++
    return indented
  })
}

const expected = template.split('\n')
const actual = reindent(template)

const drifted = []
for (let i = 0; i < expected.length; i++) {
  if (expected[i] !== actual[i]) drifted.push(i)
}

if (drifted.length > 0) {
  console.error(`indentation: ${drifted.length} of ${expected.length} lines re-indent differently:`)
  for (const i of drifted) {
    console.error(`  line ${i + 1}`)
    console.error(`    expected: ${JSON.stringify(expected[i])}`)
    console.error(`    actual:   ${JSON.stringify(actual[i])}`)
  }
  process.exit(1)
}

// The patterns above are permissive on purpose — an opening tag is recognised
// anywhere on the line, so that markup can precede it. These are the lines that
// must not be read as blocks even so.
const inert = [
  '{$title}',
  '{$user.name|upper}',
  "{'plain string'}",
  '{* a comment *}',
  '{include \'file.tpl\'}',
  '{extends \'parent.tpl\'}',
  '{unset $foo}',
  '{$a ? $b : $c}',
  '{var $count = 0}',
  '{set $count = 1}',
  '{add $seen[] = 1}',
  'a { color: red }',
  '{if $a}yes{/if}',
  '<p>{if $a}yes{/if}</p>',
]

const misread = inert.filter((line) => increase.test(line) || decrease.test(line))

if (misread.length > 0) {
  console.error('indentation: these lines are not blocks but change the indentation:')
  for (const line of misread) console.error(`  ${line}`)
  process.exit(1)
}

console.log(
  `indentation: ${expected.length} lines re-indent unchanged, ${inert.length} non-block lines left alone`
)
