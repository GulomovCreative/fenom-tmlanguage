// Renders the sample template with real editor themes, as SVG.
//
// Two things at once. It is the screenshot in the README -- a grammar is a
// visual thing and prose cannot show it -- and it is a check no other suite
// makes: a scope can be spelled correctly, start with a root themes recognise,
// be documented in the README, and still be coloured by nothing at all, because
// no theme targets it. Rendering through a real theme is what shows that.
//
// SVG rather than a bitmap: it needs no browser to produce, it is text, and its
// diff in a pull request says which token changed colour.

import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { fenomHighlighter } from '../tests/highlighter.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
export const themes = ['github-light', 'github-dark']
export const samplePath = path.join(root, 'docs', 'preview.tpl')
export const svgPathFor = (theme) => path.join(root, 'docs', 'preview-' + theme + '.svg')

// A monospace grid: every glyph is one cell wide, so a token's x is its column.
const fontSize = 13
const charWidth = 7.8
const lineHeight = 20
const padding = 18

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The SVG for one already-tokenized sample. Pure, so the test can call it. */
export function renderSvg(lines, { background, foreground }) {
  const columns = Math.max(...lines.map((line) => line.reduce((n, t) => n + t.content.length, 0)))
  const width = Math.ceil(columns * charWidth + padding * 2)
  const height = lines.length * lineHeight + padding * 2

  // One <text> per line, and the tokens flow inside it. Positioning each token
  // at a computed x instead looks right only if the viewer's font advances
  // exactly as assumed here; where it does not, every token sits a fraction off
  // and the line comes apart. Flow costs the grid nothing -- the font is
  // monospace -- and it keeps the whitespace tokens, which is what holds the
  // indentation together.
  const body = lines
    .map((line, index) => {
      const spans = line
        .map((token) => '<tspan fill="' + (token.color ?? foreground) + '">' + escape(token.content) + '</tspan>')
        .join('')
      const y = (padding + index * lineHeight + fontSize).toFixed(1)
      // xml:space belongs on the text element: Chromium ignores it on an
      // ancestor, and the leading spaces -- the indentation of the sample --
      // are dropped. The CSS property says the same thing for renderers that
      // prefer it.
      return '    <text x="' + padding + '" y="' + y + '" xml:space="preserve" style="white-space:pre">' + spans + '</text>'
    })
    .join('\n')

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="' + fontSize + '">',
    '  <rect width="' + width + '" height="' + height + '" rx="8" fill="' + background + '"/>',
    '  <g>',
    body,
    '  </g>',
    '</svg>',
    '',
  ].join('\n')
}

/** The SVG for every theme, keyed by theme name. */
export async function renderAll() {
  const source = fs.readFileSync(samplePath, 'utf8').replace(/\n$/, '')
  const highlighter = await fenomHighlighter(themes)

  return Object.fromEntries(
    themes.map((theme) => {
      const { tokens, bg, fg } = highlighter.codeToTokens(source, { lang: 'fenom', theme })
      return [theme, renderSvg(tokens, { background: bg, foreground: fg })]
    })
  )
}

async function main() {
  for (const [theme, svg] of Object.entries(await renderAll())) {
    fs.writeFileSync(svgPathFor(theme), svg)
    console.log('wrote ' + path.relative(root, svgPathFor(theme)))
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
