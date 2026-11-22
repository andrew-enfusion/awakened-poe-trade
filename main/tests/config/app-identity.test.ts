import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import type { App } from 'electron'
import application from '../../../config/application.json'
import { initializeAppIdentity } from '../../src/config/app-identity'

for (const platform of ['win32', 'linux', 'darwin'] as const) {
  test(`${platform} separates settings and browser sessions without migrating upstream data`, (t) => {
    const appData = mkdtempSync(path.join(tmpdir(), 'poe-identity-'))
    t.after(() => { rmSync(appData, { recursive: true, force: true }) })
    const upstream = path.join(appData, 'awakened-poe-trade', 'apt-data')
    mkdirSync(upstream, { recursive: true })
    const sentinel = '{"upstreamFixture":true}'
    writeFileSync(path.join(upstream, 'config.json'), sentinel)
    const paths = new Map<string, string>()
    const names: string[] = []
    const appIds: string[] = []
    const app: Pick<App, 'getPath' | 'setPath' | 'setName' | 'setAppUserModelId'> = {
      getPath (name) { assert.equal(name, 'appData'); return appData },
      setPath (name, location) { assert.ok(existsSync(location)); paths.set(name, location) },
      setName (name) { names.push(name) },
      setAppUserModelId (id) { appIds.push(id) }
    }

    initializeAppIdentity(app, platform)
    initializeAppIdentity(app, platform)

    const isolated = path.join(appData, application.dataDirectory)
    assert.equal(paths.get('userData'), isolated)
    assert.equal(paths.get('sessionData'), isolated)
    assert.notEqual(isolated, path.dirname(upstream))
    assert.equal(existsSync(path.join(isolated, 'apt-data', 'config.json')), false)
    assert.equal(readFileSync(path.join(upstream, 'config.json'), 'utf8'), sentinel)
    assert.deepEqual(names, [application.productName, application.productName])
    assert.deepEqual(appIds, platform === 'win32' ? [application.appId, application.appId] : [])
  })
}
