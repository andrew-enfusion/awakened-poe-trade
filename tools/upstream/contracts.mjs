import { readFileSync } from 'node:fs'
import path from 'node:path'
import { git } from './git.mjs'

export function verifyContracts (directory, base, config) {
  const before = git(directory, ['ls-tree', '-r', base, '--', ...config.protectedPaths])
  const after = git(directory, ['ls-tree', '-r', 'HEAD', '--', ...config.protectedPaths])
  if (before !== after) throw new Error('Protected extension files changed; manual review is required')

  for (const hook of config.hooks) {
    if (!readFileSync(path.join(directory, hook.path), 'utf8').includes(hook.text)) {
      throw new Error(`Extension hook missing in ${hook.path}; manual adapter review is required`)
    }
  }
  for (const [file, names] of Object.entries(config.protectedScripts)) {
    const previous = JSON.parse(git(directory, ['show', `${base}:${file}`]))
    const current = JSON.parse(readFileSync(path.join(directory, file), 'utf8'))
    for (const name of names) {
      if (previous.scripts[name] !== current.scripts[name]) {
        throw new Error(`Protected package script ${file}:${name} changed`)
      }
    }
  }

  const workflows = git(directory, ['diff', '--name-only', '--diff-filter=A', base, 'HEAD', '--', '.github/workflows'])
    .split('\n').filter(Boolean)
  const known = new Set(config.legacyWorkflows.map(file => `.github/workflows/${file}`))
  if (workflows.some(file => !known.has(file))) {
    throw new Error('New upstream workflows need manual review before the candidate can be pushed')
  }
}
