import { app } from 'electron'
import { initializeAppIdentity } from './config/app-identity'

// Some host modules capture userData paths during import, so initialize first.
initializeAppIdentity(app)
void import('./main.js')
