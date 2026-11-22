---
title: Fork development approach
---

# Fork development approach

Status: the 2026-11-22 [identity pass](./identity.md) implements the
installation/settings/update isolation from Stage 2 and adds its regression
tests. The subsequent [extension pass](./extensions-and-updates.md) separates
fork modules and automates reviewed upstream source updates. Pricing features
and external companion integration remain proposals. Read
[architecture](../ARCHITECTURE.md) and [findings](./review.md) first.

## Preserve the existing stack

Keep Electron, Vue, TypeScript, the parser and the widget system. There is no
current need for a React rewrite, hosted backend, database, microservices or
general plugin framework. The application's native input/window integration
would make a browser-only replacement substantially different in scope.

Use existing folders by concern. New functionality should have a clear owner:
pure item logic in `parser` or a focused domain module; view orchestration in a
composable/service; presentation in small Vue components; privileged desktop
operations in `main`; shared transport contracts in `ipc`.

Keep environment-specific endpoints, identity and operational limits in named
configuration when introducing or changing them. Existing protocol identifiers
and game-specific stat mappings are domain data; avoid an unrelated sweep of
all inherited constants.

## Smallest useful implementation sequence

### Stage 1: Select the first feature and its data contract

Choose one concrete workflow, such as retaining a comparison from a user-driven
price check, explaining a price sample, or keeping local item notes. Establish:

- PoE1 versus PoE2, and personal use versus distribution.
- The manual trigger and expected result.
- Required item/listing fields and source attribution.
- Whether current retrieved data is sufficient or new requests are needed.
- Freshness, persistence, privacy and export requirements.

Do not treat a seller whisper as a completed sale or a poe.ninja overview as an
exact quote for a rare item. If PoE2 is required, review an appropriate PoE2
baseline before assuming this parser and trade layer can be reused unchanged.

### Stage 2: Establish fork identity before running a packaged fork

Define the application name/ID, configuration directory, repository metadata,
installer names, release destination and update policy. Keep these settings
coherent and separate from the installed upstream app. Validate generated
update metadata and configuration paths before installing anything.

The fork's checks workflow runs extension, identity, updater and automation tests
with read-only repository permissions. Inherited build/deployment workflows are
disabled. The separate upstream workflow prepares draft PRs; no release or
documentation site is published by that workflow.

### Stage 3: Implement one feature inside the existing renderer

For a comparison feature, the extension layer now supplies this location:

```text
renderer/src/extensions/
  models/comparison.ts              # required fields, source and timestamps
  services/comparison-service.ts    # feature logic using one existing search path
  components/ComparisonPanel.vue    # presentation
renderer/tests/extensions/
  services/comparison-service.test.ts
```

The comparison files above are illustrative, not a feature already created. Use them only if
the selected feature requires those responsibilities. Keep request construction,
provider fetching, response mapping and presentation separate as they are
touched. Preserve full required data before mapping it to the existing table.

Extract the current search orchestration only if a second consumer needs it.
Keep a single request owner and request budget. Do not add independent polling
to a second UI or reuse another app's registered identity.

### Stage 4: Add external integration only if the feature requires it

A separate companion needs an explicit, versioned contract. Authentication,
Origin checking, validated message schemas, file containment, client routing
and shared request scheduling become prerequisites. Do not expose the current
internal server or cookie-bearing proxy directly as the companion API.

For personal offline notes or saved comparisons, start with the smallest
versioned local format that meets retention/export needs. Add SQLite only when
querying, size, concurrent writes or migration requirements justify it.

## Stress test of this approach

| Proposal | Weakness or over-engineering risk | Revised approach |
| --- | --- | --- |
| Extract all parser and trade code into a reusable SDK | Large, risky changes before requirements; hard upstream merges | Extract one needed boundary after representative fixtures exist |
| Add a generic data-service API immediately | Authentication and multi-client scheduling become a project of their own | Keep the first feature in the original renderer |
| Use every fetched result as price history | Samples can be stale, grouped and incomplete; listings are not sales | Store source, league, query, retrieval time and sampling limits |
| Upgrade every dependency in one commit | Native modules, Electron, Vue tooling and packaging patches may break together | Triage advisories and upgrade compatible groups separately |
| Rebrand everything immediately | Changes many unrelated UI strings and support links | Isolate install/storage/update identity first; handle branding as a separate decision |
| Rewrite large inherited files | High regression risk and permanent merge conflicts | Add focused files; make small extractions backed by behaviour checks |

## Checks to add when behaviour changes

The host now uses Node's built-in test runner with the existing esbuild dependency
to compile TypeScript tests. Run `npm test` in `main`. Mirror source structure
under each package's `tests` when extending coverage. Renderer extension tests
use Node 24's native TypeScript support; automation tests use temporary Git
repositories without calling GitHub.
Useful cases include parser fixtures from supported languages, query construction,
provider response mapping, stale response/error rejection, shared throttling,
429/backoff, cache scoping, settings migration and local transport validation.

Use sanitized fixtures and mocked providers for automated checks. Exercise live
services manually only when needed to validate an authorized integration. Keep
credentials, cookies, account dumps and real private chat out of test fixtures.

For normal development, follow [DEVELOPING.md](../DEVELOPING.md): install locked
dependencies in each package, build the renderer first, then build the host.
The review's initial script-disabled install was an inspection precaution, not
a replacement for the documented setup. Electron setup and the existing host
postinstall patch were subsequently completed for the build check.

## Git, releases and upstream maintenance

The local checkout uses `origin` for `andrew-enfusion/awakened-poe-trade` and
`upstream` for `SnosMe/awakened-poe-trade`. New clones need to add the upstream
remote themselves. Fetch and review upstream changes before integrating them;
do not force-reset local work to synchronize the fork.

Keep changes in small Conventional Commits and update [CHANGELOG.md](../CHANGELOG.md).
Preserve the upstream MIT notice and acknowledge separately licensed dependencies
and assets when preparing distribution. MIT licensing is not permission to use
GGG services under another application's credentials or registration.

The review stays in `Unreleased`. After fork identity is isolated and the first
feature is validated, suggest a distinct prerelease such as `0.1.0-alpha.1`.
Coordinate its updater channel/version comparison with the inherited upstream
`3.30.102` version rather than changing version numbers in isolation. No version
tag or release is created during this review.
