# Architecture

How Duplicity is built and why. Requirements are in [requirements.md](requirements.md); unresolved items in [open-questions.md](open-questions.md). Changes to a decision here go through a PR that edits this file.

## Principles

- **The save never leaves the browser.** No server, accounts or analytics.
- **Never corrupt a save.** Unknown data round-trips byte for byte, unverified game versions open read-only, and the original file is never overwritten.
- **Degrade, don't die.** A parser gap in one behavior disables that editor, not the app.
- **Generated, not hand-typed.** Game data comes from the game's own files and registries.

## Repository

```
apps/web/                 React app (Vite+ `vp build`)
packages/save-parser/     save reader/writer (`vp pack`)
packages/game-data/       generated game data (`vp pack`)
  scripts/                extract-game-data
tools/oni-dump-mod/       dev-only ONI mod that dumps Db registries (C#, not a workspace package, never shipped)
scripts/                  fetch-fixtures and other repo scripts
test-data/saves/          fixtures: owner saves committed, large ones fetched
docs/                     this file, save format, progress, verification log
```

Packages are scoped `@oni-duplicity/*` and `private` until the parser gate passes; npm publishing is decided then.

## Toolchain

- Vite+ `1.0.0-rc.1` (Vite 8, Rolldown, Vitest 5, tsdown, Oxlint, Oxfmt), Node 24 LTS, pnpm 12, TypeScript 7.
- One root `vite.config.ts` holds shared `lint` (type-aware, with type checking), `fmt`, `staged` and `run` settings. Per-package differences go in `lint.overrides` / `fmt.overrides`; packages have no lint or fmt blocks.
- Config imports `defineConfig` from `vite-plus`; tests import from `vite-plus/test` (browser mode: `vite-plus/test/browser-playwright`).
- No ESLint or Prettier. The pre-commit hook runs `vp staged` (`vp check --fix` on staged files).
- Bare `vp dev` / `vp build` / `vp preview` at the root target `apps/web` through `defaultPackage`. Scaffold gotchas are in [progress.md](progress.md).

## `packages/save-parser`

**Model.** Mirrors oni-save-parser's structure (header, templates, world, settings, version, game objects grouped by prefab, game data), so the differential test is a plain JSON comparison and existing users of that library find a familiar shape. Intentional differences are listed in `save-format.md` (written in phase 1).

**Decoding.** Eager: every object and behavior is decoded at load. The 40 MB fixture is measured on the first day of parser work; hot paths move to lazy decoding only if it misses the 5 s budget or memory is unreasonable.

**Readers and writers.**

- One cursor-based `Reader` over `DataView`/`Uint8Array`; no generators or per-value closures.
- Each type template compiles once into a reader/writer pair that is reused for every instance.
- `Writer` is a growable `Uint8Array` (doubling) with back-patched length prefixes.
- Every length or count read is checked against the remaining bytes before allocating, so corrupt input fails fast instead of hanging or allocating gigabytes.
- zlib via `fflate` or `pako` 2, whichever wins the benchmark. The round-trip guarantee covers the decompressed body; recompressed bytes may differ.
- `parseSave` accepts an `ArrayBuffer` or `Uint8Array`; `writeSave` returns a `Uint8Array` whose buffer can be transferred.

**API.**

```ts
parseSave(buffer, { onProgress?, strictVersion?, strictBehaviors? }): SaveGame
writeSave(save): Uint8Array
getBehavior(object, name) / getGroup(save, prefab) / findObjectById(save, id)
hashString(value) / getDlcIds(save)
```

**Version policy.** Major 7, minors 31–38 are verified. A newer minor parses with `save.versionStatus = "unverified"` and a warning in `save.warnings`; with `strictVersion` it throws. An older minor throws a `ParseError` telling the user to re-save in the current game.

**Typed behaviors.** KPrefabID, MinionIdentity, MinionResume, Klei.AI.Traits, Klei.AI.Effects, Klei.AI.AttributeLevels, MinionModifiers, Health, Accessorizer, WearableAccessorizer, PrimaryElement, Storage, Geyser, SaveGame, ColonyAchievementTracker and the bionic components. Everything else stays generic: template data plus raw trailing bytes. Types are version-aware, with optional fields where versions differ.

**Behavior failures.** With `strictBehaviors: false` (the app), a typed behavior that fails to parse is kept as raw bytes, round-trips unchanged, and adds a warning naming the behavior; its editor is disabled. With `strictBehaviors: true` (tests and CI), it throws.

