import { git, hasRef, identityArgs, isAncestor, merge } from './git.mjs'
import { verifyContracts } from './contracts.mjs'
import { updateMetadata } from './metadata.mjs'

export function prepareUpdate (directory, config) {
  if (git(directory, ['status', '--porcelain'])) throw new Error('Use a clean checkout to prepare an upstream update')
  for (const branch of [config.baseBranch, config.branch, config.updateBranch]) {
    git(directory, ['check-ref-format', '--branch', branch])
  }
  git(directory, ['fetch', 'origin'])
  const base = git(directory, ['rev-parse', `origin/${config.baseBranch}`])
  git(directory, ['fetch', '--no-tags', config.repositoryUrl, config.branch])
  const upstream = git(directory, ['rev-parse', 'FETCH_HEAD^{commit}'])
  const report = { baseSha: base, upstreamSha: upstream, branch: config.updateBranch }
  if (isAncestor(directory, upstream, base)) return { ...report, status: 'current', changed: false }

  const initialBranch = git(directory, ['branch', '--show-current'])
  const initialHead = git(directory, ['rev-parse', 'HEAD'])
  const remoteBranch = `origin/${config.updateBranch}`
  const remoteHead = hasRef(directory, remoteBranch) ? git(directory, ['rev-parse', remoteBranch]) : null
  // A fresh review branch preserves the existing remote history; never reset or force-push it.
  git(directory, ['switch', '--create', config.updateBranch, remoteHead ?? base])
  try {
    merge(directory, base, config)
    merge(directory, upstream, config)
    verifyContracts(directory, base, config)
    updateMetadata(directory, upstream, config)
    if (git(directory, ['status', '--porcelain'])) {
      git(directory, ['add', '--', 'main/package.json', 'main/package-lock.json', 'CHANGELOG.md'])
      git(directory, [...identityArgs(config), 'commit', '-m', 'chore(upstream): preserve fork metadata for the source update'])
    }
    const head = git(directory, ['rev-parse', 'HEAD'])
    const workflowChanges = git(directory, ['diff', '--name-only', remoteHead ?? base, head, '--', '.github/workflows'])
      .split('\n').filter(Boolean)
    return { ...report, status: 'ready', headSha: head, changed: head !== remoteHead, workflowChanges }
  } catch (error) {
    // Abort only our merge and return to the original checkout; leave the unpublished branch inspectable.
    if (hasRef(directory, 'MERGE_HEAD')) git(directory, ['merge', '--abort'])
    if (git(directory, ['status', '--porcelain'])) {
      const files = ['main/package.json', 'main/package-lock.json', 'CHANGELOG.md']
        .filter(file => hasRef(directory, `HEAD:${file}`))
      if (files.length) git(directory, ['restore', '--staged', '--worktree', '--', ...files])
    }
    git(directory, initialBranch ? ['switch', initialBranch] : ['switch', '--detach', initialHead])
    return {
      ...report,
      status: error.conflicts?.length ? 'conflict' : 'blocked',
      error: error.message,
      conflicts: error.conflicts ?? [],
      changed: false
    }
  }
}
