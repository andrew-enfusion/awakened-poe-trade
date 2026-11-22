import { test } from 'node:test'
import assert from 'node:assert/strict'
import application from '../../../config/application.json'
import { AppUpdater } from '../../src/extensions/AppUpdater'
import type { UpdateRuntime } from '../../src/extensions/config/update-policy'
import { FakeUpdater } from '../helpers/fake-updater'
import { createServer } from '../helpers/fake-server'

const runtime: UpdateRuntime = {
  isPackaged: true,
  platform: 'win32',
  portable: false,
  argv: []
}
const enabledPolicy = { ...application.updates, enabled: true }

for (const scenario of [
  { name: 'fork policy', runtime, policy: undefined, reason: 'fork-policy' },
  { name: 'launch flag', runtime: { ...runtime, argv: ['--no-updates'] }, policy: enabledPolicy, reason: 'disabled-by-flag' },
  { name: 'development', runtime: { ...runtime, isPackaged: false }, policy: enabledPolicy, reason: 'development' }
]) {
  test(`${scenario.name} prevents startup, timer and manual update activity`, (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] })
    const host = createServer()
    const factory = t.mock.fn(() => new FakeUpdater())
    const service = new AppUpdater(host.server, factory, scenario.runtime, scenario.policy)

    service.checkAtStartup()
    service.checkAtStartup()
    host.userAction('check-for-update')
    host.userAction('update-and-restart')
    t.mock.timers.tick(application.updates.checkIntervalMs * 2)

    assert.equal(factory.mock.callCount(), 0, 'must not even create the Electron updater')
    assert.deepEqual(service.info, { state: 'disabled', reason: scenario.reason })
    assert.deepEqual(host.sent, [])
  })
}

test('an explicitly enabled packaged updater uses the fork feed and waits for a download before installing', (t) => {
  t.mock.timers.enable({ apis: ['setInterval'] })
  const host = createServer()
  const client = new FakeUpdater()
  const service = new AppUpdater(host.server, () => client, runtime, enabledPolicy)

  assert.deepEqual(client.feed, { provider: 'github', owner: 'andrew-enfusion', repo: 'awakened-poe-trade' })
  service.checkAtStartup()
  service.checkAtStartup()
  assert.equal(client.checks, 1, 'startup must not check twice')
  t.mock.timers.tick(enabledPolicy.checkIntervalMs)
  assert.equal(client.checks, 2)
  host.userAction('check-for-update')
  assert.equal(client.checks, 3)

  host.userAction('update-and-restart')
  assert.equal(client.installs, 0)
  client.emit('update-downloaded', { version: '3.30.103' })
  assert.deepEqual(service.info, { state: 'update-downloaded', version: '3.30.103' })
  assert.deepEqual(host.sent.at(-1), { name: 'MAIN->CLIENT::updater-state', payload: service.info })
  host.userAction('update-and-restart')
  assert.equal(client.installs, 1)
})

for (const scenario of [
  { name: 'portable', runtime: { ...runtime, portable: true } },
  { name: 'macOS', runtime: { ...runtime, platform: 'darwin' as const } }
]) {
  test(`${scenario.name} does not automatically download or install when checking is enabled`, (t) => {
    t.mock.timers.enable({ apis: ['setInterval'] })
    const host = createServer()
    const client = new FakeUpdater()
    const service = new AppUpdater(host.server, () => client, scenario.runtime, enabledPolicy)

    assert.equal(client.autoDownload, false)
    assert.equal(client.autoInstallOnAppQuit, false)
    client.emit('update-available', { version: '3.30.103' })
    assert.deepEqual(service.info, {
      state: 'update-available', version: '3.30.103', noDownloadReason: 'not-supported'
    })
    host.userAction('update-and-restart')
    assert.equal(client.installs, 0)
    client.emit('update-downloaded', { version: '3.30.103' })
    host.userAction('update-and-restart')
    assert.equal(client.installs, 0, 'unsupported installers must remain disabled even after a download event')
  })
}
