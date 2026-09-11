# fenom-tmlanguage

This repository contains TmLanguage files that can be consumed by [Fenom](https://github.com/fenom-template/fenom) editors and plugins such as [Visual Studio Code](https://github.com/Microsoft/vscode), [Sublime Text](https://www.sublimetext.com), [Atom](https://atom.io), and possibly others.

## Installation

``` sh
npm install fenom-tmlanguage
```

## Development

The grammar is covered by snapshot tests. Each `tests/*.tpl` fixture has a
matching `.snap` file recording the scope assigned to every token, so any change
in highlighting shows up as a reviewable diff.

``` sh
npm test          # verify the grammar against the committed snapshots
npm run test:update  # rewrite the snapshots after an intentional change
```

Run `npm run test:update` only once you have checked the diff and confirmed the
new scopes are the intended ones — then commit the updated `.snap` files
alongside the grammar change.

The fixtures deliberately include syntax the grammar does not handle correctly
yet, so the snapshots record the current behaviour rather than the desired one.
That is what makes a fix visible as a diff.
