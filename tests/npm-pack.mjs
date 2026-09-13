// Reading the output of `npm pack --json`, which does not have one shape.
//
// Up to npm 11 the command prints an array of entries, one per packed package.
// npm 12 prints an object keyed by package name instead. Both have to be read
// here, because the two npms are both in play: the release workflow installs
// the newest one -- trusted publishing needs 11.5.1 or later -- while everyone
// else runs whatever shipped with their Node.
//
// This is not a precaution. It is what broke the first release cut through the
// workflow: `npm publish` ran `prepublishOnly`, the line-ending suite destructured
// the object as an array, and the release stopped before publishing anything.

/** The entries of `npm pack --json` output, whichever shape npm printed. */
export function packEntries(raw) {
  const parsed = JSON.parse(raw)
  if (Array.isArray(parsed)) return parsed
  if (parsed !== null && typeof parsed === 'object') return Object.values(parsed)
  throw new TypeError('npm pack --json printed neither an array nor an object')
}
