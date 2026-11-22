import { execFileSync } from 'node:child_process'
import { resolveMetadataConflicts } from './json-merge.mjs'

export function git (directory, args) {
  return execFileSync('git', args, {
    cwd: directory,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, GIT_TERMINAL_PROMPT: '0' }
  }).trim()
}

export function hasRef (directory, ref) {
  try { git(directory, ['rev-parse', '--verify', ref]); return true } catch { return false }
}

export function isAncestor (directory, ancestor, descendant) {
  try { git(directory, ['merge-base', '--is-ancestor', ancestor, descendant]); return true } catch (error) {
    if (error.status === 1) return false
    throw error
  }
}

export function identityArgs (config) {
  return ['-c', `user.name=${config.committer.name}`, '-c', `user.email=${config.committer.email}`]
}

export function merge (directory, ref, config) {
  try {
    git(directory, [...identityArgs(config), 'merge', '--no-ff', '--no-edit', '-m', `chore(upstream): integrate ${ref}`, ref])
  } catch (error) {
    const conflicts = git(directory, ['diff', '--name-only', '--diff-filter=U']).split('\n').filter(Boolean)
    try {
      if (resolveMetadataConflicts(directory, conflicts, git)) {
        git(directory, [...identityArgs(config), 'commit', '--no-edit'])
        return
      }
    } catch { /* Ambiguous JSON changes require manual resolution, just like text conflicts. */ }
    if (hasRef(directory, 'MERGE_HEAD')) git(directory, ['merge', '--abort'])
    if (conflicts.length) {
      const conflict = new Error('Upstream merge needs manual conflict resolution')
      conflict.conflicts = conflicts
      throw conflict
    }
    throw error
  }
}
