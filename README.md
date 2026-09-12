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

## Development

The grammar is covered by five test suites.

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

``` sh
npm test             # all five suites
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

Rename the changelog's `Unreleased` heading to the version being cut, with the
date, and commit that first. Everything in the package — the changelog and the
npm description among it — is read from the working tree at publish time, so
anything left unmerged is simply not in the release. Both have gone out wrong
once for exactly that reason.

``` sh
npm run publish:patch   # or publish:minor, publish:major
```

Each script runs `npm version`, which bumps the version, commits it and tags it.
The `postversion` hook then pushes the commit and the tag, and publishes last.

The order matters and it is deliberate. The default branch is protected, so a
push can be rejected; if the publish ran first, that would leave a version on
npm with no commit or tag behind it, and a published version number can never
be reused. Pushing first makes the failure recoverable in both directions: a
rejected push means nothing was published, and a tag that got pushed while the
publish failed just needs `npm publish` again.

For the same reason, the account publishing a release needs a bypass entry in
the branch ruleset — otherwise `postversion` stops at the push and the release
never goes out.
