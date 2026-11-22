import { app } from 'electron'
import { autoUpdater } from 'electron-updater'
import { AppUpdater as ForkUpdater } from './extensions/AppUpdater'
import type { ServerEvents } from './server'

// Keep the upstream constructor contract at this single desktop boundary.
export class AppUpdater extends ForkUpdater {
  constructor (server: ServerEvents) {
    super(server, () => autoUpdater, {
      isPackaged: app.isPackaged,
      platform: process.platform,
      portable: Boolean(process.env.PORTABLE_EXECUTABLE_DIR),
      argv: process.argv
    })
  }
}

export type { UpdateClient } from './extensions/AppUpdater'
