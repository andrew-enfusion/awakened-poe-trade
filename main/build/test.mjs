import { globSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { build } from 'esbuild'

const tests = [...globSync('tests/**/*.test.ts')].sort()
if (!tests.length) throw new Error('No main-process tests found')

const result = await build({
  entryPoints: tests,
  outdir: 'dist/tests',
  outbase: 'tests',
  bundle: true,
  platform: 'node',
  format: 'cjs',
  target: 'node24',
  packages: 'external',
  metafile: true
})

const run = spawnSync(process.execPath, ['--test', ...Object.keys(result.metafile.outputs)], {
  stdio: 'inherit'
})
if (run.error) throw run.error
process.exitCode = run.status ?? 1
