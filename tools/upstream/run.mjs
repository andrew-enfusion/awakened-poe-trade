import { appendFileSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { tmpdir } from 'node:os'
import { prepareUpdate } from './prepare.mjs'
import { publishCandidate } from './github.mjs'

const directory = process.cwd()
const config = JSON.parse(readFileSync(path.join(directory, 'config/upstream.json'), 'utf8'))
const reportFile = process.env.UPSTREAM_REPORT ?? path.join(tmpdir(), 'awakened-upstream-report.json')
let report
try {
  if (process.env.GITHUB_ACTIONS && process.env.GITHUB_REPOSITORY !== config.forkRepository) {
    throw new Error('This updater is configured for a different fork repository')
  }
  report = prepareUpdate(directory, config)
  if (report.status === 'ready' && process.argv.includes('--publish')) {
    report.pullRequest = publishCandidate(directory, report, config, `${reportFile}.md`, undefined, {
      workflowWriteAllowed: process.env.GITHUB_ACTIONS !== 'true'
    })
  }
  if (report.status === 'blocked' || report.status === 'conflict') process.exitCode = 1
} catch (error) {
  report = { ...report, status: error.code === 'WORKFLOW_PERMISSION_REQUIRED' ? 'blocked' : 'failed', error: error.message }
  process.exitCode = 1
}
writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify(report, null, 2))
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Upstream update: ${report.status}\n\n${report.pullRequest ?? report.error ?? 'No new upstream commits.'}\n`)
}
