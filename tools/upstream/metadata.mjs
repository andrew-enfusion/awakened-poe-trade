import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'

function updateJson (filename, update) {
  const source = readFileSync(filename, 'utf8')
  const value = JSON.parse(source)
  update(value)
  if (JSON.stringify(value) === JSON.stringify(JSON.parse(source))) return
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  writeFileSync(filename, (JSON.stringify(value, null, 2) + '\n').replace(/\n/g, eol))
}

export function updateMetadata (directory, upstreamSha, config) {
  const application = JSON.parse(readFileSync(path.join(directory, 'config/application.json'), 'utf8'))
  let version
  updateJson(path.join(directory, 'main/package.json'), pkg => {
    pkg.name = application.packageName
    pkg.repository = { type: 'git', url: `${application.repositoryUrl}.git` }
    version = pkg.version
  })
  updateJson(path.join(directory, 'main/package-lock.json'), lock => {
    if (!lock.packages?.['']) throw new Error('Unexpected host lockfile format; manual review is required')
    lock.name = lock.packages[''].name = application.packageName
    lock.version = lock.packages[''].version = version
  })

  const filename = path.join(directory, 'CHANGELOG.md')
  const source = readFileSync(filename, 'utf8')
  const eol = source.includes('\r\n') ? '\r\n' : '\n'
  const text = source.replace(/\r\n/g, '\n')
  if (text.includes(`/commit/${upstreamSha}`)) return
  const url = config.repositoryUrl.replace(/\.git$/, '')
  const entry = `- Integrated upstream source [${upstreamSha.slice(0, 12)}](${url}/commit/${upstreamSha}) while retaining fork extensions.\n`
  if (!text.includes('## [Unreleased]')) throw new Error('Changelog has no Unreleased section')
  const nextRelease = text.indexOf('\n## ', text.indexOf('## [Unreleased]') + 1)
  const end = nextRelease === -1 ? text.length : nextRelease
  const section = text.slice(0, end)
  const updated = section.includes('### Changed\n')
    ? section.replace('### Changed\n', `### Changed\n\n${entry}`)
    : section.replace('## [Unreleased]\n', `## [Unreleased]\n\n### Changed\n\n${entry}`)
  writeFileSync(filename, (updated + text.slice(end)).replace(/\n/g, eol))
}
