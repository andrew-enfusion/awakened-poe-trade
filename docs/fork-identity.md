---
title: Fork identity and update isolation
---

# Fork identity and update isolation

Implemented on 2026-11-22 following the [baseline review](./fork-review.md).
This pass establishes an isolated desktop fork before pricing features are added.

## Configuration and startup

[`config/application.json`](../config/application.json) owns the product name,
application ID, data-directory name, repository links and update policy.
The current identity is `Awakened PoE Trade - Andrew`, with package/executable
name `awakened-poe-trade-andrew`.

`main/src/bootstrap.ts` initializes that identity before importing `main.ts`.
This ordering matters: the file-upload module captures its storage directory
during import. Setting a path only before the ready event would be too late.
The fork uses its own settings and browser-session directories, and acquires
its single-instance lock after that setup.

On Windows, its default settings file is:

```text
%APPDATA%\awakened-poe-trade-andrew\apt-data\config.json
```

Linux and macOS use the equivalent Electron `appData` location. The fork starts
with its own defaults and session; it does not copy upstream settings, cookies,
uploaded files or OCR binaries. Its AppUserModelID is also distinct on Windows.
The game log/configuration paths are still discovered through the existing
application settings; they are not private copies of game files.

## Update policy

`updates.enabled` is false. In that state the application does not construct the
Electron updater, create an update timer, check at startup, accept manual update
actions, download an update or install one on exit. About shows the disabled
state instead of offering an upstream update.

`--no-updates` enforces the same complete opt-out if the configured policy is
later enabled. Development builds also keep updates disabled. A future packaged
build with updates explicitly enabled pins its feed to the configured fork
repository; installation actions require a downloaded update. Portable and
macOS builds retain manual-download behaviour, with automatic install-on-exit
disabled.

Do not enable updates until fork versioning, channels, release assets and
installer behaviour have been validated. The package version remains the
upstream baseline `3.30.102`; no release or version tag was created by this pass.

## Packaging and CI

Run these commands from `main`, after building the renderer:

```shell
npm test
npm run build
npm run package -- --dir
```

`npm run package` selects `electron-builder.fork.cjs`, which extends the existing
platform settings and supplies the fork application ID, product/executable
names and explicit GitHub repository. Setup and portable executables have
different artifact names. A regression test loads and validates the effective
Electron Builder configuration to catch merged inherited publishers.

Publishing defaults to `never`, and CI no longer supplies a publishing token.
The documentation workflow requires manual dispatch. Neither workflow was
enabled through repository settings, and no site or release was published.

The npm package name and repository fields must match shared configuration.
Tests enforce that invariant, including lockfile root metadata. Dependency
versions were not upgraded during this pass.

## Validation and limitations

- Twelve host regression tests pass, including a bundled-entry test that checks
  identity is initialized before host imports, and platform fixtures checking
  upstream settings remain intact.
- Host TypeScript checking and the production host build pass.
- Renderer lint and production build pass. Four inherited lint warnings and
  the existing bundle/Browserslist warnings remain.
- Packaging configuration passes Electron Builder's schema validation and
  contains only the fork's publisher identity.
- A Windows unpacked package was attempted. After supplying workspace-local
  npm on PATH, it reached ASAR generation and executable resource editing, then
  failed extracting the Windows signing tools because the process lacks
  symlink privileges. This is not a completed or distribution-ready installer.

The tests use fake Electron/updater boundaries and temporary fixtures, not the
installed upstream application. The full app, game hotkeys and native overlay
were not launched. Native installer isolation, update installation and Linux/
macOS packages still need manual validation in suitable build environments.

The local server hardening, dependency advisories and trade/search findings in
the baseline review remain open. This pass does not establish GGG approval or
provide additional market-data access.
