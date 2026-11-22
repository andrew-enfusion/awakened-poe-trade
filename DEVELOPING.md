# How this works

There are 2 main parts of the app:

1. renderer: this is the HTML/Javascript-based UI rendered within the Electron container. This runs Vue.js, a React-like Javascript framework for rendering front-end.
2. main: includes the main app (written in Electron). Handles keyboard shortcuts, brings up the UI and overlays.

The fork's shared identity and update policy are in `config/application.json`.
The host entry is `main/src/bootstrap.ts`: it must initialize settings and browser
paths before importing host services. See [fork identity](./docs/fork-identity.md)
for the first pass and its validation limits.

Note that these 2 both depend on each other, and one cannot run without the other.

# How to develop

The most up-to-date instructions can always be derived from CI:

[.github/workflows/main.yml](./.github/workflows/main.yml)

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
