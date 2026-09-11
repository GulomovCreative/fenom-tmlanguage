# fenom-tmlanguage

This repository contains TmLanguage files that can be consumed by [Fenom](https://github.com/fenom-template/fenom) editors and plugins such as [Visual Studio Code](https://github.com/Microsoft/vscode), [Sublime Text](https://www.sublimetext.com), [Atom](https://atom.io), and possibly others.

## Installation

``` sh
npm install fenom-tmlanguage
```

## Development

The grammar is covered by two test suites.

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

``` sh
npm test             # both suites
npm run test:update  # rewrite the snapshots after an intentional change
```

Run `npm run test:update` only once you have checked the diff and confirmed the
new scopes are the intended ones — then commit the updated `.snap` files
alongside the grammar change.

The fixtures deliberately include syntax the grammar does not handle correctly
yet, so the snapshots record the current behaviour rather than the desired one.
That is what makes a fix visible as a diff.
