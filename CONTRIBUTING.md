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

### Publishing rights

The workflow holds no npm token. It authenticates as itself through OIDC, which
npm calls [trusted publishing](https://docs.npmjs.com/trusted-publishers), and
that has to be configured once on the package's settings page on npmjs.com:
publisher GitHub Actions, this repository, workflow `release.yml`. Until that is
done the publish step fails with `404` or `E401` — after the tag has already
been pushed.

The package is published under the `@gulomov` scope, so `publishConfig.access`
is set to `public` in the manifest. Without it npm publishes scoped packages
privately, which fails on a free account.

Because `postversion` pushes before anything is published, a protected `master`
also means the account cutting the release needs a bypass entry in the branch
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
