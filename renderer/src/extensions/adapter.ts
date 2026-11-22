import type { ParsedItem } from '@/parser'
import type { ExtensionContext } from './contracts.ts'
import { createExtensionRuntime } from './runtime.ts'
import { identityExtension } from './features/identity'

// Add trusted, compiled-in features here. This is not a downloaded plugin system.
export const extensions = createExtensionRuntime<ParsedItem>([
  identityExtension<ParsedItem>()
], (id, error) => {
  console.warn(`[extensions] ${id}: ${error instanceof Error ? error.message : 'operation failed'}`)
})

export function initializeRendererExtensions (addEnglishMessages: ExtensionContext<ParsedItem>['addEnglishMessages']) {
  extensions.start({ addEnglishMessages })
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => { extensions.stop() })
}
