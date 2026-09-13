# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- The README shows what the grammar looks like. The images in `docs/` are
  generated from a sample template through GitHub's light and dark themes, and a
  test fails when they drift. They are also the only check here that can see a
  scope no theme colours — the naming and README checks confirm a scope is
  well-formed and documented, not that anything styles it.
- A time budget on tokenization, over deliberately awkward input. These patterns
  run in the editor on every keystroke; a pattern that backtracks
  catastrophically stops the editor rather than colouring anything wrongly, and
  no fixture would ever show it.
- Fuzz checks over generated templates, holding two rules this grammar has
  broken before: markup carrying no tag stays with the host grammar, and a
  closed tag does not colour what follows it.
- A **Cut a release** workflow: choosing patch, minor or major on the Actions
  tab now does everything `npm version` does locally. The command-line route is
  unchanged.
- `engines` declares the minimum Node version, as the manifest of the sibling
  grammar already did.

## [2.1.1] — 2026-09-13

### Fixed

- `LICENSE` now names both copyright holders. It carried only Modix GmbH, whose
  grammar this one started from, and not the author of everything written since;
  the manifest named only the author. Both notices are required: MIT keeps the
  original one in anything derived from it, and the second covers the current
  work. A test holds both in place.

### Added

- The README documents every scope the grammar assigns. Scope names are what a
  theme targets, so an undocumented one is one nobody can style; there was no
  such list before. A test holds it to the grammar in both directions, so it
  cannot drift.

### Changed

- Releases are published by GitHub Actions from the pushed tag, not from a
  maintainer's machine. This is the same fault that put CRLF into 2.0.2: what
  reached npm depended on the machine the release was cut from. Packages
  published this way also carry npm
  [provenance](https://docs.npmjs.com/generating-provenance-statements) — the
  package page states which repository, workflow and commit built the tarball,
  and npm verifies that statement itself. Nothing changes in how the package is
  installed or used.
- Every release now gets a GitHub release, with that version's changelog
  section as its body. Previously tags were pushed without one.

## [2.1.0] — 2026-09-12

### Added

- Indentation rules, so `editor.autoIndent` indents the body of a block tag and
  pulls `{/tag}` back out as it is typed. The language configuration has never
  carried them — it was written new for 2.0.0 — so consumers that had been
  shipping their own copy lost the behaviour when they moved to the package.
  Nothing was removed here; the gap was there from the first release of the
  file.

  The rules are not the ones those copies carried. They differ in four ways,
  each of which was a defect:

  - Branch markers — `{else}`, `{elseif}`, `{foreachelse}`, `{forelse}`,
    `{case}`, `{default}` — are in *both* patterns, not just in
    `increaseIndentPattern`. VS Code applies the decrease to the line being
    typed and the increase to the line after it, so a marker listed once
    indents the branch under it without pulling itself back level with the tag
    it belongs to, and an `{if}` / `{elseif}` / `{else}` / `{/if}` chain walks
    a level to the right on every branch.
  - The closing side covers every tag Fenom registers as a block compiler —
    `if`, `foreach`, `for`, `while`, `switch`, `block`, `filter`, `macro`,
    `autoescape`, `escape`, `strip`, `ignore`, `var`, `set`, `add` — rather
    than the four it used to name. The list is taken from `Fenom::$_actions`,
    not from the documentation.
  - `{var}`, `{set}` and `{add}` open a block only when they carry no
    assignment; `Compiler::setOpen` closes the tag on the spot when it finds
    one. The pattern excludes `=` for those three, so `{var $foo = 1}` no
    longer indents the line beneath it while `{var $foo}` still does.
  - The `{{?…}}?` spelling, which allowed doubled Twig-style braces, is gone.
    Fenom hardcodes single braces and reads `{{` as a tag opening on `{`.

  A tag that opens and closes on the same line — `{if $a}yes{/if}` in an
  attribute, say — is matched and then rejected by a lookahead for its own
  closing tag, so an inline conditional does not indent the markup under it.

- Two more test suites, and the grammar file checks now cover the language
  configuration as well:

  - `tests/indentation.test.mjs` runs VS Code's two-ended rule over a template
    covering every block tag, both `{var}` forms and a set of lines that are
    not blocks at all. Every line is stripped and re-indented from scratch, and
    the result has to come back identical. Fed the older patterns, it reports
    the branch chain drifting right one level at a time.
  - `tests/line-endings.test.mjs` packs the tarball and reads the archived
    bytes back. It also runs from `prepublishOnly`, since the fault it guards
    against can only occur on the machine cutting the release and never on CI.
    It reaches npm through npm's own entry script rather than by the command
    name, because node has refused to spawn a `.cmd` without a shell since the
    fix for CVE-2024-27980 and on Windows `npm` is `npm.cmd`.

### Fixed

- Published files use LF. Every file in the 2.0.2 tarball carried CRLF, which
  matters because consumers copy the grammar and the language configuration into
  their own repositories and compare them byte for byte — a comparison that
  passed or failed depending on the platform the checkout was made on. The
  commits were never the problem; they have stored LF since the first one. The
  CRLF came from the working tree the release was packed from: with git's
  default `core.autocrlf=true` on Windows the checkout converts on the way out,
  and `npm pack` packs the working tree verbatim. `.gitattributes` now pins the
  checkout to LF regardless of that setting.

Folding markers are still not defined, and that is deliberate rather than an
oversight. The pair that used to circulate, `\{%?` and `%?\}`, matched every
brace in the file — `{$var}` and `{'text'}` opened folding regions. Restricting
them to paired tags fixes that but not the underlying limitation: folding
markers are line-based, so a line is a start or an end and never both, and
`{if $a}yes{/if}` would open a region that never closes and swallow the next
`{/tag}`. Without markers VS Code falls back to folding by indentation, which
the rules above now produce correctly, and an editor that registers a folding
range provider for the language — as an extension declaring `.tpl` an HTML
participant does — supersedes marker folding anyway.

## [2.0.2] — 2026-09-12

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

[Unreleased]: https://github.com/GulomovCreative/fenom-tmlanguage/compare/v2.1.1...HEAD
[2.1.1]: https://github.com/GulomovCreative/fenom-tmlanguage/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/GulomovCreative/fenom-tmlanguage/compare/v2.0.2...v2.1.0
[2.0.2]: https://github.com/GulomovCreative/fenom-tmlanguage/compare/v2.0.1...v2.0.2
[2.0.1]: https://github.com/GulomovCreative/fenom-tmlanguage/compare/v2.0.0...v2.0.1
[2.0.0]: https://github.com/GulomovCreative/fenom-tmlanguage/compare/0cea81a1afde02559372eedf5f27992e431f3315...v2.0.0
[1.0.0]: https://github.com/GulomovCreative/fenom-tmlanguage/commit/0cea81a1afde02559372eedf5f27992e431f3315
