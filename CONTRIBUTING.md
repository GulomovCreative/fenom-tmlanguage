# Contributing

Thanks for helping out. This is a small repository — one grammar file, one
language configuration and the tests that keep them honest — so the rules are
short.

## Getting set up

``` sh
npm install
npm test
```

Node 20 or newer. Everything runs on the built-in test runner and two dev
dependencies, so there is no framework to learn.

## The one rule that matters

**Check Fenom's own source before changing what the grammar accepts.**

The grammar describes a syntax that another program defines, so guesses,
tutorials and community advice are not evidence.
[fenom-template/fenom](https://github.com/fenom-template/fenom) is the
authority: `Fenom::$_actions` for which tags open a block, `Compiler` for what
each one does with its arguments, `Tag::tagOption` for the options a tag
accepts, and the lexer in `Template` for how a tag is found in the first place.

This has already decided several things against the documentation. `{var $foo}`
opens a block but `{var $foo = 1}` does not, because `Compiler::setOpen` closes
the tag on the spot when it finds an assignment. The short option codes `s`,
`a`, `e` and `i` that the documentation tabulates do not exist, because
`tagOption` resolves an option by looking for a method named `opt<Option>`. The
`{% %}` and `{{* *}}` delimiters that older grammars carried are not Fenom's:
braces are hardcoded.

When a change rests on Fenom's behaviour, quote the relevant lines in the pull
request. Reviewers should not have to go find them.

## Changing the grammar

The suites come in layers, and a change usually touches more than one:

- **Grammar file checks** (`tests/grammar-file.test.mjs`) catch mistakes that
  parse cleanly and then behave surprisingly — a duplicated key, which
  `JSON.parse` resolves silently by keeping the last one.
- **Snapshots** (`tests/*.snap`) record how each fixture tokenizes. They are
  generated, never hand-edited, and they run against a stub of the HTML grammar
  so that an update to a third-party grammar cannot rewrite every snapshot in
  the repository.
- **Nesting tests** (`tests/nesting/`) run the grammar against a real HTML
  grammar with CSS and JavaScript inside it. This is the only layer that can
  see the injection eating something the host grammar needed.
- **Indentation tests** (`tests/indentation.test.mjs`) re-indent a template
  from scratch and require the result to come back identical.
- **Line ending tests** (`tests/line-endings.test.mjs`) read the packed tarball
  and check every published file for CR.
- **README checks** (`tests/readme.test.mjs`) hold the documented scope list to
  the grammar, in both directions.
- **Package checks** (`tests/package.test.mjs`) install the packed tarball into
  an empty project and load it by name, which is the only way to see a broken
  `exports` map. They also pin down which files are published.
- **Release checks** (`tests/release.test.mjs`) cover the scripts that guard and
  prepare a release.
- **Preview checks** (`tests/preview.test.mjs`) re-render `docs/preview.tpl`
  through real editor themes and compare the result with the committed SVGs.
  Run `npm run preview:update` after an intended change and read the diff.
- **The performance guard** (`tests/performance.test.mjs`) holds tokenization of
  awkward input to a time budget. A pattern that backtracks catastrophically
  stops the editor rather than colouring anything wrongly.
- **Fuzz checks** (`tests/fuzz.test.mjs`) generate templates from a fixed seed
  and hold two rules: markup carrying no tag stays with the host grammar, and a
  closed tag does not colour what follows. `FUZZ_SEED` re-runs a failing set.

The workflow:

1. Add a fixture under `tests/` covering the syntax you care about.
2. Change the grammar.
3. Run `npm run test:update`, then **read the snapshot diff**. That is the whole
   point of the snapshots — it shows exactly what your pattern did, including to
   the cases you were not thinking about.
4. Add a test for the thing you fixed.
5. Document any new scope in the README's Scopes section, or the suite fails.

A snapshot diff larger than you expected means the change is larger than you
expected. Investigate before committing it.

## Scope names

Every scope must start with a root that editor themes recognise (`comment`,
`constant`, `entity`, `keyword`, `meta`, `punctuation`, `string`, `support`,
`variable`, and so on) and end in `.fenom`. A scope outside that set is
invisible — themes simply ignore it, and the token renders unstyled. A test
enforces both halves.

Scope names are a public interface: themes target them. Renaming one is a
breaking change for anyone who styled it.

## Pull requests

One concern per pull request. Say what you changed, why, and what you checked.

Add an entry to `CHANGELOG.md` under `## [Unreleased]` for anything a user of
the package would notice — a highlighting change, a new scope, a change to what
the package exports. Internal refactors and test-only changes do not need one.
If a change is risky — anything touching where a tag, comment or ignored region
begins and ends — say what could regress and what you did to rule it out.

## Releasing

Releases go out from `master` with one command:

``` sh
npm run publish:patch   # or publish:minor / publish:major
```

That runs `npm version`, which bumps `package.json`, closes the changelog,
commits, tags and pushes. Publishing itself happens in GitHub Actions: the
pushed tag starts `.github/workflows/release.yml`, which runs the tests again,
publishes to npm and opens a GitHub release with the changelog section as its
body.

So preparing a release means writing changelog entries under `## [Unreleased]`
as you go, and nothing else. The version number, the section heading, its date,
the fresh empty `Unreleased` and the link definitions at the foot of the file
are all written by `scripts/version.js` during `npm version`. Leave `version` in
`package.json` alone too — `npm version` owns it, and setting it by hand makes
the release skip a number.

Three guards run before anything is published, because a published version
cannot be taken back:

- `preversion` refuses to run from a branch other than `master`, with
  uncommitted changes, or when the branch is behind the remote.
- `version` refuses to continue when there is nothing under `Unreleased` to
  release, or when the changelog has no link definition to build the comparison
  range from.
- The `verify` job in the release workflow refuses to publish a tag that
  disagrees with `package.json`, or one the changelog has no section for.

### Publishing rights: setting up the trusted publisher

The workflow holds no npm token. It authenticates as itself through OIDC, which
npm calls [trusted publishing](https://docs.npmjs.com/trusted-publishers), and
npm has to be told once which workflow to trust. This is a one-off manual step
and the release cannot publish until it is done.

**Before you start.** You need to be an owner or maintainer of
`@gulomov/fenom-tmlanguage` on npmjs.com, and the package has to exist there
already — trust is configured on a package, so the very first version of a
brand-new package still has to be published by hand. That is not the case here:
the package has been published since 1.0.0.

**On npmjs.com.**

1. Sign in and open the package page:
   <https://www.npmjs.com/package/@gulomov/fenom-tmlanguage>.
2. Open the package's **Settings** tab.
3. Find the **Trusted Publisher** section and choose **GitHub Actions**.
4. Fill in the three fields that identify the workflow, exactly:
   - organization or user: `GulomovCreative`
   - repository: `fenom-tmlanguage`
   - workflow filename: `release.yml` — the file name only, with its extension,
     not a path and not the `name:` inside the file.
5. Leave the environment field empty. The release job does not run in a GitHub
   Actions environment, and a value here would be one more thing that has to
   match.
6. Save.

The trust is pinned to that org / repository / workflow-filename triple.
Renaming `release.yml`, moving the repository, or publishing from a different
workflow breaks it, and the fix is to update the same form.

**What already holds on this side**, so there is nothing to do in the
repository:

- `.github/workflows/release.yml` grants the publish job `id-token: write`,
  which is what lets it request an OIDC token at all.
- The job installs a current npm before publishing. Trusted publishing needs
  npm 11.5.1 or newer, and the npm bundled with Node 22 is older.
- The publish step passes no token and no `--provenance`: publishing this way
  generates the provenance attestation on its own.

**Check that it worked.** After the next release the version on npm carries a
provenance badge linking back to the workflow run that built it. Nothing else
needs to be looked at.

**When it does not work.**

- `404 Not Found` or `E401` on the publish step almost always means the trust
  is not configured, or one of the three fields does not match — a typo in the
  repository name, or a path rather than a bare filename in the workflow field.
- `E403` or a demand for a one-time password means npm is still expecting a
  human or a token for this package; check the package's publishing access
  settings on the same Settings tab.
- Either way the tag has already been pushed. See below for how to retry.

**Afterwards.** Any automation token that existed only to publish this package
can be deleted from your npm account. A token that cannot be used is one that
cannot leak.

### Two other things the release depends on

The package is published under the `@gulomov` scope, so `publishConfig.access`
is set to `public` in the manifest. Without it npm publishes scoped packages
privately, which fails on a free account.

Because `postversion` pushes before anything is published, a protected `master`
means the account cutting the release needs a bypass entry in the branch
ruleset — otherwise the push is rejected and the release never starts. That is
the safe direction to fail in: a rejected push means nothing was published.

### When a release fails

The tag is pushed before the workflow runs, so a failed publish leaves a tag
pointing at a version that is not on npm. Fix the cause, then delete the tag
locally and on the remote and push it again — the workflow triggers on the tag,
so re-pushing it is what retries the release:

``` sh
git tag -d v2.1.1 && git push origin :refs/tags/v2.1.1
git tag -a v2.1.1 -m v2.1.1 && git push origin v2.1.1
```

Do not bump the version a second time to work around a failed publish: the
number that failed was never taken.

Which part to bump is decided by what the change does to the two public
surfaces: what the package exports, and the scope names. Renaming a scope breaks
every theme that targets it, so it is a major change even though no code fails.
