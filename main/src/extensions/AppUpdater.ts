import type { AppUpdater as ElectronUpdater } from 'electron-updater'
import type { ServerEvents } from '../server'
import type { UpdateInfo } from '../../../ipc/types'
import application from '../../../config/application.json'
import { getUpdateDisabledReason, type UpdatePolicy, type UpdateRuntime } from './config/update-policy'

export type UpdateClient = Pick<ElectronUpdater,
  'autoDownload' | 'autoInstallOnAppQuit' | 'checkForUpdates' | 'quitAndInstall' | 'setFeedURL'> & {
  on(event: 'checking-for-update' | 'update-not-available' | 'error', listener: () => void): unknown
  on(event: 'update-available' | 'update-downloaded', listener: (info: { version: string }) => void): unknown
}

export class AppUpdater {
  private _checkedAtStartup = false
  private _info: UpdateInfo = { state: 'initial' }
  private updater?: UpdateClient

  public readonly noAutoUpdatesReason:
    Extract<UpdateInfo, { state: 'update-available' }>['noDownloadReason'] = null

  get info () { return this._info }
  set info (info: UpdateInfo) {
    this._info = info
    this.server.sendEventTo('broadcast', {
      name: 'MAIN->CLIENT::updater-state',
      payload: info
    })
  }

  constructor (
    private server: ServerEvents,
    createUpdater: () => UpdateClient,
    runtime: UpdateRuntime,
    policy: UpdatePolicy = application.updates
  ) {
    const disabledReason = getUpdateDisabledReason(policy, runtime)
    if (disabledReason) {
      this._info = { state: 'disabled', reason: disabledReason }
      return
    }

    const updater = this.updater = createUpdater()
    const [owner, repo] = new URL(application.repositoryUrl).pathname.slice(1).split('/')
    updater.setFeedURL({ provider: 'github', owner, repo })
    setInterval(this.check, policy.checkIntervalMs)

    this.server.onEventAnyClient('CLIENT->MAIN::user-action', ({ action }) => {
      if (action === 'check-for-update') {
        this.check()
      } else if (action === 'update-and-restart' && updater.autoDownload && this.info.state === 'update-downloaded') {
        updater.quitAndInstall(false)
      }
    })

    // https://www.electron.build/configuration/nsis.html#portable
    updater.autoDownload = !runtime.portable && runtime.platform !== 'darwin'
    updater.autoInstallOnAppQuit = updater.autoDownload

    if (!updater.autoDownload) {
      this.noAutoUpdatesReason = 'not-supported'
    }

    updater.on('checking-for-update', () => {
      this.info = { state: 'checking-for-update' }
    })
    updater.on('update-available', (info: { version: string }) => {
      this.info = { state: 'update-available', version: info.version, noDownloadReason: this.noAutoUpdatesReason }
    })
    updater.on('update-not-available', () => {
      this.info = { state: 'update-not-available', checkedAt: Date.now() }
    })
    updater.on('error', () => {
      this.info = { state: 'error', checkedAt: Date.now() }
    })
    updater.on('update-downloaded', (info: { version: string }) => {
      this.info = { state: 'update-downloaded', version: info.version }
    })
    // on('download-progress') https://github.com/electron-userland/electron-builder/issues/2521
  }

  checkAtStartup () {
    if (!this._checkedAtStartup) {
      this._checkedAtStartup = true
      this.check()
    }
  }

  private check = async () => {
    if (!this.updater) return
    try {
      await this.updater.checkForUpdates()
    } catch {
      // handled by event
    }
  }
}