**Errors.** `ParseError` carries the byte offset, section, group and behavior name.

## `packages/game-data`

Generated, never hand-typed. `vp run extract-game-data` reads a local game install (path from `ONI_PATH`, with macOS and Windows defaults) and writes TypeScript modules that are committed alongside the script.

| Source                                         | Provides                                                                                    |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `StreamingAssets/strings/strings_template.pot` | English names and their i18n keys (for example `STRINGS.DUPLICANTS.TRAITS.AGGRESSIVE.NAME`) |
| `StreamingAssets/elements/*.yaml`              | Elements (SimHashes) and their properties                                                   |
| `tools/oni-dump-mod`                           | IDs, categories, exclusions and DLC requirements from the live `Db` registries              |
| Decompiled `Assembly-CSharp.dll`               | Research reference and cross-checks; kept in a git-ignored folder, never committed          |

The dump mod hooks `Db.Initialize`, writes JSON and is run once in base-game mode and once in Spaced Out mode, because some content registers in only one. It is a maintainer tool for game updates; contributors never need it.

Each entry has `id`, English `name`, `nameKey`, the required DLC IDs and `category`. Coverage: elements, geyser types, traits (positive/negative, exclusions, DLC), skills and skill groups (including Rocketry, Bionic and Swimming), effects, accessories (hair, head, eyes, mouth, body parts), critters and morphs, difficulty and custom game settings (including Bionic Wattage and Demolior Impact), DLCs.

No Klei art is extracted or committed.

## `apps/web`

**Stack.** React 19, TypeScript strict, Tailwind CSS v4 + shadcn/ui, TanStack Router, TanStack Query, Zustand + Immer, TanStack Table + TanStack Virtual, react-i18next, Comlink.

**Worker.** One module worker (`new Worker(new URL("./save.worker.ts", import.meta.url), { type: "module" })`) owns the parsed save, the game data and the undo stack. The main thread never holds the save.

```ts
interface SaveService {
  load(
    buffer: ArrayBuffer,
    fileName: string,
    onProgress: (p: number) => void,
  ): Promise<LoadSummary>;
  query<Q extends Query>(query: Q): Promise<QueryResult<Q>>;
  apply(command: Command): Promise<ApplyResult>; // { revision, changed }
  undo(): Promise<ApplyResult>;
  redo(): Promise<ApplyResult>;
  diffSummary(): Promise<DiffSummary>;
  save(): Promise<Uint8Array>; // transferred
}
```

The buffer is transferred into the worker and the written bytes are transferred back.

**Commands and undo.** A command is `{ type, target, payload }`. Its handler mutates the save and returns inverse operations (path plus old value); undo applies them and redo re-applies the command. Every change bumps a `revision`. The raw editor emits generic `raw.set`, `raw.insert` and `raw.remove` commands into the same stack. The diff summary is computed from the command log, grouped by target entity.

**Data flow.** TanStack Query wraps worker queries with the revision in the query key, so an edit refetches only what depends on it. Zustand + Immer holds UI state only: selection, filters, dialogs, the modified flag, the revision and undo/redo availability.

