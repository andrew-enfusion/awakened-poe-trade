import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { prepareUpdate } from '../prepare.mjs'
import { git, hasRef, isAncestor } from '../git.mjs'
import { fixture, write, commit } from './fixture.mjs'

test('current upstream makes no branch and leaves the base untouched', t => {
  const f = fixture(t)
  const report = prepareUpdate(f.fork, f.config)
  assert.equal(report.status, 'current')
  assert.equal(git(f.fork, ['branch', '--show-current']), 'master')
  assert.equal(git(f.fork, ['rev-parse', 'HEAD']), f.base)
  assert.equal(hasRef(f.fork, `refs/heads/${f.config.updateBranch}`), false)
})

test('clean updates retain fork files, align metadata, log provenance and reuse remote review history', t => {
  const f = fixture(t)
  write(f.upstream, 'data.txt', 'new upstream data\n')
  commit(f.upstream, 'update data')
  const feature = readFileSync(path.join(f.fork, 'extensions/feature.txt'), 'utf8')
  const report = prepareUpdate(f.fork, f.config)
  assert.equal(report.status, 'ready')
  assert.equal(readFileSync(path.join(f.fork, 'extensions/feature.txt'), 'utf8'), feature)
  assert.equal(git(f.fork, ['rev-parse', 'master']), f.base)
  assert.ok(isAncestor(f.fork, report.upstreamSha, report.headSha))
  assert.equal(JSON.parse(readFileSync(path.join(f.fork, 'main/package.json'))).name, 'fork')
  assert.match(readFileSync(path.join(f.fork, 'CHANGELOG.md'), 'utf8'), new RegExp(report.upstreamSha))
  git(f.fork, ['push', 'origin', `HEAD:refs/heads/${f.config.updateBranch}`])
  const second = path.join(f.root, 'second')
  git(f.root, ['clone', '--config', 'core.autocrlf=false', f.origin, second])
  const repeated = prepareUpdate(second, f.config)
  assert.equal(repeated.status, 'ready')
  assert.equal(repeated.changed, false)
  assert.equal(repeated.headSha, report.headSha)
})

test('new base changes are merged into the pending review branch without dropping extensions', t => {
  const f = fixture(t)
  write(f.upstream, 'data.txt', 'new upstream data\n'); commit(f.upstream, 'update data')
  const first = prepareUpdate(f.fork, f.config)
  git(f.fork, ['push', 'origin', `HEAD:refs/heads/${f.config.updateBranch}`])
  git(f.fork, ['switch', 'master'])
  write(f.fork, 'extensions/second.txt', 'new fork feature\n'); commit(f.fork, 'extend fork')
  git(f.fork, ['push', 'origin', 'master'])
  const second = path.join(f.root, 'second'); git(f.root, ['clone', '--config', 'core.autocrlf=false', f.origin, second])
  const report = prepareUpdate(second, f.config)
  assert.equal(report.status, 'ready')
  assert.equal(report.changed, true)
  assert.ok(isAncestor(second, first.headSha, report.headSha))
  assert.ok(isAncestor(second, report.baseSha, report.headSha))
  assert.equal(readFileSync(path.join(second, 'extensions/second.txt'), 'utf8'), 'new fork feature\n')
})

test('merge conflicts abort cleanly and never alter or push the base branch', t => {
  const f = fixture(t)
  write(f.fork, 'hook.ts', 'onItemParsed fork\n'); commit(f.fork, 'customize hook')
  git(f.fork, ['push', 'origin', 'master'])
  const base = git(f.fork, ['rev-parse', 'HEAD'])
  write(f.upstream, 'hook.ts', 'upstream changed hook\n'); commit(f.upstream, 'change hook')
  const report = prepareUpdate(f.fork, f.config)
  assert.equal(report.status, 'conflict')
  assert.deepEqual(report.conflicts, ['hook.ts'])
  assert.equal(hasRef(f.fork, 'MERGE_HEAD'), false)
  assert.equal(git(f.fork, ['status', '--porcelain']), '')
  assert.equal(git(f.fork, ['branch', '--show-current']), 'master')
  assert.equal(git(f.fork, ['rev-parse', 'master']), base)
  assert.equal(hasRef(f.fork, `refs/remotes/origin/${f.config.updateBranch}`), false)
})

