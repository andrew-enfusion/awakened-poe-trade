import { EventEmitter } from 'node:events'
import type { UpdateClient } from '../../src/AppUpdater'

export class FakeUpdater extends EventEmitter implements UpdateClient {
  autoDownload = true
  autoInstallOnAppQuit = true
  checks = 0
  installs = 0
  feed?: Parameters<UpdateClient['setFeedURL']>[0]

  setFeedURL (feed: Parameters<UpdateClient['setFeedURL']>[0]) {
    this.feed = feed
  }

  async checkForUpdates () {
    this.checks++
    return null
  }

  quitAndInstall () {
    this.installs++
  }
}
