---
title: Fork source review
---

# Fork source review

Reviewed on 2026-11-22. Baseline:
[`2498730beecc1a46d39214ac437ffbe9f5f542d8`](https://github.com/SnosMe/awakened-poe-trade/commit/2498730beecc1a46d39214ac437ffbe9f5f542d8),
application `3.30.102`. The fork preserves upstream application behaviour.

## Assessment

This is a useful foundation for an expanded PoE1 item-checking tool. Its main
value is the parser, bundled item/stat mappings, presets and mature desktop
workflow. It is not already a general market-data service. The renderer owns
search execution, request budgets and UI-oriented result reduction.

The recommended starting point is one narrowly scoped feature inside the
existing renderer, with a small service boundary when needed. A standalone
companion or remotely hosted proxy would add significant coordination and
security work before delivering a feature.

## Scope and confidence

The review covered all checked-in Markdown documentation, manifests, workflows,
host startup/transport/storage/updates, item capture and parser entry points,
reference-data loading, filter/preset entry points, trade request and response
paths, reference prices and predictions. It did not inspect every modifier
rule or every locale record for semantic correctness.

Confirmed findings below follow directly from source or local checks.
Potential consequences and recommended changes are identified separately.
No live trade requests, account authorization, credential extraction, game
input, app launch, installer installation or security probing were performed.

## Findings before distribution or external integration

### 1. Local transport is a privileged internal interface

**Confirmed:** HTTP routes and the WebSocket upgrade handler do not implement
an application authentication token or Origin allowlist. WebSocket messages
are parsed and cast to a TypeScript type without runtime validation. Those
events include configuration writes and host actions. The default bind address
is loopback, but `--listen` can change it.

**Consequence:** the server should not be exposed on a LAN or used as a public
service in its current form. Loopback narrows exposure but does not establish
client identity. Browser reachability depends on browser/network protections;
this review does not establish an exploit from an arbitrary web page.

**Next step:** define allowed clients and operations; add runtime schemas,
authentication and Origin validation before adding companion access. Review
path containment, stream errors and upload limits at the same boundary. This
is a source finding, not a tested exploit or a claim of arbitrary code execution.

Evidence: [server.ts](../main/src/server.ts#L69),
[event parsing](../main/src/server.ts#L86),
[configuration writes](../main/src/host-files/ConfigStore.ts#L11),
[file routes](../main/src/host-files/file-uploads.ts).

### 2. Fork packaging and updates still inherit upstream identity

**Confirmed:** the package repository points to SnosMe, Electron Builder uses
the upstream product name with GitHub publishing, and update checks are active.
Configuration paths derive from Electron's application identity. No explicit
fork-specific `userData` override exists in the reviewed source. Documentation
also links to upstream releases, support and funding.

**Consequence:** an unmodified packaged fork can confuse installation, settings,
support and update ownership. The exact generated installer/update metadata
must be checked; it was not generated in this review.

**Next step:** choose a fork identity, isolated settings directory, explicit
release destination and update policy before launching a custom installer.
Preserve attribution while clearly identifying the fork. The inherited
`--no-updates` flag disables automatic downloads; it does not disable all update
checks, so it is not a complete isolation strategy.

Evidence: [package identity](../main/package.json),
[packaging](../main/electron-builder.yml),
[updater](../main/src/AppUpdater.ts),
[storage](../main/src/host-files/ConfigStore.ts#L8),
[documentation configuration](./.vitepress/config.js).

### 3. MIT reuse and GGG service authorization are separate

**Confirmed:** the source license permits modification and redistribution with
the copyright/license notice retained. The current trade path uses website
endpoints and Electron cookies, not the documented developer OAuth flow.

**Unresolved:** a fork does not establish independent approval for its service
usage. GGG currently states that new application registrations are closed and
supports the resources in its API reference and data exports. Its requirements
also cover user-triggered clipboard/screen access and game-affecting macros.

**Next step:** define the intended feature and its request pattern, then resolve
any service-access uncertainty before relying on it for distribution. Do not
claim that upstream usage or MIT licensing grants GGG approval.

Evidence: [LICENSE](../LICENSE), [proxy](../main/src/proxy.ts),
[GGG developer policy](https://www.pathofexile.com/developer/docs),
[supported APIs](https://www.pathofexile.com/developer/docs/reference),
[official data exports](https://www.pathofexile.com/developer/docs/data).

### 4. The dependency baseline needs advisory triage

The local npm audit reported the following affected-package counts, including
development dependencies. Counts overlap across projects and are not counts of
independently exploitable application bugs.

| Project | Low | Moderate | High | Critical | Total |
| --- | --- | --- | --- | --- | --- |
| renderer | 0 | 17 | 13 | 0 | 30 |
| main | 1 | 7 | 17 | 1 | 26 |

Direct packages flagged include Vite, Vue, vue-i18n, PostCSS, vue-tsc, Electron,
Electron Builder, electron-updater, esbuild and ws. The critical desktop-tree
finding is transitive `tar`. These results require dependency-path and
reachability analysis. Development classification alone is insufficient:
Electron is a devDependency but supplies the shipped runtime, and some host
devDependencies are bundled into the application.

**Next step:** separate shipped-runtime issues from build/development exposure,
review applicable advisory details, then upgrade small compatible groups with
targeted checks. Do not run a blanket forced audit fix or infer that every
reported package is reachable in production.

Evidence: `npm audit --json` against both lockfiles on the review date. Raw local
reports were retained outside the repository in the review tooling directory.
Advisory results can change independently of the checked-in dependencies.

## Findings to address with feature work

### 5. Search state is coupled to components and individual renderer clients

`TradeListing.vue` owns search state, batching, seller grouping and the stale
search counter. Rate limiters and caches are renderer module state; the host
proxy simply forwards requests. A second client has separate request budgets.
Connecting it also changes `lastActiveClient`, which controls item-event routing.

**Next step:** keep the first feature in the existing renderer. Extract a
composable/service for a second consumer only when required. A multi-client
design would need shared host-side scheduling, client routing and cache policy.

Evidence: [search orchestration](../renderer/src/web/price-check/trade/TradeListing.vue#L113),
[limiter ownership](../renderer/src/web/price-check/trade/common.ts#L37),
[client routing](../main/src/server.ts#L46).

### 6. Results are samples, and the mapper discards useful item details

The individual listing flow fetches in batches of ten and caps further fetching
at one hundred. It maps responses to pricing records and groups sellers.
The response contract does not retain full comparable-item modifiers. Bulk
search has its own offer filtering and result limits. Neither represents
confirmed sales or a complete historical market.

**Next step:** decide whether a feature needs listing samples, raw comparable
items, reference prices or saved snapshots. Preserve required fields in a
typed model before the UI reduction, with source, league and retrieval time.

Evidence: [batch limits](../renderer/src/web/price-check/trade/TradeListing.vue#L108),
[result mapper](../renderer/src/web/price-check/trade/pathofexile-trade.ts#L812),
[bulk processing](../renderer/src/web/price-check/trade/pathofexile-bulk.ts#L140).

### 7. Cancellation, retry and cache scope need targeted checks

Individual searches use a generation counter to discard a superseded search
response, but the final error handler does not check that generation. Outstanding
fetches have no AbortSignal. A late error from an older search could therefore
replace the current error state; this sequence was identified by inspection,
not reproduced at runtime.

Trade caching normally lasts five minutes and does not include the selected
host in its keys. Rate-limit headers are parsed, but no explicit `Retry-After`
handling was found in the trade modules. Provider/locale switching, overlapping
requests, 429 responses and stale listings deserve regression coverage before
expanding request volume.

Evidence: [search generation and catch](../renderer/src/web/price-check/trade/TradeListing.vue#L152),
[cache TTL](../renderer/src/web/price-check/trade/Cache.ts),
[request cache keys](../renderer/src/web/price-check/trade/pathofexile-trade.ts#L778),
[rate-limit adaptation](../renderer/src/web/price-check/trade/common.ts#L49).

### 8. Persistence, reference data and maintenance require explicit ownership

Configuration writes are direct file writes without an atomic replacement or
serialized write queue. Reference datasets are checked in, but the repository
contains index generation rather than a complete reproducible pipeline for
regenerating those item/stat datasets. Upstream changes will remain important.

Large inherited files include `Parser.ts` (1,342 lines),
`pathofexile-trade.ts` (961) and `Config.ts` (571). A full rewrite would make
upstream merges harder. Keep additions in focused files; extract only the
responsibility needed for an approved feature, after proposing a branch for
any destructive refactor.

Evidence: [configuration store](../main/src/host-files/ConfigStore.ts),
[reference assets](../renderer/public/data),
[index generator](../renderer/src/assets/make-index-files.mjs).

## Validation results

Environment: Windows, Node `24.22.3`, workspace-local npm `11.6.2`.

| Check | Result |
| --- | --- |
| Clean fork baseline and source commit | Verified before documentation edits |
| Locked dependency installation, main and renderer | Passed; initially used `--ignore-scripts` |
| Renderer `npm run lint` | Passed with four inherited unused-disable warnings |
| Renderer `npm run build` | Passed, including Vue type checking and index generation |
| Main `tsc --noEmit` | Passed |
| Electron binary setup and main postinstall | Passed; packaging patch has a version-mismatch warning |
| Main `npm run build` | Passed after completing Electron setup |
| Bundled NDJSON syntax and trailing newlines | Passed for all eight item/stat files |
| npm advisory audit | Completed; findings above remain unresolved |

The renderer build warns about old Browserslist data and a roughly 1.27 MB
minified JavaScript chunk. The AppImage patch was created for app-builder-lib
`26.8.1` and applies to installed `26.9.0` with a warning. Linux packaging
behaviour has not been verified here.

No general automated application test suite is configured. The file named
`apprun-patch.test.mjs` is an Electron Builder hook that validates a produced
Linux artifact; running it as a generic unit test would not exercise that hook.

Not verified: live provider availability, cookie challenges, game hotkeys,
overlay behaviour, OCR, Electron UI behaviour, installer/update isolation,
cross-platform packaging and the documentation site build. No existing user
installation or settings were modified.