for (const scenario of [
  { name: 'protected file', file: 'extensions/feature.txt', text: 'updated header\n' + 'unchanged\n'.repeat(10), error: /Protected extension/ },
  { name: 'missing adapter hook', file: 'hook.ts', text: 'hook removed\n', error: /hook missing/ },
  { name: 'new workflow', file: '.github/workflows/unknown.yml', text: 'name: unreviewed\n', error: /New upstream workflows/ }
]) {
  test(`${scenario.name} blocks publication even when Git can merge it`, t => {
    const f = fixture(t)
    write(f.upstream, scenario.file, scenario.text); commit(f.upstream, scenario.name)
    const report = prepareUpdate(f.fork, f.config)
    assert.equal(report.status, 'blocked')
    assert.match(report.error, scenario.error)
    assert.equal(git(f.fork, ['rev-parse', 'master']), f.base)
    assert.equal(git(f.fork, ['branch', '--show-current']), 'master')
    assert.equal(git(f.fork, ['status', '--porcelain']), '')
  })
}

test('dirty work is rejected without changing branches or files', t => {
  const f = fixture(t)
  write(f.fork, 'README.md', 'unsaved user work\n')
  assert.throws(() => prepareUpdate(f.fork, f.config), /clean checkout/)
  assert.equal(readFileSync(path.join(f.fork, 'README.md'), 'utf8'), 'unsaved user work\n')
  assert.equal(git(f.fork, ['branch', '--show-current']), 'master')
})

test('upstream version advances while fork identity and lock metadata remain consistent', t => {
  const f = fixture(t)
  const pkg = JSON.parse(readFileSync(path.join(f.upstream, 'main/package.json')))
  pkg.version = '2.0.0'
  write(f.upstream, 'main/package.json', JSON.stringify(pkg, null, 2) + '\n')
  commit(f.upstream, 'new upstream version')
  const report = prepareUpdate(f.fork, f.config)
  assert.equal(report.status, 'ready')
  const actual = JSON.parse(readFileSync(path.join(f.fork, 'main/package.json')))
  const lock = JSON.parse(readFileSync(path.join(f.fork, 'main/package-lock.json')))
  assert.equal(actual.name, 'fork')
  assert.equal(actual.version, '2.0.0')
  assert.equal(lock.version, actual.version)
  assert.equal(lock.packages[''].version, actual.version)
  assert.equal(lock.packages[''].name, actual.name)
})

test('different changes to the same dependency are left for manual resolution', t => {
  const f = fixture(t)
  const ours = JSON.parse(readFileSync(path.join(f.fork, 'main/package.json')))
  ours.dependencies = { example: '2.0.0' }
  write(f.fork, 'main/package.json', JSON.stringify(ours, null, 2) + '\n')
  commit(f.fork, 'custom dependency'); git(f.fork, ['push', 'origin', 'master'])
  const base = git(f.fork, ['rev-parse', 'HEAD'])
  const theirs = JSON.parse(readFileSync(path.join(f.upstream, 'main/package.json')))
  theirs.dependencies = { example: '3.0.0' }
  write(f.upstream, 'main/package.json', JSON.stringify(theirs, null, 2) + '\n')
  commit(f.upstream, 'upstream dependency')
  const report = prepareUpdate(f.fork, f.config)
  assert.equal(report.status, 'conflict')
  assert.ok(report.conflicts.includes('main/package.json'))
  assert.equal(git(f.fork, ['rev-parse', 'master']), base)
  assert.equal(JSON.parse(readFileSync(path.join(f.fork, 'main/package.json'))).dependencies.example, '2.0.0')
  assert.equal(git(f.fork, ['status', '--porcelain']), '')
})
