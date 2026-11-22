import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { git } from '../git.mjs'

export function write (directory, file, contents) {
  const filename = path.join(directory, file)
  mkdirSync(path.dirname(filename), { recursive: true })
  writeFileSync(filename, contents)
}

export function commit (directory, message) {
  git(directory, ['add', '--all'])
  git(directory, ['-c', 'user.name=Fixture', '-c', 'user.email=fixture@example.invalid', 'commit', '-m', message])
}

export function fixture (t) {
  const root = mkdtempSync(path.join(tmpdir(), 'poe-upstream-'))
  t.after(() => {
    if (!path.resolve(root).startsWith(path.join(path.resolve(tmpdir()), 'poe-upstream-'))) throw new Error('Unsafe fixture cleanup')
    rmSync(root, { recursive: true, force: true })
  })
  const upstream = path.join(root, 'upstream')
  const fork = path.join(root, 'fork')
  const origin = path.join(root, 'origin.git')
  mkdirSync(upstream)
  git(upstream, ['init', '--initial-branch=master'])
  git(upstream, ['config', 'core.autocrlf', 'false'])
  write(upstream, 'README.md', 'Upstream\n')
  write(upstream, 'hook.ts', 'onItemParsed\n')
  write(upstream, 'extensions/feature.txt', 'upstream header\n' + 'unchanged\n'.repeat(10))
  const pkg = { name: 'upstream', version: '1.0.0', scripts: { test: 'test-command', package: 'package-command' } }
  write(upstream, 'main/package.json', JSON.stringify(pkg, null, 2) + '\n')
  write(upstream, 'main/package-lock.json', JSON.stringify({ name: pkg.name, version: pkg.version, packages: { '': { name: pkg.name, version: pkg.version } } }, null, 2) + '\n')
  write(upstream, 'CHANGELOG.md', '# Changelog\n\n## [Unreleased]\n\n### Changed\n\n- Existing change.\n')
  commit(upstream, 'initial upstream')
  git(root, ['init', '--bare', origin])
  git(root, ['clone', '--config', 'core.autocrlf=false', upstream, fork])
  git(fork, ['config', 'core.autocrlf', 'false'])
  git(fork, ['remote', 'set-url', 'origin', origin])
  write(fork, 'config/application.json', JSON.stringify({ packageName: 'fork', repositoryUrl: 'https://github.com/example/fork' }))
  write(fork, 'main/package.json', JSON.stringify({ ...pkg, name: 'fork', repository: { type: 'git', url: 'https://github.com/example/fork.git' } }, null, 2) + '\n')
  write(fork, 'main/package-lock.json', JSON.stringify({ name: 'fork', version: pkg.version, packages: { '': { name: 'fork', version: pkg.version } } }, null, 2) + '\n')
  write(fork, 'extensions/feature.txt', 'upstream header\n' + 'unchanged\n'.repeat(10) + 'our feature\n')
  commit(fork, 'add fork extension')
  git(fork, ['push', 'origin', 'master'])
  const config = {
    repositoryUrl: upstream, branch: 'master', baseBranch: 'master', updateBranch: 'automation/upstream-update',
    committer: { name: 'Fixture', email: 'fixture@example.invalid' },
    protectedPaths: ['extensions', 'config/application.json'],
    hooks: [{ path: 'hook.ts', text: 'onItemParsed' }],
    protectedScripts: { 'main/package.json': ['test', 'package'] }, legacyWorkflows: []
  }
  return { root, upstream, fork, origin, config, base: git(fork, ['rev-parse', 'HEAD']) }
}
