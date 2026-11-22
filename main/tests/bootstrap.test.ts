import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { createRequire } from 'node:module'
import { runInNewContext } from 'node:vm'
import { setImmediate } from 'node:timers/promises'
import { build } from 'esbuild'
import application from '../../config/application.json'

test('the actual bundled entry initializes identity before importing host services', async (t) => {
  const appData = mkdtempSync(path.join(tmpdir(), 'poe-bootstrap-'))
  t.after(() => { rmSync(appData, { recursive: true, force: true }) })
  const result = await build({
    entryPoints: ['src/bootstrap.ts'],
    bundle: true,
    write: false,
    format: 'cjs',
    platform: 'node',
    plugins: [{
      name: 'stub-desktop-boundary',
      setup (builder) {
        builder.onResolve({ filter: /^electron$/ }, () => ({ path: 'electron', namespace: 'stub' }))
        builder.onResolve({ filter: /^\.\/main\.js$/ }, () => ({ path: 'host-entry', namespace: 'stub' }))
        builder.onLoad({ filter: /.*/, namespace: 'stub' }, ({ path: name }) => ({
          contents: name === 'electron'
            ? `exports.app = {
                getPath: () => ${JSON.stringify(appData)},
                setName: name => globalThis.identity.name = name,
                setPath: (key, value) => globalThis.identity[key] = value,
                setAppUserModelId: id => globalThis.identity.appId = id
              }`
            : 'globalThis.atHostImport = { ...globalThis.identity }'
        }))
      }
    }]
  })
  const sandbox: {
    identity: Record<string, string>
    atHostImport?: Record<string, string>
    require: NodeJS.Require
    process: NodeJS.Process
  } = { identity: {}, require: createRequire(path.join(process.cwd(), 'package.json')), process }
  runInNewContext(result.outputFiles[0].text, sandbox)
  await setImmediate()
  const isolated = path.join(appData, application.dataDirectory)
  assert.equal(sandbox.atHostImport?.userData, isolated)
  assert.equal(sandbox.atHostImport?.sessionData, isolated)
  assert.equal(sandbox.atHostImport?.name, application.productName)
})