**Game data** is imported only by the worker. View models arrive with display names resolved, and pickers request their option lists (filtered by the save's DLCs) from the worker, so game data never enters the main bundle.

**Features** live in `src/features/<feature>/`:

- `model/`: pure logic that runs in the worker (command handlers, view-model builders);
- `hooks/`: main-thread hooks that call the worker through TanStack Query;
- `components/`: React UI.

Shared shadcn components live in `src/components/ui`.

**Routing.** TanStack Router with hash history (`/#/duplicants/42`), since GitHub Pages has no SPA fallback. Every route except load and settings redirects to load when no save is open.

**Versions and safety.**

- Unverified versions open read-only with a banner; the "allow unverified versions" setting enables saving at the user's risk.
- Saving always downloads `<baseName>.sav`; the original file is never overwritten. The save dialog shows the diff summary and a "back up your save first" warning.
- Leaving the page with unsaved edits triggers the browser's unsaved-changes prompt. Session restore via IndexedDB is post-MVP.
- Editors whose edits are not yet verified in-game show an "unverified" badge.

**Errors.** A `ParseError` shows a friendly message with a collapsible details section (offset, section, group, behavior) and a "copy details for a bug report" button. A worker crash shows an error boundary with a reload button.

**UI.** Desktop-first: designed for 1280 px and wider, usable down to 768 px. Dark theme by default, light supported, stored in `localStorage`. Tailwind v4 through `@tailwindcss/vite` with the `@/*` alias in tsconfig and the Vite config; `shadcn init` is tried first and `components.json` is written by hand if it does not detect Vite+. What worked is recorded here.

**i18n.** English bundled; other locales are lazy-loaded JSON.

## Testing

| Layer        | What                                                                                       | Where                |
| ------------ | ------------------------------------------------------------------------------------------ | -------------------- |
| Parser units | Every primitive, template type code and extra-data parser                                  | `vp test` (Node)     |
| Round trip   | Header and decompressed body byte-equal after `writeSave(parseSave(x))`                    | every fixture        |
| Differential | JSON equal to oni-save-parser, with documented exclusions                                  | every fixture        |
| Fuzz         | Truncation and bit flips (`fast-check`) end in a `ParseError` within a time limit          | small fixtures       |
| Commands     | apply → undo restores the original; apply → write → re-parse changes only the target paths | per mutating feature |
| Components   | Vitest browser mode (real Chromium, real workers) + Testing Library                        | `apps/web`           |
| E2E          | Playwright: load fixture → edit → save → re-parse the download → assert                    | per feature          |
| Bench        | `vp run bench`: parse/write time per fixture; separate peak-memory script                  | local and CI         |

Playwright uses the installed Chrome locally (`channel: "chrome"`) and installs Chromium in CI.

**In-game verification.** Before each release, edited saves are generated into the git-ignored `test-data/verify/` with a checklist; the owner loads them in the game, and [verified-in-game.md](verified-in-game.md) records the edit, game version, DLCs, date and verifier.

## CI, fixtures and releases

- **CI** (`voidzero-dev/setup-vp`, pinned to an exact release): `vp install`, `vp check`, `vp test`, `vp build`, `vp pack` on every push and PR.
- **Fixtures:** the owner's two saves are committed in `test-data/saves/`. The konove save and the six mithro saves (about 120 MB) are mirrored to the `fixtures-v1` prerelease with their licenses; `test-data/fixtures.json` pins every file by SHA-256. `vp run fixtures [--tier small|all]` downloads into the git-ignored `test-data/fetched/` and verifies checksums; CI caches that folder by manifest hash. PRs run the small tier (owner saves, konove, mithro 01 and 02); pushes to `main` and a nightly job run all of them.
- **Bench gate:** a CI job benchmarks `main` and the PR head back to back on the same runner and fails on a slowdown over 30%.
- **Repository rules:** `main` requires a PR and green CI (admin bypass allowed); squash merge only; a CI check requires a conventional PR title (`feat`, `fix`, …).
- **Dependabot** for npm and GitHub Actions.
- **Releases:** release-please maintains a release PR and CHANGELOG on `main`. Publishing a release deploys `apps/web` to GitHub Pages (`base: "/oni-duplicity/"`); merges alone do not deploy. Set up with the app shell (phase 5); the first public release, v0.1, follows the core editors (phase 6).

## Delivery

Phases follow the brief, split into focused PRs; work stops after each PR for review.

1. **Toolchain (rest of phase 2):** CI, repository rules, fixtures script and release, community files (CONTRIBUTING, Code of Conduct, SECURITY, issue and PR templates), Dependabot, THIRD_PARTY_NOTICES.
2. **Research (phase 1):** decompile, `save-format.md`, check the differential oracle.
3. **Parser (phase 3)**, with **game data (phase 4)** interleaved while parser PRs are in review.
4. **App shell (phase 5):** shadcn, layout, load/save, worker, undo/redo, i18n, overview, Pages deploy and release-please.
5. **Core editors (phase 6):** duplicants (including bionic), geysers, raw editor, difficulty → **v0.1**.
6. **More editors (phase 7):** critters, materials/storage, space, research.
7. **Polish (phase 8):** accessibility, empty/error states, README with a supported-versions table.
8. **Stretch (phase 9):** map view and tile editing.

## Deviations from the brief

- **No portrait preview.** Rendering portraits needs Klei's sprite art, which the MIT repo does not redistribute; appearance is edited with labeled pickers and color swatches.
- **Game data also comes from a dev-only mod dump** of the live `Db` registries, because effects, accessories and DLC gating cannot be extracted reliably from decompiled code alone.
- **Newer minor versions open read-only**; the "allow unverified versions" setting enables saving.
- **Pages deploys on tagged releases**, not on every push to `main`.
- **Large fixtures are mirrored** to this repo's GitHub release instead of fetched from upstream.
- **TanStack Query** is added to the stack for worker data fetching.
