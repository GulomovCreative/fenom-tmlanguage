// Checks what someone who installs the package gets, rather than what sits in
// the repository.
//
// The difference is not cosmetic. The `exports` field changes how names
// resolve, so requiring a file by relative path -- which is what every other
// test here does -- keeps working even when the package itself is broken for
// everyone installing it. The only way to see that is to build the tarball,
// install it into an empty project, and load it by name.
//
// The list of published files is checked in the same place: a stray file in
// the archive is otherwise only visible to whoever thinks to look, and a
// publish cannot be taken back.

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import test from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))

// Taken from the manifest rather than written here: spelling the name out
// twice means a rename leaves this test checking the old one and passing.
const packageName = packageJson.name

/**
 * The environment for a nested npm call. The parent npm passes its own
 * configuration down through npm_config_* variables, and a child process
 * inherits them. Under `npm publish --dry-run` that would make the install
 * below a no-op, and the test would fail resolving the module -- that is, a
 * dry run would fail on a package that is perfectly fine.
 */
function nestedNpmEnv() {
  const env = { ...process.env }
  delete env.npm_config_dry_run
  return env
}

/**
 * Runs npm without ever looking for npm.cmd where it can be avoided. npm
 * points npm_execpath at its own entry script, so under `npm test` and under
 * prepublishOnly the script is run with the node already executing. Run by
 * hand outside npm on Windows, a shell can find npm.cmd, but node hands a
 * shell the arguments as it received them, so they are quoted.
 */
function npm(args, cwd = root) {
  const options = { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: nestedNpmEnv() }
  const cli = process.env.npm_execpath

  if (cli && cli.endsWith('.js')) {
    return execFileSync(process.execPath, [cli, ...args], options)
  }
  if (process.platform === 'win32') {
    return execSync(['npm', ...args.map((arg) => `"${arg}"`)].join(' '), options)
  }
  return execFileSync('npm', args, options)
}

// --- What is published -----------------------------------------------------

// Written out here rather than derived from package.json: deriving it from the
// same `files` field that gets edited would catch nothing. README.md, LICENSE
// and package.json are added by npm itself, whatever `files` says.
const publishedFiles = [
  'CHANGELOG.md',
  'LICENSE',
  'README.md',
  'fenom.tmLanguage.json',
  'index.js',
  'language-configuration.json',
  'package.json',
]

test('the tarball holds exactly the expected files', () => {
  const [tarball] = JSON.parse(npm(['pack', '--dry-run', '--json', '--ignore-scripts']))
  const actual = tarball.files.map((file) => file.path).sort()

  assert.deepEqual(
    actual,
    [...publishedFiles].sort(),
    'the contents of the package changed. If that is intended, update publishedFiles here'
  )
})

// --- What an install gives you ---------------------------------------------

/** Packs the package and installs it into a throwaway project. */
function installPackedPackage() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'fenom-consumer-'))
  // prepublishOnly runs the test suite; from inside the suite that recurses.
  const packed = npm(['pack', '--ignore-scripts', '--pack-destination', dir]).trim().split('\n').pop()
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'consumer', version: '1.0.0', private: true }) + '\n'
  )
  npm(['install', '--no-audit', '--no-fund', '--ignore-scripts', path.join(dir, packed)], dir)
  return dir
}

/** Runs code inside the installed project and returns what it printed. */
function runInConsumer(dir, code, moduleType) {
  const args = moduleType === 'esm' ? ['--input-type=module', '-e', code] : ['-e', code]
  return execFileSync(process.execPath, args, { cwd: dir, encoding: 'utf8' }).trim()
}

let consumerDir

test.before(() => {
  consumerDir = installPackedPackage()
})

test.after(() => {
  if (consumerDir) fs.rmSync(consumerDir, { recursive: true, force: true })
})

test('require by package name gives the path to the grammar', () => {
  const out = runInConsumer(consumerDir, `
    const grammarPath = require(${JSON.stringify(packageName)});
    if (typeof grammarPath !== 'string') {
      throw new Error('expected a path string, got ' + typeof grammarPath);
    }
    console.log(require('fs').existsSync(grammarPath) ? 'ok' : 'no such file: ' + grammarPath);
  `)
  assert.equal(out, 'ok')
})

test('import by package name gives the same path', () => {
  const out = runInConsumer(consumerDir, `
    const { default: grammarPath } = await import(${JSON.stringify(packageName)});
    console.log(typeof grammarPath === 'string' ? 'ok' : 'got ' + typeof grammarPath);
  `, 'esm')
  assert.equal(out, 'ok')
})

test('the grammar is reachable by subpath', () => {
  const out = runInConsumer(consumerDir, `
    const grammar = require(${JSON.stringify(packageName + '/fenom.tmLanguage.json')});
    console.log(grammar.scopeName);
  `)
  assert.equal(out, 'text.html.fenom')
})

test('the language configuration is reachable by subpath', () => {
  // It is half of what the package is for: an editor needs both files, and
  // this subpath is the only way to reach the second one.
  const out = runInConsumer(consumerDir, `
    const config = require(${JSON.stringify(packageName + '/language-configuration.json')});
    console.log([
      Array.isArray(config.brackets),
      Boolean(config.indentationRules),
    ].join(' '));
  `)
  assert.equal(out, 'true true')
})

test('the path from the package points at a grammar that parses', () => {
  const out = runInConsumer(consumerDir, `
    const fs = require('fs');
    const grammar = JSON.parse(fs.readFileSync(require(${JSON.stringify(packageName)}), 'utf8'));
    console.log(grammar.scopeName + ' ' + Object.keys(grammar.repository).length);
  `)
  const [scopeName, ruleCount] = out.split(' ')
  assert.equal(scopeName, 'text.html.fenom')
  assert.ok(Number(ruleCount) > 0, 'the grammar has no rules')
})

// --- Metadata --------------------------------------------------------------

test('the manifest carries the fields npm builds the package page from', () => {
  // An error here breaks no code, which is why it survives unnoticed until
  // someone goes looking for where to report a bug and finds no link.
  assert.ok(packageJson.repository && packageJson.repository.url, 'no repository.url')
  assert.ok(packageJson.license, 'no license')
  assert.equal(packageJson.publishConfig.access, 'public',
    'a scoped package without publishConfig.access is published privately')

  const repository = 'https://github.com/GulomovCreative/fenom-tmlanguage'
  assert.ok(
    packageJson.repository.url.includes('GulomovCreative/fenom-tmlanguage'),
    'repository.url points somewhere else: ' + packageJson.repository.url
  )
  assert.ok(repository.length > 0)
})

test('LICENSE is present and carries a copyright line', () => {
  // The licence is published in every release and almost never opened, so the
  // one thing worth holding is that it is still there and still readable.
  //
  // The name in it is deliberately not compared with package.json: the
  // copyright is held by the author of the work the grammar came from, which
  // is not the person publishing the package.
  const license = fs.readFileSync(path.join(root, 'LICENSE'), 'utf8')
  assert.match(license, /^Copyright \(c\) \d{4} \S/m, 'the copyright line is not in the expected shape')
  assert.match(license, /MIT/, 'LICENSE is not the MIT text the manifest declares')
  assert.equal(packageJson.license, 'MIT')
})
