# AGENTS.md

How this repository works and the rules for changing it. It is for human contributors and coding agents alike. Read it before your first change. Where a doc covers a topic in depth, this file links to it rather than repeating it.

## What this is

Duplicity is a browser-based save editor for Oxygen Not Included (base game and every DLC), live at [duplicity.noman.codes](https://duplicity.noman.codes). It is a from-scratch successor to RoboPhred/oni-duplicity and shares no code with it.

The non-negotiables, from [docs/architecture.md](docs/architecture.md#principles):

- **The save never leaves the browser.** No server, accounts or analytics. Parsing and editing run in a web worker.
- **Never corrupt a save.** Unknown data round-trips byte for byte. Unverified game versions cannot be downloaded without opting in. The original file is never overwritten.
- **Degrade, don't die.** Data the parser cannot decode stays raw and round-trips unchanged.
- **Generated, not hand-typed.** Game data comes from the game's own files. Transcriptions from the decompile are the exception, and they are documented.
- **Keep it simple.** The stack stays small until a feature needs more.

## Where to read more

| Doc                                                  | What it holds                                                                                                                         |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [README.md](README.md)                               | Features, supported save versions, user instructions                                                                                  |
| [CONTRIBUTING.md](CONTRIBUTING.md)                   | Setup, fixture, bench and fuzz commands, release command                                                                              |
| [docs/architecture.md](docs/architecture.md)         | Decisions and why: parser, worker, edits, undo, CI, deploys, performance. Changing a decision means editing this file in the same PR. |
| [docs/requirements.md](docs/requirements.md)         | Scope, features and acceptance criteria (what "done" means for a feature)                                                             |
| [docs/design.md](docs/design.md)                     | UI design direction: measured colours, component recipes, per-PR UI checklist                                                         |
| [docs/save-format.md](docs/save-format.md)           | Format notes the code doesn't say, and every intentional difference from the differential oracle                                      |
| [docs/open-questions.md](docs/open-questions.md)     | Unresolved questions, current assumptions, and per-edit evidence and risk write-ups                                                   |
| [docs/verified-in-game.md](docs/verified-in-game.md) | Edits confirmed in the real game (none yet) and the step-by-step checks still waiting                                                 |
| [docs/progress.md](docs/progress.md)                 | Dated log of what each piece of work did, what it checked and what risks remain                                                       |
| [test-data/README.md](test-data/README.md)           | Fixture saves, tiers, sources and licenses                                                                                            |

Some docs lag the code. When they disagree, trust the code and config, and fix the doc in your PR if it's in scope. Known drift: `architecture.md` still mentions light and system themes and Vite+ `1.0.0-rc.1`. The app is dark only ([design.md](docs/design.md#1-decisions)), and the pinned Vite+ version is in the `pnpm-workspace.yaml` catalog. `CONTRIBUTING.md` says `vp run fixtures` fetches the small tier, but its default is `all` (`scripts/fixtures/args.ts`).

## Repository layout

pnpm workspace (`pnpm-workspace.yaml`: `apps/*`, `packages/*`). All packages are `private` and scoped `@oni-duplicity/*`. Libraries export their TypeScript source (`"exports": "./src/index.ts"`) and are packed with `vp pack`.

```
apps/web/                    the editor (React 19, Vite+), package @oni-duplicity/web
  src/worker/                the Web Worker that owns the save: edits, undo, view models
    save.worker.ts           Comlink API: load, view-model getters, apply/undo/redo, save
    model.ts                 public barrel for worker logic (applyEdit, view builders, helpers)
    edit-types.ts            the `Edit` union: every edit the app can make
    edits/apply.ts           `applyEdit` switch; edits/*.ts per area (duplicant, geyser, raw, bulk…)
    snapshot.ts, touched.ts  what undo captures for each edit
    describe.ts              plain-words label for each edit (the unsaved-changes list)
    views/                   view models sent to the main thread (names already resolved)
  src/app/                   shell glue: page switching, file input, download, worker fetches
  src/components/            pages (`*-page.tsx`) and feature folders (duplicants/, critters/, map/, raw/, tools/…)
  src/components/ui/         shadcn/ui components (generated, then restyled for design.md)
  src/lib/                   main-thread helpers (nav, preferences, formatting, save-client)
  src/dev/                   component gallery and seed-search dev pages
  tests/                     Vitest unit and fixture tests for worker edits
  e2e/                       Playwright specs (`*.e2e.ts`), CI only
  wrangler.jsonc             Cloudflare Workers static-assets config
packages/save-parser/        reader and writer for .sav files (no app code)
  tests/                     round-trip over every fixture, sim grid, fuzz/
packages/game-data/          IDs, names and tuning generated from the game's files
  src/generated/game-data.json   generated, committed
  scripts/                   extract-game-data, extract-names, skills/, ranching/
scripts/                     repo tasks: fetch-fixtures.ts, bench.ts, run-differential.ts (+ folders)
test-data/                   fixtures.json (manifest + SHA-256), saves/ (committed), fetched/ (git-ignored), bench-baseline.json, licenses/
docs/                        see the table above
```

## Toolchain

- **Vite+ (`vp`)**: one CLI for dev server, build (Vite/Rolldown), tests (Vitest), lint (Oxlint, type-aware with type checking), format (Oxfmt), library packing (tsdown) and the task runner. The pinned version is the `vite-plus` entry in the `pnpm-workspace.yaml` catalog. There is no ESLint or Prettier.
- **pnpm**, pinned via `devEngines.packageManager` in `package.json` (downloaded on demand). Use `vp install`, not `pnpm install`, day to day.
- **Node**: `engines` requires `>=22.18.0`. CI runs Node 24. Scripts are run as `node scripts/x.ts` (native type stripping).
- **TypeScript 7**, strict.
- One root `vite.config.ts` holds shared lint, fmt, staged, test and `run.tasks` settings. Per-package lint differences go in `lint.overrides`. Bare `vp dev` / `vp build` / `vp preview` target `apps/web` through `defaultPackage`.
- Imports: config uses `defineConfig` from `vite-plus` and tests import from `vite-plus/test`. The lint rule `vite-plus/prefer-vite-plus-imports` enforces this.
- **`vp` is often not on PATH**, especially in agent shells. Use `./node_modules/.bin/vp` (from a git worktree, the worktree's own `node_modules/.bin/vp` after `vp install`, or the main checkout's). The commands below write `vp` for short.

## Commands

```bash
vp install                     # install dependencies (also wires the pre-commit hook via `vp config`)
vp dev                         # web app at http://localhost:5173 (don't pass --port at the root, see pitfalls)
vp check                       # format + lint + type-check; must pass before every commit
vp check --fix                 # apply format and lint fixes
vp test                        # all unit tests; fixtures that aren't downloaded are skipped
FIXTURE_TIER=all vp test       # include the large saves and slow round trips
vp run fixtures                # download and verify every fetched fixture (default --tier all, ~120 MB)
vp run fixtures --tier small   # only what PR CI uses (~5 MB)
vp run fixtures --file mithro-03-late-game-cycle-1160.sav   # named files, checksums still verified
vp run bench                   # parser benchmark vs test-data/bench-baseline.json (needs the two bench saves)
vp run bench --update          # re-record this platform's baseline (see "Bench gate")
vp run differential            # compare every fixture with konove's oni-save-parser (built into .cache/oracle)
vp run -r build                # build the app and pack the libraries
pnpm run ready                 # vp check && vp run -r test && vp run -r build
vp run extract-game-data       # regenerate game-data.json from a local game install (ONI_PATH, ONI_DECOMP)
```

Fuzz knobs (`FUZZ_SCALE`, `FUZZ_SEED`, `FUZZ_DEADLINE_MS`, `FUZZ_ONLY`) are described in [CONTRIBUTING.md](CONTRIBUTING.md).

The pre-commit hook (`.vite-hooks/pre-commit`) runs `vp staged`, which runs `vp check --fix` on staged files.

### Code style and lint rules that bite

- Formatting is whatever `vp check --fix` produces: no semicolons, single quotes.
- **No source file may exceed 200 lines** (`max-lines`, an owner rule). Split by responsibility instead of disabling it. That is why the worker and tests are split into many small files (`*-helpers.ts`, `edits/*.ts`, `views/*.ts`).
- React: `rules-of-hooks` is an error. `only-export-components` warns, except in `components/ui/**` and `hooks/**`.
- Lint is type-aware and type-checks, so `vp check` catches type errors too. There is no separate `tsc` step.

## Architecture

The full picture is in [docs/architecture.md](docs/architecture.md). The short version:

### `packages/save-parser`

- Eager decode of the whole body. A cursor `Reader` over `DataView` checks every length and count, so bad input throws `ParseError(offset, context)` and never hangs. `Writer` is a growable buffer with back-patched length prefixes.
- Template values are decoded generically by type code: 64-bit integers are `bigint`, colours are bytes. Behavior "extra data" has codecs only where editors need them (`Storage`, `MinionModifiers` / `Klei.AI.Modifiers`). A codec's result is kept only if re-encoding reproduces the original bytes exactly; otherwise the bytes stay raw (`extraRaw`).
- API: `parseSave`, `writeSave`, `writeSaveParts` (the app compresses with native `CompressionStream`), `readSimGrid` (read-only), `MIN_MINOR`, `MAX_VERIFIED_MINOR`, `ParseError`.
- Version policy: major 7, minors 31–38 supported. Newer minors parse with a warning (download locked behind a preference). Older minors throw.
- **Invariant:** `writeSave(parseSave(x))` reproduces the header and decompressed body byte for byte for every fixture. Parser changes must keep the round-trip test green on the full tier.

### `packages/game-data`

Generated from a local game install by `vp run extract-game-data`. Decompile-derived data (skill tree, trait lists, geyser ranges) is transcribed in `src/*.ts` with a test that checks it against the fixtures. **Never commit decompiled game code or Klei art.** The decompile is read locally only (`ONI_DECOMP`).

### `apps/web`: the worker owns the save

- **One module worker** (`src/worker/save.worker.ts`, exposed with Comlink) holds the parsed save, the game data and the undo/redo stacks. The main thread never holds the save. The file buffer is transferred in, and the written bytes are transferred back.
- **Game data is imported only by the worker.** View models arrive with names resolved, so game data stays out of the main bundle. Pages are lazy-loaded (`src/app/page-router.tsx`).
- **Edits** are plain objects in the `Edit` union (`worker/edit-types.ts`), applied by `applyEdit` (`worker/edits/apply.ts`). An edit that can't be applied safely **throws and changes nothing**. The worker enforces the rules even if the UI already hides the option.
- **Undo/redo.** Before applying, the worker calls `snapshot(save, edit)` (`worker/snapshot.ts`). It captures what the edit can touch: the objects `touchedBy` returns, the header, custom settings, group lists and the ID counter for clone or delete. Raw edits capture only the value or array they change. Undo runs the restore closure, and redo re-applies the edit. `describeEdit` labels the entry before applying, because a delete removes the name it needs.
- **Data flow.** After every edit, undo or redo, the app refetches view models and bumps a `revision` that open panels reload on. Only page state (current page, selection, preferences) lives on the main thread.
- **No router.** The app is one screen per save. The current page is React state (`Page` in `src/lib/nav.ts`, switched in `src/app/page-router.tsx`), not a URL. So there is no router dependency and the host needs no SPA fallback. Don't add React Router or TanStack Router. The original plan's TanStack Router/Query/Table and Zustand were dropped on purpose (architecture.md, "Deviations").
- **Safety in the UI.** Newer-than-verified saves open with a banner and Download stays locked until "Allow unverified versions" is on in Preferences. Saving always downloads `<baseName>.sav`. Leaving with unsaved edits triggers the browser prompt.

## Adding or changing a save edit

This is the riskiest work in the repo: a wrong edit silently corrupts someone's colony. Nothing has been verified in game yet, so the evidence bar is high. Follow the pattern of existing write-ups: Delete loose debris, Change a geyser's type and Space POIs in [docs/progress.md](docs/progress.md), and Cloning a duplicant in [docs/open-questions.md](docs/open-questions.md#cloning-a-duplicant).

### Evidence standard

1. **Read the decompile.** Find how the game loads and uses every field you write: what it recomputes on load, what it null-checks, and what else references the object. Cite file and line (`MinionIdentity.cs:488-489`) in the write-up. Example: geyser edits must change the rolls, not the `scaled*` values, because `GeyserInstanceConfiguration` recomputes those on load.
2. **Scan every fixture.** Check that the fields exist where you expect in all ten saves (7.33–7.38, base game and DLCs), and search for every other place that references the IDs you touch: template data, stored items, state-machine blobs. Report counts per fixture. Say plainly what was not searched, for example undecoded raw bytes.
3. **Refuse unsafe cases in the worker.** If the evidence doesn't cover a case (bionics for clone, stored items for delete, a debris chunk in a move order, an unknown geyser type, a different footprint), the worker throws and changes nothing, and the UI disables the control with a hint that names the cause. Never "best effort" an edit.
4. **Address objects by stable identity** (`KPrefabID` instance IDs), not list positions that shift after an edit.
5. **Byte-level edits** (state-machine blobs, `extraRaw`) go through a copy, must keep the length, must leave every byte outside the intended fields unchanged, and are read back before being swapped in. See `worker/space-edits-bytes.ts`.
6. **Values stay in game ranges.** Clamp to what the game can produce (geyser ranges, amount maxima). Don't invent caps the game doesn't have.

### Implementation checklist

- Add the variant to `Edit` (`worker/edit-types.ts`) and its case to `applyEdit` (`worker/edits/apply.ts`, or a file under `edits/`).
- Make sure `snapshot` / `touchedBy` capture everything the edit can change, so **undo restores the save byte for byte**. New object creation or deletion also needs group lists and `settings.nextUniqueID`.
- Add a label in `describe.ts` for the unsaved-changes list.
- Expose any new read in a view model under `worker/views/` with names resolved. Keep game-data imports in the worker.
- Mark risky edits "experimental" in the UI, as the geyser type change and POI stock refill are.

### Tests a mutating feature needs ([requirements.md](docs/requirements.md#features))

- **Unit/model tests** in `apps/web/tests` (Vitest): values, clamping and refusals.
- **Fixture tests over every fixture**: edit → write → re-parse shows the intended change and nothing else, and undo is byte exact. Fixtures that aren't downloaded skip locally. Tests that need a full-tier save must fail on full-tier CI if it is missing (`Boolean(process.env.CI) && process.env.FIXTURE_TIER === 'all'`).
- **A Playwright e2e** in `apps/web/e2e`: edit through the UI, download, and assert with `expectOnlyChanged` (`e2e/helpers.ts`) that the save changed exactly where intended. You write it, but CI runs it (see Testing).

### Record it

- **`docs/progress.md`**: a dated section with what changed, the decompile and fixture evidence, the tests, what was deliberately not done, and a **Risks** list. It always includes "not verified in game" until it is.
- **`docs/open-questions.md`**: any unresolved question or assumption, as a numbered row, or a section for bigger write-ups.
- **`docs/verified-in-game.md`**: add the edit under "Waiting to be checked" or "Not yet checked in game" with concrete steps (save to use, what to note, what to expect). Only move it to the verified table after someone loads it in the real game. Never claim in-game verification you didn't do.
- **`docs/architecture.md`** if a design decision changed, and **`docs/save-format.md`** for new format knowledge or a new intentional oracle difference.

## UI conventions

- **Stack:** React 19, Tailwind CSS v4, shadcn/ui (`radix-nova` style, `apps/web/components.json`, aliases `@/components`, `@/components/ui`, `@/lib`, `@/hooks`), Radix, lucide-react icons, sonner toasts, TanStack Virtual for long lists, `@tanstack/react-table`, recharts, cmdk, vaul. Fonts are bundled with Fontsource (Rajdhani headings, Noto Sans body, JetBrains Mono for the raw tree).
- **Design direction is [docs/design.md](docs/design.md).** It is dark only, flat and square (`--radius: 0px`), with a mauve title bar per panel, slate everywhere else, and colours measured from game screenshots. Tokens live in `apps/web/src/index.css`.
- **Reuse before you build.** Use `components/ui/*` (restyled shadcn), shared pieces in `components/common*.tsx` (`CommitInput`, `NumberField`, `Hint`, `SearchPicker` and others), `page-header.tsx`, `empty-state.tsx` and `load-states.tsx`. Add a shadcn component with the shadcn CLI and then restyle it to the recipes.
- **Per-PR UI checklist** (design.md §10): no hard-coded Tailwind palette colours (`text-red-500` and the like), no `rounded-*` outside the cycle badge and avatars, `tabular-nums` for numbers, an `Empty` and a `Skeleton` state, and before and after screenshots at 1920 and 1440 for visual changes, in the PR's `## Screenshots` section (see [Screenshots in PR descriptions](#screenshots-in-pr-descriptions)).
- Desktop-first. English only (no i18n library yet).
- `src/dev/` has a component gallery for checking components in isolation.

## Testing

| Layer        | Where                                                        | Runs                                            |
| ------------ | ------------------------------------------------------------ | ----------------------------------------------- |
| Round trip   | `packages/save-parser/tests/round-trip.test.ts`              | `vp test` (large saves with `FIXTURE_TIER=all`) |
| Fuzz         | `packages/save-parser/tests/fuzz`                            | `vp test` (~500 cases)                          |
| Unit/fixture | `apps/web/tests`, `packages/*/tests`, `scripts/**/*.test.ts` | `vp test`                                       |
| Differential | `scripts/differential`, oracle pinned at a konove commit     | `vp run differential`                           |
| Bench gate   | `scripts/bench`                                              | `vp run bench`                                  |
| End to end   | `apps/web/e2e/*.e2e.ts` (Playwright, Chromium, prod build)   | **CI only**                                     |

### Fixture tiers

`test-data/fixtures.json` pins every save by SHA-256. Three owner saves (CC0) are committed in `test-data/saves/`. The rest download from the `fixtures-v1` GitHub release into the git-ignored `test-data/fetched/`.

- **small** (~5 MB): the committed saves plus konove, mithro-01 and mithro-02. PR CI uses this tier.
- **all** (~120 MB): adds mithro-03 to mithro-06 (up to 40 MB, 451 MB decompressed). Used on `main`, nightly, and PRs that change `fixtures.json`. The bionic tests need `mithro-06`.
- Release assets are never replaced. New or changed fetched fixtures go in a new release (`fixtures-v2`) with an updated `baseUrl`. See [test-data/README.md](test-data/README.md).

### End-to-end tests: CI only

**Never run Playwright locally**: not `vp -C apps/web run e2e`, not `playwright test`, and not a browser install. CONTRIBUTING.md shows local e2e commands for human maintainers, but this project's rule is that e2e runs in CI. Write or update specs, push, and read the CI result. On failure, CI uploads a `playwright-report` artifact with traces.

### Bench gate

- `vp run bench` parses and writes the 40 MB and 13 MB saves (`mithro-06`, `mithro-03`), normalizes each phase by a calibration workload, and fails a phase that is more than 30% slower than `test-data/bench-baseline.json` for this `<platform>-<arch>`. It takes about two minutes and needs a quiet machine.
- CI runs `vp run bench --require` on pushes to `main`, nightly, on fixture manifest changes, and on PRs touching `packages/save-parser`, `apps/web/src/worker/raw-search.ts`, `scripts/bench*` or the baseline.
- **Re-record a baseline only after an intended performance change**, never to make a regression pass. Locally: `vp run bench --update` on a quiet machine (median of several runs), and commit the file. For the CI runner (`linux-x64`), dispatch the CI workflow with `bench_baseline: true` and commit the uploaded artifact.

## CI

`.github/workflows/ci.yml` has one job, `ci`, on PRs, pushes to `main`, a nightly cron and manual dispatch. It runs `vp install`, then fetches and verifies fixtures (tier as above), then `vp check`, `vp test`, the bench (when triggered), `vp run differential`, `vp run -r build` and Playwright e2e. After fixtures, every step runs even if an earlier one failed, so one run reports everything.

`.github/workflows/pr-title.yml` (`pr-title`) checks that the PR title is a conventional commit. Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`. The scope is optional, and **the subject must start with a lowercase letter**. Example: `feat(web): add critter fertility`.

`main` requires a PR and green CI. Merges are **squash only**. The owner admin-merges green PRs.

Actions are pinned to commit SHAs with the version in a comment. Keep that style when adding or bumping one.

## Git and PR rules

- **Never commit to `main`.** Branch as `type/short-description` (lowercase, hyphens), for example `fix/slider-stuck-thumb` or `docs/agents-md`. Types: `feat`, `fix`, `chore`, `docs`, `refactor`, `test`, `style`, `ci`, `perf`.
- **Conventional commits** for commit messages and PR titles. Common scopes: `web`, `parser`, `game-data`, `bench`, `release`, `deps`. The PR title becomes the squash commit and the changelog line, so write it for users.
- **No co-author tags** (`Co-Authored-By`) in commits.
- **Never mention Claude, Claude Code, AI or any coding agent** in commits, branch names, PR titles, PR descriptions, review comments or issues.
- **PR descriptions use What / Why / How** (`.github/pull_request_template.md`). **No "Test plan" section.**
- **UI changes need before and after screenshots** under a `## Screenshots` heading in the PR description. Non-UI PRs leave the heading out. See below for how to host them.
- Keep PRs focused on one thing. Touch only the files your change needs, especially while other PRs are open.
- Don't push to someone else's branch, and don't force-push shared branches.
- Be critical, not agreeable. Point out flaws, risks and wrong assumptions, including the owner's. Report results faithfully: failing tests, skipped steps and unverified claims are stated as such.

### Screenshots in PR descriptions

- **Capture:** "before" from `main` and "after" from your branch, each in the dev server (`vp dev`) with the same fixture save from `test-data/saves/` loaded and the same viewport. Use a browser by hand or your agent's browser tool, not Playwright (see Testing).
- **Host:** push the images to an **orphan branch named `pr-assets/<topic>`**, one commit with no history. Existing examples: `pr-assets/page-content-width` and the older `*-screenshots` branches. These branches are the one exception to the `type/description` naming rule.
- **Never commit images to the feature branch.**
- **Link** them with `https://raw.githubusercontent.com/nomansheikh/oni-duplicity/pr-assets/<topic>/<file>.png`.
- **Never delete `pr-assets/*` or `*-screenshots` branches.** Old PR descriptions point at them.

To build the branch without switching branches in a shared checkout:

```bash
git worktree add --orphan -b pr-assets/<topic> ../pr-assets-<topic>
cp before.png after.png ../pr-assets-<topic>/
cd ../pr-assets-<topic> && git add . && git commit -m "chore: pr screenshots" && git push -u origin HEAD
cd - && git worktree remove ../pr-assets-<topic>
```

## Releases

- release-please (`release-please-config.json`, `.release-please-manifest.json`; `node` release type, `bump-minor-pre-major`, so `feat` bumps the minor below 1.0; `docs` and `chore` are hidden in the changelog).
- GitHub Actions may not open PRs in this repo, so **a maintainer opens the release PR by hand** with the release-please CLI (the exact command is in [CONTRIBUTING.md](CONTRIBUTING.md#releases)).
- That PR's required checks never run (it is created with a token that doesn't trigger workflows), so it is **merged with the admin bypass**. On merge, `.github/workflows/release.yml` tags the release.
- Releases do not deploy.

## Deploys

- **Cloudflare Workers Builds** is connected to the repo in the Cloudflare dashboard and **deploys every push to `main`** to [duplicity.noman.codes](https://duplicity.noman.codes). There are no PR previews, and GitHub Actions does not deploy.
- The build command (`pnpm exec vp run -r build`) and deploy command (`pnpm --filter @oni-duplicity/web exec wrangler deploy`) are set **in the dashboard, not the repo**. Changing them is a dashboard change.
- `apps/web/wrangler.jsonc` deploys `apps/web/dist` as Workers static assets with no Worker script, routed to the custom domain, with `workers_dev` and preview URLs off and observability on. Each deploy applies this file, so settings belong here, not as dashboard toggles. `apps/web/public/_headers` sets security headers and long caching for hashed `assets/`.
- A manual deploy, if ever needed: `vp run -r build`, then `vp exec wrangler deploy` from `apps/web`.

## Dependencies and Dependabot

- Versions live in the `pnpm-workspace.yaml` **catalog** (`catalogMode: prefer`), and packages reference them as `catalog:`. Add new dependencies to the catalog.
- Dependabot opens weekly grouped npm minor/patch updates (`chore(deps)`) and GitHub Actions updates (`ci(deps)`).
- **A `vite-plus` bump needs a manual follow-up.** The catalog aliases `vite` to the matching core package: `vite: npm:@voidzero-dev/vite-plus-core@<version>`, with `overrides: vite@*: 'catalog:'`. Bump that alias to the **same version** as `vite-plus`, run `vp install` to update `pnpm-lock.yaml`, and commit both. Otherwise `vp build` fails.
- `allowBuilds` in `pnpm-workspace.yaml` blocks install scripts that aren't needed (`jss`, `esbuild`, `workerd`). Don't enable install scripts without a reason recorded there.
- The differential oracle is built from source at a pinned commit into `.cache/oracle/`, not installed as a dev dependency, so a bump can't run new install scripts unnoticed.

## Pitfalls

- **`vp: command not found`**: use `./node_modules/.bin/vp`. A fresh worktree needs its own `vp install` first.
- **Shared checkouts.** Several people and agents may work in this repo at once, and the main checkout may have other sessions' changes in flight. Work in a **git worktree per branch** (`git worktree add .claude/worktrees/<name> -b <type>/<desc> origin/main`). **Never switch branches, stash, reset or rebase in a shared checkout.** Commit only files you changed. `.claude/` is excluded from Vitest so worktrees under it don't run twice.
- **`vp dev --port …` at the root** bypasses `defaultPackage` and serves the workspace root (404). Use bare `vp dev`, or `vp -C apps/web dev --port …`.
- **Large fixtures are heavy.** The 40 MB save decompresses to 451 MB and peaks at 3–4 GB RSS when parsed in Node. Expect slow full-tier test runs, and don't run the bench while other heavy jobs are running.
- **Fixture licensing.** Only add saves whose license allows redistribution, record the source, license and pinned URL in `fixtures.json` and `test-data/README.md`, and put the license text in `test-data/licenses/`. Never commit a save someone attached to an issue without explicit permission. Third-party code and assets go in `THIRD_PARTY_NOTICES.md`.
- **No Klei assets or decompiled code in the repo.** Portraits come from the `react-oni-duplicant` package at build time, and game data is generated or transcribed into our own tables.
- **Generated files**: `packages/game-data/src/generated/game-data.json` is regenerated, never hand-edited.
- **Load errors** are classified by regex on the `ParseError` message, because the worker boundary drops error fields (open question 16). If you change a parser error message, check `src/lib/load-error.ts`.
