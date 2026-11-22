import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { managedBody, publishCandidate } from '../github.mjs'

const config = {
  repositoryUrl: 'https://github.com/example/upstream.git', forkRepository: 'example/fork',
  updateBranch: 'automation/upstream-update', baseBranch: 'master', checksWorkflow: 'fork-checks.yml',
  legacyWorkflows: ['main.yml', 'pages.yml']
}
const report = { upstreamSha: 'a'.repeat(40), baseSha: 'b'.repeat(40), headSha: 'c'.repeat(40), changed: true }

test('managed PR text preserves manual notes and updates only its own section', () => {
  const first = managedBody('Reviewer notes.', report, config)
  const next = managedBody(first + '\nAdditional notes.', { ...report, upstreamSha: 'd'.repeat(40) }, config)
  assert.ok(next.startsWith('Reviewer notes.'))
  assert.ok(next.endsWith('Additional notes.'))
  assert.equal(next.split('<!-- upstream-update:start -->').length, 2)
  assert.ok(next.includes('d'.repeat(40)))
})

test('publication disables legacy workflows, uses a normal push, creates a draft and dispatches read-only checks', t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'poe-publish-'))
  t.after(() => { rmSync(directory, { recursive: true, force: true }) })
  const calls = []
  const bodyFile = path.join(directory, 'body.md')
  const run = (command, args) => {
    calls.push({ command, args })
    if (args[0] === 'api') return 'active'
    if (args[0] === 'pr' && args[1] === 'list') return '[]'
    if (args[0] === 'pr' && args[1] === 'create') return 'https://github.com/example/fork/pull/1\n'
    return ''
  }
  const url = publishCandidate(directory, report, config, bodyFile, run)
  assert.equal(url, 'https://github.com/example/fork/pull/1')
  assert.deepEqual(calls.find(call => call.command === 'git'), { command: 'git', args: ['push', 'origin', 'HEAD:refs/heads/automation/upstream-update'] })
  assert.ok(calls.some(call => call.args.includes('--draft')))
  assert.deepEqual(calls.at(-1).args, ['workflow', 'run', 'fork-checks.yml', '--ref', config.updateBranch, '--repo', config.forkRepository])
  assert.ok(!calls.some(call => call.args.includes('--force') || call.args.includes('merge') || call.args.includes('review')))
  assert.match(readFileSync(bodyFile, 'utf8'), /results must be reviewed/)
})

test('an unchanged review branch reuses its pull request without dispatching duplicate checks', t => {
  const directory = mkdtempSync(path.join(tmpdir(), 'poe-publish-'))
  t.after(() => { rmSync(directory, { recursive: true, force: true }) })
  const calls = []
  const bodyFile = path.join(directory, 'body.md')
  const run = (command, args) => {
    calls.push({ command, args })
    if (args[0] === 'api') return 'disabled_manually'
    if (args[0] === 'pr' && args[1] === 'list') {
      return JSON.stringify([{ number: 1, url: 'https://github.com/example/fork/pull/1', body: 'Manual reviewer notes.' }])
    }
    return ''
  }
  publishCandidate(directory, { ...report, changed: false }, config, bodyFile, run)
  assert.ok(calls.some(call => call.args[0] === 'pr' && call.args[1] === 'edit'))
  assert.ok(!calls.some(call => call.args[0] === 'workflow' && call.args[1] === 'run'))
  assert.ok(!calls.some(call => call.args[0] === 'pr' && call.args[1] === 'create'))
  assert.ok(!calls.some(call => call.args[0] === 'workflow' && call.args[1] === 'disable'))
  assert.ok(readFileSync(bodyFile, 'utf8').startsWith('Manual reviewer notes.'))
})

test('the built-in token never attempts to push workflow-file changes', () => {
  let calls = 0
  assert.throws(() => publishCandidate('', {
    ...report, workflowChanges: ['.github/workflows/pages.yml']
  }, config, '', () => { calls++; return '' }), /workflow-capable GitHub login/)
  assert.equal(calls, 0)
})
