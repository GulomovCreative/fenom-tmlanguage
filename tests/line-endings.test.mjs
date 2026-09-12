// Checks that every file in the published tarball uses LF.
//
// The repository itself has always stored LF — the CRLF that reached npm in
// 2.0.2 was introduced by the checkout, not by the commits: with git's default
// `core.autocrlf=true` on Windows the working tree gets CRLF, and `npm pack`
// packs the working tree verbatim. `.gitattributes` pins the checkout to LF,
// and this test is the guard that the pinning held.
//
// It has to run against the packed archive rather than the working tree,
// because the working tree is what the guard is protecting: a check that reads
// the same bytes npm would read, but through a different path, proves nothing.
//
// On Linux CI this can never fail, which is the point of wiring it into
// `prepublishOnly` as well: there it runs on the machine cutting the release,
// which is the only machine where the fault can occur.

import { execFileSync } from 'node:child_process'
import { gunzipSync } from 'node:zlib'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const BLOCK = 512

function readString(header, offset, length) {
  const end = header.indexOf(0, offset)
  const stop = end === -1 || end > offset + length ? offset + length : end
  return header.toString('utf8', offset, stop)
}

// Minimal ustar reader: enough to walk entries and hand back file contents.
function* tarEntries(archive) {
  let offset = 0
  while (offset + BLOCK <= archive.length) {
    const header = archive.subarray(offset, offset + BLOCK)
    if (header.every((byte) => byte === 0)) return

    const name = readString(header, 0, 100)
    const size = parseInt(readString(header, 124, 12).trim(), 8) || 0
    const type = String.fromCharCode(header[156]) // '0' and NUL both mean file

    offset += BLOCK
    const content = archive.subarray(offset, offset + size)
    offset += Math.ceil(size / BLOCK) * BLOCK

    if (type === '0' || type === '\0') yield { name, content }
  }
}

const destination = mkdtempSync(join(tmpdir(), 'fenom-pack-'))
let failures = []
let checked = 0

try {
  const output = execFileSync(
    process.platform === 'win32' ? 'npm.cmd' : 'npm',
    ['pack', '--json', '--pack-destination', destination],
    { cwd: process.cwd(), encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }
  )

  const [{ filename }] = JSON.parse(output)
  const archive = gunzipSync(readFileSync(join(destination, filename)))

  for (const { name, content } of tarEntries(archive)) {
    checked++
    if (content.includes(0x0d)) failures.push(name)
  }
} finally {
  rmSync(destination, { recursive: true, force: true })
}

if (checked === 0) {
  console.error('line endings: the tarball held no files — the reader is broken')
  process.exit(1)
}

if (failures.length > 0) {
  console.error(`line endings: ${failures.length} of ${checked} published files carry CR:`)
  for (const name of failures) console.error(`  ${name}`)
  console.error('')
  console.error('The checkout is producing CRLF. Refresh the working tree against')
  console.error('.gitattributes and pack again:')
  console.error('')
  console.error('  git rm --cached -r .')
  console.error('  git reset --hard')
  process.exit(1)
}

console.log(`line endings: ${checked} published files, all LF`)
