# @gulomov/fenom-tmlanguage

[![npm](https://img.shields.io/npm/v/@gulomov/fenom-tmlanguage)](https://www.npmjs.com/package/@gulomov/fenom-tmlanguage)
[![tests](https://github.com/GulomovCreative/fenom-tmlanguage/actions/workflows/test.yml/badge.svg)](https://github.com/GulomovCreative/fenom-tmlanguage/actions/workflows/test.yml)
[![license](https://img.shields.io/npm/l/@gulomov/fenom-tmlanguage)](LICENSE)

A TextMate grammar for the [Fenom](https://github.com/fenom-template/fenom)
template engine, for editors and plugins that consume TextMate grammars.

The grammar is an injection over HTML: markup in a `.tpl` file is highlighted by
the editor's own HTML grammar — including CSS in `<style>` and JavaScript in
`<script>` — and Fenom tags are highlighted on top of it, wherever they appear.

## Installation

``` sh
npm install @gulomov/fenom-tmlanguage
```

> Previously published as `fenom-tmlanguage`. That name is deprecated and stops
> at 2.0.0; everything from 2.0.1 on is released under the scope. The grammar is
> the same — only the package name changed.

The package exposes the grammar three ways:

``` js
const grammarPath = require('@gulomov/fenom-tmlanguage')            // absolute path to the .json
const grammar = require('@gulomov/fenom-tmlanguage/fenom.tmLanguage.json')
const config = require('@gulomov/fenom-tmlanguage/language-configuration.json')
```

## Usage

### Visual Studio Code

VS Code reads this format directly. In an extension, register the language and
point at the two files:

``` json
{
  "contributes": {
    "languages": [
      {
        "id": "fenom",
        "aliases": ["Fenom"],
        "extensions": [".tpl"],
        "configuration": "./node_modules/@gulomov/fenom-tmlanguage/language-configuration.json"
      }
    ],
    "grammars": [
      {
        "language": "fenom",
        "scopeName": "text.html.fenom",
        "path": "./node_modules/@gulomov/fenom-tmlanguage/fenom.tmLanguage.json",
        "embeddedLanguages": {
          "source.fenom": "fenom",
          "text.html": "html"
        }
      }
    ]
  }
}
```

Copying the two files into the extension at build time works as well; the paths
above are what `require` resolves to.

`language-configuration.json` sets `{*` and `*}` as the block comment, so
toggling a comment produces Fenom's comment rather than an HTML one — the
difference matters, because a Fenom comment is stripped at compile time and
never reaches the browser. It also carries the indentation rules, which is where
`editor.autoIndent` reads from: the body of a block tag indents as you type and
`{/tag}` pulls itself back out, along with `{else}`, `{case}` and the other
branch markers.

It defines no folding markers, deliberately. Folding markers are line-based — a
line is a start or an end, never both — so `{if $a}yes{/if}` would open a region
that never closes and swallow the next `{/tag}`. VS Code folds by indentation
instead, and an extension that declares `.tpl` an HTML participant gets folding
ranges from the HTML server, which supersedes marker folding in any case.

### Sublime Text

Sublime does not load `.tmLanguage.json`. It reads `.sublime-syntax` (YAML) and
the legacy `.tmLanguage` (a Property List), so the grammar has to be converted
first — [PackageDev](https://github.com/SublimeText/PackageDev) converts between
JSON, YAML and Property List. See
[Syntax Definitions](https://www.sublimetext.com/docs/syntax.html) for which
formats are supported.

### Atom

Atom's grammar loader accepted this format, but GitHub archived Atom in December
2022 and it no longer receives updates.

## Scopes

The grammar's own scope is `text.html.fenom`. It is an injection rather than a
grammar of its own: the editor's HTML grammar highlights the markup, and these
rules are applied on top of it wherever a Fenom tag appears — except inside
comments, strings and `{ignore}` blocks, where the injection is deliberately
switched off.

Every scope below ends in `.fenom`, so a theme can target the whole language
with one selector, or any single construct with a longer one.

### Tags

| Part | Scope |
|---|---|
| `{` and `}` around a tag | `punctuation.section.embedded.begin.fenom`, `punctuation.section.embedded.end.fenom` |
| everything between them | `meta.embedded.block.fenom source.fenom` |
| `{$foo}` inside a double-quoted string | `meta.embedded.line.fenom source.fenom` |
| `/` in a closing tag, as in `{/if}` | `punctuation.definition.tag.fenom` |
| tag names and control words — `if`, `foreach`, `block`, `macro`, … | `keyword.control.fenom` |
| `:` before a tag option | `punctuation.separator.option.fenom` |
| the option itself — `ignore`, `ignoreEnd`, `escape`, `raw`, `strip` | `keyword.other.option.fenom` |
| the body of `{ignore}`, and of a tag carrying `:ignore` | `meta.embedded.literal.fenom` |

A brace followed by whitespace or by another brace is left to the host grammar,
because Fenom's own lexer reads it as literal text. That is what keeps the brace
opening a CSS property list inside `<style>` out of the injection's hands.

Only the five options above are matched. `Tag::tagOption` resolves an option by
looking for a method named `opt<Option>`, so that set is exactly what exists —
the short codes `s`, `a`, `e` and `i` that the documentation tabulates would
need `optS` and `optA`, which do not.

### Comments

| Part | Scope |
|---|---|
| `{* … *}` | `comment.block.fenom` |
| `{*` | `punctuation.definition.comment.begin.fenom` |
| `*}` | `punctuation.definition.comment.end.fenom` |
| a second `{*` inside a comment | `invalid.illegal.characters-not-allowed-here.fenom` |

Comments do not nest — Fenom closes one at the first `*}` — so a `{*` inside a
comment is marked as the mistake it is, rather than quietly opening nothing.

### Variables

| Part | Scope |
|---|---|
| `$foo` | `variable.other.fenom` |
| the `$` | `punctuation.definition.variable.fenom` |
| `$.get`, `$.const`, `$.tpl` and the other accessors | `variable.other.global.fenom` |
| the accessor name after `$.`, and `$_modx` | `support.variable.fenom` |
| `.` in `$foo.bar` and `$.get.debug` | `punctuation.accessor.fenom` |
| the property name after it | `variable.other.property.fenom` |
| `->` | `keyword.operator.fenom` |
| the method name in `$foo->bar()` | `meta.function-call.object.fenom` |
| the `(` and `)` of that call | `punctuation.definition.variable.fenom` |
| `@` before an iteration property | `punctuation.accessor.fenom` |
| `index`, `first` and `last` after it | `support.variable.property.fenom` |

Accessor names after `$.` are matched by shape rather than against Fenom's
built-in list, because `addAccessor()` lets a project register its own and a
fixed list would leave those unhighlighted. Iteration properties are the
opposite case: `Compiler::foreachProp` raises a compile error for anything but
those three, so only those three are recognised and an unknown one falls
through to the plain `@` operator.

### Values

| Part | Scope |
|---|---|
| `'…'` | `string.quoted.single.fenom` |
| `"…"` | `string.quoted.double.fenom` |
| the quotes | `punctuation.definition.string.begin.fenom`, `punctuation.definition.string.end.fenom` |
| `\n`, `\x41`, `\\` and the other escapes | `constant.character.escape.fenom` |
| `true` and `false`, in either case | `constant.language.fenom` |
| `42` | `constant.numeric.decimal.fenom` |
| `1.5`, `2e10` | `constant.numeric.float.fenom` |
| `0x1F` | `constant.numeric.hex.fenom` |
| `0b1010` | `constant.numeric.binary.fenom` |
| `0755` | `constant.numeric.octal.fenom` |
| `[` and `]`, both for indexing and for array literals | `punctuation.section.brackets.begin.fenom`, `punctuation.section.brackets.end.fenom` |

### Operators, modifiers and parameters

| Part | Scope |
|---|---|
| `\|` before a modifier | `keyword.operator.fenom` |
| the modifier name after it | `entity.name.function.fenom` |
| `=`, `+=`, `~=`, `\|=`, `<<=`, … | `keyword.operator.assignment.fenom` |
| `==`, `!=`, `<`, `>=`, `is`, `is not`, `in`, `in list`, … | `keyword.operator.comparison.fenom` |
| `&&`, `\|\|`, `and`, `or`, `xor`, `!` | `keyword.operator.logical.fenom` |
| `+`, `-`, `*`, `/`, `%`, `++`, `--` | `keyword.operator.arithmetic.fenom` |
| `&`, `\|`, `^`, `~`, `<<`, `>>` | `keyword.operator.bitwise.fenom` |
| `~` between operands, and `~~` | `keyword.operator.string.fenom` |
| `?:` and `!:` | `keyword.operator.ternary.fenom` |
| `?`, `:`, `@` and the rest | `keyword.operator.fenom` |
| `name=` in a tag's parameter list | `meta.attribute.fenom` |
| the name in it | `variable.parameter.fenom` |
| `from`, `as`, `plus`, `capture`, `default`, `cycle` | `support.function.built-in.fenom` |

A bare `~` is the concatenation operator when it sits between operands and
bitwise not when it prefixes one, which is why the two carry different scopes
for the same character.

## Development

The grammar is covered by eight test suites.

**Grammar file checks.** `tests/grammar-file.test.mjs` checks that the grammar
and the language configuration parse and carry no duplicate keys — `JSON.parse`
keeps the last of a repeated key and drops the earlier ones silently, which once
left a rule with a comment that never applied.

**Indentation tests.** `tests/indentation.test.mjs` runs VS Code's two-ended
indentation rule — decrease against the line being typed, increase against the
line above — over a template covering every block tag Fenom has. Each line is
stripped of its indentation and re-indented from scratch, and the result has to
come back identical, so a rule that drifts shows up as the line where the two
part company.

**Snapshot tests.** Each `tests/*.tpl` fixture has a matching `.snap` file
recording the scope assigned to every token, so any change in highlighting shows
up as a reviewable diff. They run against a stub of the HTML grammar, which
keeps the snapshots free of churn from VS Code's bundled grammars.

**Nesting tests.** `tests/nesting/` checks the grammar against a real HTML
grammar with CSS and JavaScript nested inside it. This grammar is injected with
`L:` priority, so any rule of ours that matches consumes the text before the host
grammar can see it — which is how a rule matching `{ ` once swallowed the brace
that opens a CSS property list and left the rest of the document, `</style>`
included, parsed as CSS. The snapshot suite cannot see that class of bug,
because it stubs the HTML grammar out.

**Line ending tests.** `tests/line-endings.test.mjs` packs the tarball and reads
the archived bytes back, checking every published file for CR. Consumers copy
these files into their own repositories and compare them byte for byte, so the
bytes must not depend on the platform a release was cut from. `.gitattributes`
pins the checkout to LF; this suite is the guard that the pinning held, and it
runs from `prepublishOnly` as well, because the only machine where the fault can
occur is the one cutting the release.

**README checks.** `tests/readme.test.mjs` holds the Scopes section above to
the grammar in both directions: a scope the grammar assigns and the README does
not list fails the suite, and so does a scope the README still lists after it
was renamed away. Scope names are what themes target, so an undocumented one is
one nobody can style.

**Package checks.** `tests/package.test.mjs` packs the tarball, installs it into
an empty project and loads it by name. The `exports` field changes how names
resolve, so requiring a file by relative path — what every other suite does —
keeps passing even when the package is broken for everyone installing it. The
list of published files is pinned down here too.

**Release checks.** `tests/release.test.mjs` covers the scripts under
`scripts/`: what refuses to release, and how the changelog's `Unreleased`
section is closed into a version. Both run at moments that are awkward to
reach on purpose, so what can be decided from text alone lives in pure
functions and is tested here.

``` sh
npm test             # all eight suites
npm run test:update  # rewrite the snapshots after an intentional change
```

Run `npm run test:update` only once you have checked the diff and confirmed the
new scopes are the intended ones — then commit the updated `.snap` files
alongside the grammar change.

The snapshots record what the grammar currently does, not what it ought to do.
Some fixtures are deliberately invalid Fenom — `{$5foo}`, `{if:i $cdn}`,
`{$value@key}` — and are there to pin down that the grammar does *not* dress
them up as valid syntax.

## Releasing

Write changelog entries under `## [Unreleased]` as you go. That is the whole
preparation — the version number, the heading, its date, the fresh empty
`Unreleased` and the link definitions at the foot of the file are written by
`npm version` when the release is cut.

``` sh
npm run publish:patch   # or publish:minor, publish:major
```

Each script runs `npm version`, which checks that the release may be cut at all,
closes the changelog, bumps the version, commits, tags, and pushes the commit
and the tag. The tag is what publishes: it starts
[`.github/workflows/release.yml`](.github/workflows/release.yml), which runs the
tests again, publishes to npm and opens a GitHub release with that version's
changelog section as its body.

Publishing from a runner rather than from a laptop is deliberate. The package is
made of files consumers copy into their own repositories and compare byte for
byte, and until 2.0.2 what went out depended on the machine it was cut from — a
Windows checkout put CRLF into a release that the repository itself never held.

The workflow carries no npm token: it authenticates as itself over OIDC, which
npm calls trusted publishing, and that is configured once on the package's
settings page on npmjs.com. [CONTRIBUTING.md](CONTRIBUTING.md) has the details,
including what to do when a publish fails after the tag is already pushed.
