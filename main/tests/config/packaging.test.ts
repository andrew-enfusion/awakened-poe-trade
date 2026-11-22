import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { getConfig, validateConfiguration } from 'app-builder-lib/out/util/config/config'
import { DebugLogger } from 'builder-util'
import application from '../../../config/application.json'

test('effective packaging keeps upstream platform options but isolates fork identity and publication metadata', async () => {
  const config = await getConfig(process.cwd(), 'electron-builder.fork.cjs', undefined)
  await validateConfiguration(config, new DebugLogger(false))
  assert.equal(config.appId, application.appId)
  assert.equal(config.productName, application.productName)
  assert.equal(config.executableName, application.packageName)
  assert.deepEqual(config.publish, [{ provider: 'github', owner: 'andrew-enfusion', repo: 'awakened-poe-trade' }])
  assert.equal(config.extraMetadata?.name, application.packageName)
  assert.deepEqual(config.extraMetadata?.repository, { type: 'git', url: `${application.repositoryUrl}.git` })
  assert.deepEqual(config.win?.target, ['nsis', 'portable'])
  assert.deepEqual(config.linux?.target, ['AppImage'])
  assert.notEqual(config.nsis?.artifactName, config.portable?.artifactName)
})

test('package manifest and lock metadata agree with the shared fork configuration', () => {
  const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
  const lock = JSON.parse(readFileSync('package-lock.json', 'utf8'))
  assert.equal(pkg.name, application.packageName)
  assert.equal(pkg.repository.url, `${application.repositoryUrl}.git`)
  assert.equal(lock.name, pkg.name)
  assert.equal(lock.version, pkg.version)
  assert.equal(lock.packages[''].name, pkg.name)
  assert.equal(lock.packages[''].version, pkg.version)
  assert.match(pkg.scripts.package, /--config electron-builder\.fork\.cjs/)
  assert.match(pkg.scripts.package, /--publish never/)
})
