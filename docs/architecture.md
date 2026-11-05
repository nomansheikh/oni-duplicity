# Architecture

How Duplicity is built and why. Requirements are in [requirements.md](requirements.md); unresolved items in [open-questions.md](open-questions.md). Changes to a decision here go through a PR that edits this file.

## Principles

- **The save never leaves the browser.** No server, accounts or analytics.
- **Never corrupt a save.** Unknown data round-trips byte for byte, unverified game versions cannot be downloaded without opting in, and the original file is never overwritten.
- **Degrade, don't die.** Data the parser cannot decode stays raw and round-trips unchanged.
- **Generated, not hand-typed.** Game data comes from the game's own files.
- **Keep it simple.** This is a weekend project; the stack stays small until a feature needs more.

## Repository

```
apps/web/                 React app (Vite+ `vp build`)
packages/save-parser/     save reader/writer (`vp pack`)
packages/game-data/       generated game data (`vp pack`)
  scripts/                extract-game-data
scripts/                  fetch-fixtures and other repo scripts
test-data/                fixture manifest, owner saves, licenses; large saves are fetched
docs/                     this file, requirements, open questions, progress, verification log
```

Packages are scoped `@oni-duplicity/*` and `private`; npm publishing is decided later.

## Toolchain

- Vite+ `1.0.0-rc.1` (Vite 8, Rolldown, Vitest 5, tsdown, Oxlint, Oxfmt), Node 24 LTS, pnpm 12, TypeScript 7.
- One root `vite.config.ts` holds shared `lint` (type-aware, with type checking), `fmt` (no semicolons, single quotes), `staged` and `run` settings. Per-package differences go in `lint.overrides`.
- Config imports `defineConfig` from `vite-plus`; tests import from `vite-plus/test`.
- No ESLint or Prettier. The pre-commit hook runs `vp staged` (`vp check --fix` on staged files).
- Bare `vp dev` / `vp build` / `vp preview` at the root target `apps/web` through `defaultPackage`. Scaffold gotchas are in [progress.md](progress.md).

## `packages/save-parser`

