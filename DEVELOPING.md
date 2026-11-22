# How this works

There are 2 main parts of the app:

1. renderer: this is the HTML/Javascript-based UI rendered within the Electron container. This runs Vue.js, a React-like Javascript framework for rendering front-end.
2. main: includes the main app (written in Electron). Handles keyboard shortcuts, brings up the UI and overlays.

The fork's shared identity and update policy are in `config/application.json`.
The host entry is `main/src/extensions/bootstrap.ts`: it must initialize settings and browser
paths before importing host services. See [fork identity](./fork-docs/identity.md)
for the first pass and its validation limits.

Note that these 2 both depend on each other, and one cannot run without the other.

# How to develop

The most up-to-date instructions can always be derived from CI:

[.github/workflows/fork-checks.yml](./.github/workflows/fork-checks.yml)

Use Node 24 with npm. The following commands apply to the fork.

```shell
cd renderer
npm ci
npm run dev

# In a second shell
cd main
npm ci
npm run dev
```

# How to build

```shell
cd renderer
npm ci
npm test
npm run build

cd ../main
npm ci
npm test
npm run build
# We want to sign with a distribution certificate to ensure other users can
# install without errors
CSC_NAME="Certificate name in Keychain" npm run package
```

`npm run package` selects `main/electron-builder.fork.cjs` and disables
publishing. Use `npm run package -- --dir` for an unpacked local build.
The YAML file contains shared platform settings and is not the fork's complete
packaging configuration. Do not invoke it directly for a fork release.

Host tests use Node's built-in test runner, with esbuild compiling the test files
into ignored `main/dist/tests`. They run without starting Electron or the game.
Application update checks/downloads/installs are disabled by fork policy.
`--no-updates` also disables checks and installation when updates are otherwise
enabled. The fork does not migrate upstream settings, cookies or OCR files.

Renderer features belong in `renderer/src/extensions`; desktop additions belong
in `main/src/extensions`. Add widgets through the fork widget list and subscribe
to parsed-item snapshots through the typed renderer context. Keep new business
logic out of upstream files. See [the extension contract](./fork-docs/extensions-and-updates.md).

Run the updater's Git fixture tests from the repository root:

```shell
node --test tools/upstream/tests/*.test.mjs
```

The **Upstream update** GitHub workflow runs daily and can be dispatched manually.
It prepares a draft PR on `automation/upstream-update`; it does not merge or
publish. For local preparation, use a fresh clean checkout and
`node tools/upstream/run.mjs`. That command leaves the local review branch ready
for inspection; only `--publish` pushes it, manages its PR and dispatches checks.
Do not use force synchronization to update this fork.
