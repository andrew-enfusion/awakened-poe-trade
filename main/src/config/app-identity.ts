import { mkdirSync } from 'node:fs'
import path from 'node:path'
import type { App } from 'electron'
import application from '../../../config/application.json'

type IdentityApp = Pick<App, 'getPath' | 'setPath' | 'setName' | 'setAppUserModelId'>

// Run before the single-instance lock and before Electron creates any sessions.
export function initializeAppIdentity (app: IdentityApp, platform = process.platform) {
  const dataPath = path.join(app.getPath('appData'), application.dataDirectory)
  mkdirSync(dataPath, { recursive: true })

  app.setName(application.productName)
  app.setPath('userData', dataPath)
  app.setPath('sessionData', dataPath)

  if (platform === 'win32') {
    app.setAppUserModelId(application.appId)
  }
}
