import { writeFileSync } from 'node:fs'
import path from 'node:path'
import { isDeepStrictEqual } from 'node:util'

const missing = Symbol('missing JSON key')
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value)

function mergeValue (base, ours, theirs, location, identityPaths) {
  if (isDeepStrictEqual(ours, theirs)) return ours
  if (isDeepStrictEqual(ours, base)) return theirs
  if (isDeepStrictEqual(theirs, base)) return ours
  // Installation identity belongs to the fork. Root lock versions are reconciled to the merged manifest later.
  if (identityPaths.has(JSON.stringify(location))) return ours
  if (object(base) && object(ours) && object(theirs)) {
    const output = {}
    for (const key of new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)])) {
      const value = mergeValue(
        Object.hasOwn(base, key) ? base[key] : missing,
        Object.hasOwn(ours, key) ? ours[key] : missing,
        Object.hasOwn(theirs, key) ? theirs[key] : missing,
        [...location, key], identityPaths
      )
      if (value !== missing) output[key] = value
    }
    return output
  }
  throw new Error(`Both histories changed JSON field ${location.join('.')}`)
}

export function resolveMetadataConflicts (directory, files, git) {
  const allowed = new Set(['main/package.json', 'main/package-lock.json'])
  if (!files.length || files.some(file => !allowed.has(file))) return false
  // Resolve every file in memory before writing anything; ambiguous changes stay conflicted.
  const resolutions = files.map(file => {
    const base = JSON.parse(git(directory, ['show', `:1:${file}`]))
    const ours = JSON.parse(git(directory, ['show', `:2:${file}`]))
    const theirs = JSON.parse(git(directory, ['show', `:3:${file}`]))
    const identity = file === 'main/package.json'
      ? [['name'], ['repository']]
      : [['name'], ['version'], ['packages', '', 'name'], ['packages', '', 'version']]
    const value = mergeValue(base, ours, theirs, [], new Set(identity.map(parts => JSON.stringify(parts))))
    return { file, text: JSON.stringify(value, null, 2) + '\n' }
  })
  for (const resolution of resolutions) writeFileSync(path.join(directory, resolution.file), resolution.text)
  git(directory, ['add', '--', ...files])
  return true
}
