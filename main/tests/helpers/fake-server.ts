import { EventEmitter } from 'node:events'
import type { ServerEvents } from '../../src/server'
import type { IpcEvent } from '../../../ipc/types'

export function createServer () {
  const events = new EventEmitter()
  const sent: IpcEvent[] = []
  const server: ServerEvents = {
    onEventAnyClient (name, callback) { events.on(name, callback) },
    sendEventTo (_target, event) { sent.push(event) }
  }

  return {
    server,
    sent,
    userAction (action: 'check-for-update' | 'update-and-restart') {
      events.emit('CLIENT->MAIN::user-action', { action })
    }
  }
}
