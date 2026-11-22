import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setImmediate } from 'node:timers/promises'
import { createExtensionRuntime } from '../../src/extensions/runtime.ts'
import type { ExtensionContext, RendererExtension } from '../../src/extensions/contracts.ts'

type Item = { name: string, stats: number[] }
const bindings = { addEnglishMessages () {} }

test('observers get independent snapshots and cannot mutate upstream items or one another', () => {
  const received: string[] = []
  const definitions: Array<RendererExtension<Item>> = [
    { id: 'mutator', setup (context) { context.onItemParsed(event => { event.item.name = 'changed'; event.item.stats.push(9) }) } },
    { id: 'reader', setup (context) { context.onItemParsed(event => { received.push(`${event.stage}:${event.item.name}:${event.item.stats.length}`) }) } }
  ]
  const runtime = createExtensionRuntime(definitions, () => { assert.fail('unexpected extension error') })
  runtime.start(bindings)
  const item = { name: 'Example', stats: [1] }
  runtime.itemParsed(item, 'copied')
  assert.deepEqual(item, { name: 'Example', stats: [1] })
  assert.deepEqual(received, ['copied:Example:1'])
})

test('setup, synchronous, asynchronous and teardown failures do not stop other features', async () => {
  const failures: string[] = []
  let received = 0
  const runtime = createExtensionRuntime<Item>([
    { id: 'setup-fails', setup (context) { context.onItemParsed(() => { assert.fail('failed setup leaked a listener') }); throw new Error('setup') } },
    { id: 'sync-fails', setup (context) { context.onItemParsed(() => { throw new Error('sync') }) } },
    { id: 'async-fails', setup (context) { context.onItemParsed(async () => { throw new Error('async') }) } },
    { id: 'reader', setup (context) { context.onItemParsed(() => { received++ }); return () => { throw new Error('teardown') } } }
  ], id => { failures.push(id) })
  runtime.start(bindings)
  runtime.itemParsed({ name: 'Example', stats: [] }, 'identified')
  await setImmediate()
  assert.equal(received, 1)
  runtime.stop()
  assert.deepEqual(failures.sort(), ['async-fails', 'reader', 'setup-fails', 'sync-fails'])
  runtime.itemParsed({ name: 'Example', stats: [] }, 'copied')
  assert.equal(received, 1)
})

test('startup is idempotent, unsubscribe and stop clean up, and restart registers once', () => {
  let setups = 0
  let events = 0
  let disposals = 0
  let unsubscribe = () => {}
  const runtime = createExtensionRuntime<Item>([{
    id: 'lifecycle', setup (context) {
      setups++
      unsubscribe = context.onItemParsed(() => { events++ })
      return () => { disposals++ }
    }
  }], () => {})
  runtime.start(bindings)
  runtime.start(bindings)
  assert.equal(setups, 1)
  unsubscribe()
  runtime.itemParsed({ name: 'Example', stats: [] }, 'copied')
  assert.equal(events, 0)
  runtime.stop()
  runtime.stop()
  assert.equal(disposals, 1)
  runtime.start(bindings)
  runtime.itemParsed({ name: 'Example', stats: [] }, 'copied')
  assert.equal(events, 1)
})

test('duplicate IDs are refused and an uncloneable item cannot break the caller', () => {
  assert.throws(() => createExtensionRuntime([{ id: 'same', setup () {} }, { id: 'same', setup () {} }], () => {}), /unique/)
  let errors = 0
  const runtime = createExtensionRuntime<unknown>([{
    id: 'reader', setup (context) { context.onItemParsed(() => { assert.fail('uncloneable input was delivered') }) }
  }], () => { errors++ })
  runtime.start(bindings)
  assert.doesNotThrow(() => { runtime.itemParsed({ unsupported () {} }, 'copied') })
  assert.equal(errors, 1)
})

test('a stopped extension cannot register a listener through an old context', () => {
  let context: ExtensionContext<Item> | undefined
  let received = 0
  const runtime = createExtensionRuntime<Item>([{
    id: 'late', setup (value) { context = value }
  }], () => {})
  runtime.start(bindings)
  runtime.stop()
  context!.onItemParsed(() => { received++ })
  runtime.start(bindings)
  runtime.itemParsed({ name: 'Example', stats: [] }, 'copied')
  assert.equal(received, 0)
})