Our own reader and writer. [oni-save-parser](https://github.com/RoboPhred/oni-save-parser) and its forks were used as references for the format; no code is shared. `vp run differential` compares every fixture against konove's fork, built from source at a pinned commit (see [save-format.md](save-format.md)).

**Model.** Header (build version, JSON game info), type templates, the `world` and `Game+Settings` sections, raw sim data, the `KSAV` version, game objects grouped by prefab, and `Game+GameSaveData`. Every object keeps its position, rotation, scale and behaviors; each behavior holds its template data and any trailing "extra" bytes.

**Decoding.** Eager: the whole body is decoded at load. The 40 MB fixture (451 MB decompressed) parses in about 1.6 s in Node and about 6 s in the browser. `vp run bench` measures each phase (see Performance below).

**Readers and writers.**

- One cursor-based `Reader` over `DataView`/`Uint8Array`. Every length or count is checked against the remaining bytes, so corrupt input fails fast with a `ParseError(offset, context)`.
- `Writer` is a growable `Uint8Array` (doubling) with back-patched length prefixes.
- Template values are read generically by type code; 64-bit integers are `bigint`, colours are bytes.
- Format details worth knowing: collection byte lengths exclude the count; `null` collections are written as length 0, count −1; dictionaries store values before keys; hashes are Klei's lowercase SDBM.
- zlib via `fflate`. `writeSave` compresses at level 1; the app uses the browser's native `CompressionStream('deflate')` through `writeSaveParts`, which is several times faster on large bodies. The round-trip guarantee covers the header and decompressed body; compressed bytes may differ.

**Extra data.** Behaviors whose trailing bytes the editors need have codecs: `Storage` (stored items, recursively) and `MinionModifiers` / `Klei.AI.Modifiers` (amounts and sicknesses). A codec's result is kept only if re-encoding it reproduces the original bytes exactly; otherwise the bytes stay raw.

**API.**

```ts
parseSave(buffer, { onProgress?, strictVersion? }): SaveGame
writeSave(save): Uint8Array
writeSaveParts(save): { head: Uint8Array; body: Uint8Array } // body uncompressed
readSaveParts / parseBody / writeBody                          // lower-level pieces
MIN_MINOR, MAX_VERIFIED_MINOR, ParseError
```

**Sim grid.** `readSimGrid(save.simData)` decodes the cell grid: a `SIMSAVE\0` header with version (14 or 15), width and height, 9 bytes not decoded yet, then 16 bytes per cell (element SimHash, temperature in K, mass in kg, 4 bytes not decoded yet). The grid has a one-cell border, so game cell (x, y) is grid cell (x + 1, y + 1); duplicant positions confirm it. Disease and later sections are not read. The grid is only read, never written, so the round trip is unaffected.

**Version policy.** Major 7, minors 31–38 are supported. A newer minor parses with a warning in `save.warnings` (with `strictVersion` it throws). An older minor throws a `ParseError` telling the user to re-save in the current game. 7.33 saves store the header DLC as `dlcId` (a string); 7.34+ store a `dlcIds` array.

## `packages/game-data`

Generated, never hand-typed. `vp run extract-game-data` reads a local game install (`ONI_PATH`, with the Steam defaults for macOS and Windows) and writes `src/generated/game-data.json`, which is committed.

| Source                                         | Provides                                                                              |
| ---------------------------------------------- | ------------------------------------------------------------------------------------- |
| `StreamingAssets/strings/strings_template.pot` | English names and descriptions                                                        |
| `Managed/Assembly-CSharp.dll`                  | Exact IDs (for example `BingeEater`), read from the assembly's UTF-16 string literals |
| `StreamingAssets/elements/*.yaml`              | Elements and their SimHashes                                                          |

Coverage: traits, attributes, skill groups, amounts, effects, personalities, geysers, elements, critters, techs and game settings. Geyser types and their ranges (output, eruption and activity timing) are floats in code, which the extractor cannot read, so `src/geyser-types.ts` transcribes them from `GeyserGenericConfig`; a test checks them against every geyser in the fixtures. Skills come from [konove/oni-save-parser](https://github.com/konove/oni-save-parser) (MIT, attributed in `src/skills.ts`). The assembly is only read locally; decompiled code is never committed.

## `apps/web`

**Stack.** React 19, TypeScript strict, Tailwind CSS v4, shadcn/ui (radix-nova), Comlink, TanStack Virtual, next-themes, sonner. Fonts are bundled with Fontsource.

**Worker.** One module worker owns the parsed save, the game data and the undo stack; the main thread never holds the save. The file's buffer is transferred in and the written bytes are transferred back.

```ts
load(buffer, fileName, onProgress): Summary
summary() / duplicants() / critters() / geysers() / materials() / techs() / ...  // view models
rawChildren(path, offset?, limit?)                                              // raw editor
apply(edit) / undo() / redo(): EditStatus
save(): Uint8Array
```

**Edits and undo.** An edit is a plain `{ type, ...fields }` object (`setDuplicantName`, `addTrait`, `setItemMass`, `rawSet`, …) applied by `applyEdit` in `worker/model.ts`. Before applying, the worker snapshots what that edit can touch (the target's behaviors, the header, custom game settings, and for clone or delete the group lists and ID counter; raw edits snapshot only the value or array they change). Undo restores the snapshot; redo re-applies the edit.

**Traits.** `game-data/src/trait-info.ts` transcribes the trait lists of `TUNING/DUPLICANTSTATS` (good, bad, congenital, gene shuffler, stress, joy, need, bionic bug, special) with each trait's rarity, DLC, excluded traits and excluded interests, plus the `StartWith` booster traits the game builds at runtime for bionics. The add-trait list hides traits the save's DLC or the duplicant's model rules out (a bionic only ever rolls a bug and a booster trait; the standard lists are for standard duplicants), and blocks a trait that clashes with a trait or interest the duplicant has, naming the cause. The game itself checks exclusions only while it rolls a new duplicant (`MinionStartingStats.AreTraitsMutuallyExclusive`); `Traits.OnSpawn` adds every saved trait ID that exists and matches the save's DLC, with no exclusion check. So the editor blocks conflicts by default but never touches conflicting traits a save already has; it flags them instead. Pasting a profile between a bionic and a standard duplicant is refused for traits, interests, skills and appearance. The worker enforces the model and DLC rules itself: `addTrait` and a pasted profile's traits throw, changing nothing, for a trait the duplicant's model or the save's DLC rules out. The model is read from the identity, else the prefab, in one helper.

**Data flow.** After every edit, undo or redo, the app refetches its view models from the worker and bumps a `revision` that open panels use to reload. Only the page state (current page, selection, preferences) lives on the main thread.

**World map.** The worker decodes the sim grid once per save, crops one asteroid using its `WorldContainer` offset and size, and transfers element indices, temperatures and masses; the page colors them on a canvas, so switching between element, temperature and mass views needs no worker call.

**Geysers.** The game saves each geyser's rolls and the values they give (`scaled*`), but recomputes the values from the rolls and the type's range when it loads a save. An edit sets the roll and writes the matching value, clamped to the type's range; geysers of unknown types can only be renamed.

**Deleting loose debris.** Loose debris is an element chunk saved in a group named after its element (`Wolframite:0`); stored items live inside a `Storage` behavior and are never offered for deletion. `deleteDebris` removes several chunks as one edit (one undo step), addressed by `KPrefabID` instance ID rather than by `Element:index` (indexes shift after each delete, so a click on a stale list could hit another chunk), and refuses anything that is not a loose chunk or no longer exists. It also refuses items that a move order points at. The "Move here" tool saves a `MovePickupablePlacer` whose `CancellableMove` behavior lists the `KPrefabID` instance IDs of the marked items, and the item's own `Movable` behavior has `isMarkedForMove`. In the decompiled `CancellableMove.OnCancel` the ID is resolved with `Ref<Movable>.Get()` and `ClearMove()` is called on the result without a null check, so a leftover ID can throw when the order is cancelled. Nothing else that was checked saves a reference to a loose item's ID: `Pickupable` saves only `deleteOffGrid`, `Clearable` saves a flag on the item itself, and reservations and fetch errands are not saved. Across the ten fixtures, no decoded value refers to a loose chunk except those lists (3 chunks in `mithro-05` and `mithro-06`). Undecoded raw bytes were not checked.

**Unsaved changes.** The worker describes each edit in plain words as it is applied (before a delete removes the name it needs) and keeps the label with its undo entry; the header lists them.

**Game data** is imported only by the worker. View models arrive with names resolved, so game data stays out of the main bundle. Pages are lazy-loaded.

**Portraits.** Duplicant portraits are drawn from the sprites and layout data in the [react-oni-duplicant](https://www.npmjs.com/package/react-oni-duplicant) package, which the build imports; no art is committed here. It covers the older accessories (hair 1–33, heads 1–4, eyes 1–5), so newer ones fall back to initials.

**Versions and safety.**

- Newer-than-verified saves open with a banner, and **Download** stays locked until "Allow unverified versions" is turned on in Preferences.
- Saving always downloads `<baseName>.sav`; the original file is never overwritten.
- Leaving the page with unsaved edits triggers the browser's unsaved-changes prompt.

**UI.** Desktop-first dashboard layout (sidebar, header with undo/redo and download). Light, dark and system themes, stored in `localStorage`. No router: GitHub Pages has no SPA fallback and the app is a single screen per save.

**i18n.** English only for now.

## Testing

| Layer      | What                                                                                                     | Where                              |
| ---------- | -------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| Round trip | Header and decompressed body byte-equal after writing a parsed save back                                 | every fixture                      |
| Fuzz       | Corrupt or truncated saves end in a `ParseError`, never a hang or crash                                  | `apple-park`                       |
| Fixtures   | Manifest parsing, tiers and checksum verification                                                        | `scripts/`                         |
| Unit       | Edit models, e.g. geyser rolls and ranges                                                                | `apps/web/tests`, package `tests/` |
| End to end | Load a fixture in Chromium → edit through the UI → download → re-parse → only the intended paths changed | `apps/web/e2e`                     |
| Manual     | Load → edit → download → reload, in Chrome                                                               | before each PR                     |

**In-game verification.** Edited saves are loaded in the real game before a feature is called verified; [verified-in-game.md](verified-in-game.md) records the edit, game version, DLCs, date and verifier.

## CI, fixtures and releases

- **CI** (`voidzero-dev/setup-vp`, pinned): `vp install`, `vp check`, `vp test`, `vp run -r build` and the Playwright suite on every push and PR, plus a nightly run.
- **Fixtures:** the owner's saves are committed in `test-data/saves/` (CC0-1.0). The konove save and the six mithro saves are mirrored to the `fixtures-v1` prerelease with their licenses; `test-data/fixtures.json` pins every file by SHA-256. `vp run fixtures [--tier small|all]` downloads into the git-ignored `test-data/fetched/` and verifies checksums; CI caches that folder by manifest hash. PRs run the small tier unless they change `fixtures.json`; pushes to `main`, manifest changes and the nightly job run all of them.
- **Repository rules:** `main` requires a PR and green CI (admin bypass allowed); squash merge only; a CI check requires a conventional PR title.
- **Dependabot** for npm and GitHub Actions.
- **Releases:** release-please keeps a release PR and CHANGELOG on `main` (`feat` bumps the minor version below 1.0). Publishing a release builds the tagged commit and deploys `apps/web` to GitHub Pages; merges alone do not deploy. The build uses relative asset paths (`base: './'`), so it works under `/oni-duplicity/`. The release PR is opened with the default `GITHUB_TOKEN`, which does not trigger other workflows, so its required checks never run; merge it with the admin bypass.

## Performance

`vp run bench` (`scripts/bench.ts`) parses and writes the 40 MB and 13 MB saves, each in its own Node process: one warm-up, then the median of five iterations of four phases (read + inflate, parse body, write body, deflate at level 1). It also reports peak RSS, read before the calibration buffers are allocated.

| 40 MB save (median) | Apple M2 Max, Node 26 | GitHub runner (4-core EPYC), Node 24 |
| ------------------- | --------------------- | ------------------------------------ |
| read + inflate      | 1.6 s                 | 1.7 s                                |
| parse body          | 1.6 s                 | 3.3 s                                |
| write body          | 2.7 s                 | 6.6 s                                |
| deflate (`fflate`)  | 4.0 s                 | 5.8 s                                |
| peak RSS            | 3.3 to 4.1 GB         | 2.6 GB                               |

The 13 MB save peaks at about 1.0 to 1.5 GB on the Mac and 0.9 GB on the runner. Memory is dominated by the 451 MB decompressed body, the copy the writer builds and the decoded object graph (947 MB of live heap after parse). Peak RSS on macOS varies by about 20% between runs with GC timing.

The gate fails a phase whose time, divided by a calibration workload timed in the same process, grows more than 30% over its baseline. The calibration streams a 256 MB buffer and allocates many small objects, so it tracks memory speed the way the parser does, and a sample is taken after every pass. Baselines live in `test-data/bench-baseline.json` per `<platform>-<arch>` (ratios do not transfer between machines): `darwin-arm64` is the median of 5 local runs, `linux-x64` the median of 3 runs of the CI runner. Run-to-run spread of the normalized phase times was at most ±5.7% locally and ±5.3% on three runners (two CPU models), so the 30% threshold leaves wide headroom and raw times were not needed. A phase that looks regressed is re-measured once and fails only if it regresses again. A stale file size, a zero or missing baseline time, a worker that times out (10 minutes) or is killed, or a missing baseline for the platform under `--require` are errors, not passes. CI runs `vp run bench --require` on pushes to `main`, nightly, on manifest changes, and on PRs that touch the parser or the bench, which add about 2.7 minutes. To record a baseline for a new runner, dispatch the CI workflow with `bench_baseline` set and commit the uploaded artifact. After an intended change, run `vp run bench --update` on a quiet machine and commit the new baseline.

**Targets not met.** Parsing the 40 MB save meets the 5 s target on the Mac (1.6 s) and on the CI runner (3.3 s). Saving does not: on the Mac, writing the body takes 2.7 s and `fflate` deflate another 4.0 s, about 6.7 s in all; on the runner, 6.6 s and 5.8 s, about 12 s. The browser uses native `CompressionStream`, which `progress.md` measured at about 7 s for this save. Whether the target covers compression is an open question ([open-questions.md](open-questions.md) #15).

## Delivery

1. **Toolchain:** CI, repository rules, fixtures, Dependabot. Done.
2. **Parser and game data.** Done.
3. **Editor:** app shell, overview, duplicants (including bionic, portraits and colony-wide actions), critters, geysers (including output and timing), materials, research, space, game settings, world map, raw editor, preferences. Done; not yet verified in game.
4. **v0.1:** in-game verification of the main edits, then the first release.
5. **Later:** changing a geyser's type, more languages, editing tiles on the map, duplicant cloning.

## Deviations from the original plan

- **Smaller stack.** No TanStack Router, Query, Table or Zustand, and no i18n library: plain React state and a worker call per view were enough.
- **No component tests yet.** The round-trip test over every fixture, the fuzz tests and the differential test against konove's oni-save-parser (a clone-on-demand script, not a dev dependency, so the lockfile stays untouched) are the parser's safety net; Playwright covers the editor end to end.
- **No dump mod.** IDs come from string literals in `Assembly-CSharp.dll` instead of a mod that dumps the live `Db` registries.
- **No typed behaviors.** Template data is decoded generically; only the extra data the editors need has codecs.
- **Portraits are shown**, using react-oni-duplicant's sprites instead of committing any art.
- **Newer minor versions open editable**, but downloading them needs the "allow unverified versions" preference.
- **Geyser ranges are transcribed**, not generated: see `packages/game-data`.
- **The bench gate is calibrated, not absolute.** It compares each phase against a per-platform committed baseline, scaled by a fixed memory-bound workload timed in the same run. It cannot catch a slowdown that also slows the calibration, and the save-time target is not met. See Performance.
- **Geyser ranges are transcribed**, not generated: see `packages/game-data`.
