import type { UpdateInfo } from '../../../../ipc/types'

export interface UpdatePolicy {
  enabled: boolean
  checkIntervalMs: number
}

export interface UpdateRuntime {
  isPackaged: boolean
  platform: NodeJS.Platform
  portable: boolean
  argv: readonly string[]
}

export function getUpdateDisabledReason (
  policy: UpdatePolicy,
  runtime: UpdateRuntime
): Extract<UpdateInfo, { state: 'disabled' }>['reason'] | null {
  if (runtime.argv.includes('--no-updates')) return 'disabled-by-flag'
  if (!policy.enabled) return 'fork-policy'
  if (!runtime.isPackaged) return 'development'
  return null
}
