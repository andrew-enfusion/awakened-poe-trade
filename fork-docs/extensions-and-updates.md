# Extensions and upstream updates

Implemented on 2026-11-22. The fork keeps upstream history and builds its own
modules alongside that source. It does not install upstream binaries over the
custom application, maintain an unrelated source copy, or promise conflict-free
updates when upstream changes its internal contracts.

## Where fork code belongs

| Location | Ownership |
| --- | --- |
| `main/src/extensions` | Desktop bootstrap, identity and updater policy |
| `renderer/src/extensions/features` | Compiled-in renderer features and translations |
| `renderer/src/extensions/components` | Fork presentation, including About |
| `renderer/src/extensions/widgets` | Fork widget list appended to the upstream registry |
| `renderer/src/extensions/runtime.ts` | Feature setup, snapshot delivery, error isolation and cleanup |
| `config/application.json` | Fork installation and release identity |
| `config/upstream.json` | Source repository/branch, review branch and protected contracts |
| `fork-docs` | Fork documentation independent of upstream's website framework |
| `tools/upstream` | Tested source-update tooling |

The remaining upstream integration points are small: the desktop build selects
our bootstrap; the desktop updater constructor delegates to our policy; the
renderer starts extensions before mounting; price checking sends parse events;
the widget registry appends our widget list; About delegates to our component.
Other existing differences, such as package metadata, remain explicit and tested.

## Renderer extension contract

An extension has a unique `id` and synchronous `setup(context)` function.
Setup may return a cleanup function. Register trusted features in `adapter.ts`.
The context currently offers:

- `onItemParsed(listener)`: subscribe to a successful price-check parse or
  unidentified-item resolution. Events distinguish `copied` and `identified`.
- `addEnglishMessages(messages)`: add fork strings to the existing English
  fallback locale without changing upstream translation files.

Each observer receives its own structured clone of the already-parsed item.
It cannot mutate the upstream item or another observer through that snapshot.
Setup/listener/teardown errors and rejected listener promises are contained and
reported. Unsubscribe and stop remove listeners, including failed setup paths.
Setup runs once per start; stopped contexts cannot register late observers.

The layer does not read the clipboard, call a provider, save items or poll for
data. Future network features must reuse the application's request budget and
declare their data needs. Features are trusted code in the same renderer, not
a security sandbox or a runtime plugin marketplace.

For an overlay widget, put the component and its existing `WidgetSpec` metadata
under the extension folder and add it to `widgets/index.ts`. Follow the current
widget configuration/migration rules when introducing persisted settings.
The list starts empty; no new pricing UI is enabled by this setup.

## Update workflow

**Upstream update** runs daily at 09:17 UTC, or from GitHub's Run workflow action.
It tracks the configured upstream `master` branch, including source fixes that
may precede a release tag. The workflow:

1. Reads trusted fork configuration and fetches both histories.
2. Stops without making a branch if upstream is already included in the fork.
3. Creates a local candidate from the existing remote review branch, or the
   current fork base if no review branch exists.
4. Merges newer fork-base commits and upstream commits without resetting history.
5. Verifies protected extension files, required adapter hooks, package scripts
   and new workflow paths. Unreviewed new upstream workflows block publication.
6. Reconciles fork package identity and lockfile root metadata with the merged
   source version, then records the upstream commit in the fork changelog.
7. Uses a normal fast-forward push to `automation/upstream-update`, creates or
   updates one draft PR and dispatches **Fork checks** on that candidate.

An existing PR keeps manual notes outside its managed summary block. An unchanged
review branch does not get duplicate test dispatches. Concurrent remote branch
changes cause the normal push to fail rather than being overwritten.

GitHub's built-in workflow token cannot write workflow files. When a candidate
would change `.github/workflows` relative to the remote review branch, scheduled
publication stops with a report before pushing. Prepare and publish that update
locally using a GitHub login with workflow permissions. The changes are not
dropped or rewritten to evade the permission boundary. Ordinary application/data
updates continue through the bot without a personal access token. Entirely new
upstream workflow paths still require a contract review before publication.

## Conflict and compatibility policy

Ordinary text conflicts stop the update, abort the tool's merge and return to
the original checkout. The base branch and remote review branch are not changed
by a failed preparation. The workflow stores a JSON report with conflict paths
or the failed contract; an unpublished local candidate remains inspectable.

Only conflicts in `main/package.json` and `main/package-lock.json` receive an
additional JSON field-level merge attempt. Compatible changes are combined;
fork name/repository identity is retained and lock root versions are reconciled
to the merged manifest. Different changes to the same dependency, arrays or
other ambiguous fields still require manual resolution. No blanket ours/theirs
strategy, hard reset, force-push, automatic approval or merge is used.

The protected hook checks are deliberate compatibility tripwires, not proof that
all upstream behaviour is unchanged. Candidate type checks, tests, lint and
builds must also pass. Behaviour changes in providers, game input and installers
still need suitable manual testing.

## Permissions and checks

The preparation job has contents, pull-request and Actions write permissions
to push the candidate, manage its PR, disable inherited workflows and dispatch
checks. It does not install dependencies or execute the candidate application.
Its scripts are loaded from the trusted default-branch checkout before merging.

Candidate checks run separately with read-only repository permissions, no
publishing secrets and checkout credentials removed. They test Git fixtures,
renderer extensions and host identity/update policy, lint/build the app, and
build the upstream documentation with its current framework. They do not
publish installers, a website or a release. Inherited `main.yml` and `pages.yml`
workflows are disabled on this fork; the separate fork workflows own CI.

GitHub's repository option allowing Actions to create pull requests must be on.
That option also permits bot review operations at the platform level; this
workflow never invokes approval or merge operations. It explicitly dispatches
checks so no personal access token is needed to trigger candidate validation.

## Manual use and release boundary

Run `node --test tools/upstream/tests/*.test.mjs` from the repository root.
Run `npm test` in `renderer` and `main` for their extension checks.

For local source preparation, use a fresh clean clone with `origin` pointing
at the fork, then run `node tools/upstream/run.mjs`. It leaves a local review
branch and a report in the temporary directory. Add `--publish` only when you
intend to push the review branch, manage its PR and dispatch GitHub checks.
That mode requires GitHub CLI authentication with the appropriate repository
permissions.

After reviewing the candidate and test results, merge its PR through GitHub.
Only then should the combined application be packaged, manually validated and
released through the fork's own release channel. Runtime binary updates remain
disabled until that release/install channel is ready. A first validated feature
release could use `0.1.0-alpha.1`; no version tag is created by this setup.
