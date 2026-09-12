# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- `postversion` pushes before it publishes. Earlier releases had it the other
  way round, so that a failed publish could not leave a released tag behind in
  the remote. Now that the default branch is protected, the likelier failure is
  the opposite one — the publish succeeds and the push is rejected — and that
  one cannot be repaired, because a published version number can never be
  reused. A pushed tag with no matching release can be: run `npm publish` again.
- The npm description no longer offers the package "for VS Code, Sublime Text,
  and Atom". Sublime does not load `.tmLanguage.json` without converting it
  first, and Atom was archived in 2022, so that line promised two things the
  file does not do. It now says what the grammar is instead. Keywords lowercased
  and widened for search.

## [2.0.1] — 2026-09-12

### Changed

- Published as `@gulomov/fenom-tmlanguage` from this release on. The unscoped
  `fenom-tmlanguage` is deprecated and stops at 2.0.0, whose grammar is
  identical to this one — only the package name, the publish configuration and
  the documentation differ. Update the dependency name and every `require`,
  including the paths a VS Code extension points at, which now sit under
  `node_modules/@gulomov/`.

## [2.0.0] — 2026-09-11

Published as `fenom-tmlanguage`, the last release under that name.

### Breaking

- The root export is now the **path** to the grammar file rather than the parsed
  grammar object. `exports` previously mapped `.` straight to the JSON, which
  shadowed `main` on Node >= 12.17 and left `index.js` dead, so requiring the
  package returned an object. It now resolves through `index.js` as intended.
  Read the grammar as an object from the `./fenom.tmLanguage.json` subpath.

### Added

- `language-configuration.json`, so editors get Fenom's `{* *}` block comment,
  bracket matching and auto-closing pairs.
- Subpath exports for `./fenom.tmLanguage.json`, `./language-configuration.json`
  and `./package.json`. The grammar file was previously unreachable by path,
  which is what a VS Code extension's `contributes.grammars[].path` needs.
- Highlighting for numeric literals in every notation Fenom accepts: decimal,
  hexadecimal, binary, octal and floating point with exponents.
- The `while`, `do`, `escape` and `strip` tags.
- The operators that were missing: the ternaries `?:` and `!:`, the test
  operators `is` and `is not`, the containment operators `in`, `not in`,
  `in list`, `in keys` and `in string`, plus `<>`, `<<`, `>>`, `<<=`, `>>=`,
  `~~`, `~=`, `++`, `--` and the single-character `|` and `&`.
- Per-category operator scopes — `keyword.operator.assignment`, `.comparison`,
  `.logical`, `.arithmetic`, `.bitwise`, `.string`, `.ternary` — alongside the
  existing `keyword.operator` prefix, which themes matching on that prefix keep
  picking up unchanged.
- Element access: dot access, square brackets and the accessor name in `$.get`,
  `$.const` and friends.
- The `{foreach}` iteration properties `@index`, `@first` and `@last`.
- Tag options, as in `{if:ignore $cdn}` and `{foreach:ignore:strip ...}`.
- String interpolation in double-quoted strings, both the simple `"$user"` form
  and the braced `"{$user.name|up}"` form.
- `{ignore} ... {/ignore}`, which now suppresses Fenom highlighting for its
  contents — the documented way to embed CSS or JavaScript in a template.
- The `:ignore` tag option. A block tag carrying it, as in
  `{if:ignore $cdn}`, suppresses Fenom highlighting for its body the same way
  the `{ignore}` tag does, up to the matching closing tag.
- `meta.embedded.block` and `meta.embedded.line` scopes marking tag bodies and
  interpolations as embedded regions.
- Three test suites — snapshots of every token's scope, a nesting suite that
  checks the grammar against a real HTML grammar with CSS and JavaScript inside
  it, and integrity checks on the grammar file — plus CI running all of them on
  Node 18, 20 and 22.

### Fixed

- The injection no longer consumes a brace followed by whitespace. It is matched
  with `L:` priority, so doing so took the brace before the host grammar could
  see it: inside a `<style>` element that swallowed the brace opening a CSS
  property list, after which the CSS grammar never recognised `</style>` and
  parsed the rest of the document, `<script>` included, as CSS.
- An ignored region keeps the highlighting of the language around it. A
  begin/end rule takes over its whole span, so `{ignore}` wrapping the `<style>`
  element from the documentation left its CSS with no highlighting at all; the
  host grammar is now included back into the region, while Fenom stays out.
- Operator alternatives are ordered longest first. `===` used to be emitted as
  three separate `=` tokens and `<>` as `<` followed by `>`.
- Division matches a bare `/`. It previously required a trailing space, so
  `$a/$b` went unrecognised.
- Interpolation no longer happens inside single-quoted strings, where Fenom
  prints `{'Hi, {$foo}'}` verbatim.
- Escape sequences follow the quote style: a double-quoted string takes the
  documented set including octal and hex, a single-quoted string takes only `\'`
  and `\\`.
- `{}` is literal text rather than an empty tag.
- Capture groups in the modifier, attribute and variable rules named group 0 —
  the whole match — where an inner group was meant, so `|truncate` was scoped as
  a function name pipe included, `index=` as a parameter name equals sign
  included, and every variable token carried `variable.other.fenom` twice.
- The variable rule no longer matches `$ foo`, `$-foo` or `$5foo` as variable
  names.
- The `{% %}` and `{{* *}}` delimiters are gone. Fenom hardcodes `{` and `}`,
  and treats both of those spellings as tags.
- A failed `npm publish` no longer leaves a released tag behind in the remote:
  `postversion` publishes before it pushes.
- `files` restricts the published package to the grammar, the language
  configuration and the entry point.

## [1.0.0] — 2023-11-05

Initial release, published as `fenom-tmlanguage`. It was never tagged in git, so
the link below points at the commit it was cut from.

[2.0.1]: https://github.com/GulomovCreative/fenom-tmlanguage/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/GulomovCreative/fenom-tmlanguage/compare/0cea81a1afde02559372eedf5f27992e431f3315...v2.0.0
[1.0.0]: https://github.com/GulomovCreative/fenom-tmlanguage/commit/0cea81a1afde02559372eedf5f27992e431f3315
