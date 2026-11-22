import type { ExtensionContext, ItemParsedEvent, RendererExtension } from './contracts.ts'

export function createExtensionRuntime<TItem> (
  extensions: Array<RendererExtension<TItem>>,
  reportError: (extensionId: string, error: unknown) => void
) {
  if (new Set(extensions.map(extension => extension.id)).size !== extensions.length) {
    throw new Error('Extension IDs must be unique')
  }

  type Observer = { id: string, listener: Parameters<ExtensionContext<TItem>['onItemParsed']>[0] }
  const observers = new Set<Observer>()
  const cleanups: Array<() => void> = []
  let running = false

  function safelyReport (id: string, error: unknown) {
    try { reportError(id, error) } catch { /* Reporting must not break the upstream UI. */ }
  }

  function start (bindings: Pick<ExtensionContext<TItem>, 'addEnglishMessages'>) {
    if (running) return
    running = true

    for (const extension of extensions) {
      const owned = new Set<Observer>()
      let active = true
      const removeObservers = () => {
        active = false
        for (const observer of owned) observers.delete(observer)
        owned.clear()
      }
      try {
        const dispose = extension.setup({
          ...bindings,
          onItemParsed (listener) {
            if (!active) return () => {}
            const observer = { id: extension.id, listener }
            owned.add(observer)
            observers.add(observer)
            return () => { observers.delete(observer); owned.delete(observer) }
          }
        })
        cleanups.push(() => {
          removeObservers()
          try { dispose?.() } catch (error) { safelyReport(extension.id, error) }
        })
      } catch (error) {
        removeObservers()
        safelyReport(extension.id, error)
      }
    }
  }

  function itemParsed (item: TItem, stage: ItemParsedEvent<TItem>['stage']) {
    if (!running) return
    for (const observer of [...observers]) {
      if (!observers.has(observer)) continue
      try {
        // Each observer gets its own snapshot; neither upstream nor its peers are mutable through it.
        const result = observer.listener({ item: structuredClone(item), stage })
        Promise.resolve(result).catch((error: unknown) => { safelyReport(observer.id, error) })
      } catch (error) {
        safelyReport(observer.id, error)
      }
    }
  }

  function stop () {
    for (const cleanup of cleanups.splice(0).reverse()) cleanup()
    observers.clear()
    running = false
  }

  return { start, stop, itemParsed }
}
