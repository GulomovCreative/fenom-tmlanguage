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

  const body = lines
    .map((line, index) => {
      let column = 0
      const spans = line
        .map((token) => {
          const x = (padding + column * charWidth).toFixed(1)
          column += token.content.length
          if (token.content.trim() === '') return ''
          const colour = token.color ?? foreground
          return '<tspan x="' + x + '" fill="' + colour + '">' + escape(token.content) + '</tspan>'
        })
        .join('')
      const y = (padding + index * lineHeight + fontSize).toFixed(1)
      return spans === '' ? '' : '    <text y="' + y + '">' + spans + '</text>'
    })
    .filter(Boolean)
    .join('\n')

  return [
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '" font-family="ui-monospace, SFMono-Regular, Menlo, Consolas, monospace" font-size="' + fontSize + '">',
    '  <rect width="' + width + '" height="' + height + '" rx="8" fill="' + background + '"/>',
    '  <g xml:space="preserve">',
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
