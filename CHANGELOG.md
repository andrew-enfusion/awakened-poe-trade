# Changelog

Notable changes to the andrew-enfusion fork are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Fork releases will use [Semantic Versioning](https://semver.org/) once their
identity and release policy are established.

## [Unreleased]

### Added

- Added isolated desktop/renderer extension folders, typed item snapshots, lifecycle cleanup and a fork widget registration point.
- Added a daily/manual upstream source-update workflow that prepares a draft PR, preserves fork contracts and dispatches read-only checks.
- Added Git fixture tests for merge conflicts, protected files, repeated updates, version reconciliation and pull-request handling.
- Reported workflow-file updates for credentialed manual publication instead of attempting unsupported writes with the built-in Actions token.
- Documented the inherited architecture and item-to-price data flow before feature development.
- Recorded source-review findings, build validation, dependency advisories and integration limitations.
- Proposed a staged development approach that preserves upstream structure and limits maintenance risk.
- Added shared fork configuration and regression tests for startup ordering, isolated settings/sessions, updater policy and effective packaging metadata.

### Changed

- Moved fork documentation outside the upstream documentation site to avoid framework-migration conflicts.
- Restored upstream workflow files and reference messages; fork-owned workflows and extension translations now carry our changes separately.
- Identified this repository as a fork and linked its review documentation from the README.
- Separated the fork's application, executable, installer, settings and browser-session identity from upstream.
- Disabled application update checks, downloads and installation by default; made `--no-updates` disable all update activity.
- Pointed fork release/support links and optional future update feeds at the fork repository while preserving upstream attribution.
- Made package publishing opt-in outside the default command and documentation deployment manually triggered; added host tests to CI.

### Fixed

- Initialized fork paths before host modules capture file locations, preventing imported assets from using the upstream settings directory.
- Removed the inherited publisher entry so effective packaging metadata contains only the fork repository.
- Synchronized the host lockfile's package name and version metadata with its manifest.

[Unreleased]: https://github.com/andrew-enfusion/awakened-poe-trade/compare/2498730beecc1a46d39214ac437ffbe9f5f542d8...master
