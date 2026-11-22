import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const start = '<!-- upstream-update:start -->'
const end = '<!-- upstream-update:end -->'

export function managedBody (previous, report, config) {
  const upstreamUrl = config.repositoryUrl.replace(/\.git$/, '')
  const section = `${start}
Upstream source has advanced. This candidate merges its history with the fork while retaining the protected extension layer.

- Upstream commit: [${report.upstreamSha.slice(0, 12)}](${upstreamUrl}/commit/${report.upstreamSha})
- Fork base: \`${report.baseSha}\`
- Candidate: \`${report.headSha}\`
- Extension file, hook and package-script guards passed.
- Fork checks are dispatched separately; their results must be reviewed before merging.

This automation never approves or merges this pull request and never publishes an application release.
${end}`
  const first = previous.indexOf(start)
  const last = previous.indexOf(end, first)
  return first !== -1 && last !== -1
    ? previous.slice(0, first) + section + previous.slice(last + end.length)
    : `${previous}${previous ? '\n\n' : ''}${section}`
}

export function publishCandidate (directory, report, config, bodyFile, run = execFileSync, options = {}) {
  if (report.workflowChanges?.length && !options.workflowWriteAllowed) {
    const error = new Error('Workflow files changed. Prepare and publish this update locally with a workflow-capable GitHub login; no changes were pushed.')
    error.code = 'WORKFLOW_PERMISSION_REQUIRED'
    throw error
  }
  const execute = (command, args) => run(command, args, {
    cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']
  }).trim()
  for (const workflow of config.legacyWorkflows) {
    execute('gh', ['workflow', 'disable', workflow, '--repo', config.forkRepository])
  }
  // Normal fast-forward push only. A concurrent change rejects this operation instead of being overwritten.
  execute('git', ['push', 'origin', `HEAD:refs/heads/${config.updateBranch}`])
  const existing = JSON.parse(execute('gh', [
    'pr', 'list', '--repo', config.forkRepository, '--head', config.updateBranch,
    '--base', config.baseBranch, '--state', 'open', '--json', 'number,url,body'
  ]))
  const pull = existing[0]
  writeFileSync(bodyFile, managedBody(pull?.body ?? '', report, config))
  let url
  if (pull) {
    execute('gh', ['pr', 'edit', String(pull.number), '--repo', config.forkRepository, '--body-file', bodyFile])
    url = pull.url
  } else {
    url = execute('gh', [
      'pr', 'create', '--repo', config.forkRepository, '--head', config.updateBranch,
      '--base', config.baseBranch, '--draft', '--title', 'chore(upstream): update Awakened PoE Trade', '--body-file', bodyFile
    ])
  }
  if (report.changed || !pull) {
    execute('gh', ['workflow', 'run', config.checksWorkflow, '--ref', config.updateBranch, '--repo', config.forkRepository])
  }
  return url
}
