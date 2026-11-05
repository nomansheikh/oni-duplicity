# Progress

## Toolchain gate — 2026-09-27

`vp install`, `vp check`, `vp test`, `vp build` and `vp pack` all pass on the empty scaffold.

```
$ vp toolchain
Vite+ toolchain (local)

vite-plus@1.0.0-rc.1
├── depends on @voidzero-dev/vite-plus-core@1.0.0-rc.1
│   ├── bundles vite@8.3.1
│   │   └── uses rolldown@1.2.11
│   │       ├── compiles oxc@0.151.0
│   │       └── compiles oxc-resolver@11.24.3
│   ├── bundles rolldown@1.2.11
│   │   ├── compiles oxc@0.151.0
│   │   └── compiles oxc-resolver@11.24.3
│   └── bundles tsdown@0.23.0
├── depends on vitest@5.0.1
├── depends on oxlint@1.85.0
├── depends on oxlint-tsgolint@7.0.2003
├── depends on oxfmt@0.70.0
└── compiles vite-task (built 2026-09-26T05:51:50Z, revision 7d69d6577ecf6bd83deee32186de59918a712873)
```

Node 24.21.0, pnpm 12.6.0, TypeScript 7.0.2.

### Scaffold notes

- Created with `vp create vite:monorepo`, `vp create vite:library` (×2) and `vp create vite -- web --template react-ts`. `--directory` only works with built-in templates; `create-vite` takes the name as a positional and `vp create` places it under `apps/` itself.
- The `vite:library` template in rc.1 writes `pack.dts: { tsgo: true }`, which fails type-checking against tsdown 0.23 (`dts.tsgo` is now an options object, and tsgo is picked automatically for TypeScript 7). Replaced with `dts: true`.
- `defaultPackage` in the root `vite.config.ts` only applies to bare commands. `vp dev --port 5173` bypasses it and serves the workspace root (404); use `vp dev` or `vp -C apps/web dev --port …`.
- The root must declare `@types/node` from the catalog. Without it the root resolves the latest `@types/node` and pnpm installs a second peer variant of `vite-plus`.
- The app's lint block moved to `lint.overrides` in the root config, and its `vite.config.ts` imports `defineConfig` from `vite-plus`.

## Parser and editor — 2026-09-27

- Every fixture (7.33–7.38, base game and all DLCs) round-trips its decompressed body byte for byte, including the 451 MB body of the largest save.
- The 40 MB save parses in about 2.4 s in Node and loads in about 6 s in Chrome. Saving it takes about 7 s with the native `CompressionStream` versus 28 s with `fflate`.
- Checked by hand in Chrome: edit → download → reload for duplicants, critters (clone, tame), materials, research, game settings, asteroids and raw edits; undo and redo after each.
- A production build served from `/oni-duplicity/` loads saves and portraits. Lazy-loading the pages cut the main chunk from 688 kB to 399 kB (122 kB gzipped).
- Nothing is verified in the game yet.

## Geyser edits follow the rolls — 2026-11-05

- The decompiled `GeyserInstanceConfiguration` recomputes `scaled*` from the rolls whenever a save is loaded (`didInit` is not saved), so the first version of the geyser editor, which changed only `scaled*`, would most likely have been undone by the game.
- Edits now set the roll and write the matching value, clamped to the type's range. The ranges are transcribed into `packages/game-data/src/geyser-types.ts`; every game-rolled geyser in the ten fixtures matches them exactly.
- Four geysers in the owner's colony sit at their type maximums regardless of their rolls, most likely from a mod. The editor flags them.
- Next: in-game check of a geyser edit; e2e tests.
- Risk: the decompile's game build is unknown. If a build keeps the saved values instead, the edits still hold, since both are written.

## Review fixes for the save editor — 2026-11-05

- A bulk edit that fails partway is now rolled back before the error surfaces, so a half-applied change can no longer reach a download without an undo entry. The undo snapshot already covered everything the bulk actions touch (duplicant behaviour data and extra data).
- Undoing a debug-flag edit no longer adds a `debugWasUsed` key to a save that lacked one.
- The map refuses a world whose offset or size falls outside the saved grid, and the map page shows the reason.
- New tests cover the rollback, the debug flag, each bulk action (write, parse, compare which paths changed) and the map on every fixture.

## End-to-end tests — 2026-11-05

- Playwright suite in `apps/web/e2e/`: each test loads a fixture, edits through the UI, downloads the save and re-parses it with the save-parser. `expectOnlyChanged` then asserts that the diff against the original is exactly the intended paths and nothing else.
- `diffSaves` also compares `templates`, and for arrays of different lengths it reports each added or removed index (`path/<i>`) next to `path/length`, so a test expecting a length change has to account for the items.
- Coverage (45 tests):
  - colony rename, sandbox and debug flag;
  - undo/redo and the unsaved-changes list;
  - duplicant name, gender, interests, experience, appearance, traits, skills, attributes, amounts and effects (add, remove, cycles), and pasting part of a profile;
  - every colony-wide action: relieve stress, fill needs, master skills, set every attribute;
  - bionic power bank and gear oil;
  - critter tame, wild, clone and delete;
  - geyser value, clamp and rename;
  - materials mass, temperature and bulk edits;
  - research, one tech and everything;
  - asteroid rename and discover;
  - a difficulty setting;
  - raw edit, plus array remove and duplicate.
- The suite runs in about 65 s locally (45 passed, twice in a row).
- CI runs it in the `ci` job after the build.
- Risks:
  - The bionic test needs the 40 MB full-tier fixture, so it is skipped on PRs and runs only on full-tier CI (`main` and nightly). There it fails instead of skipping when the fixture is missing (`CI` set and `FIXTURE_TIER=all`).
  - Deleting a critter left no reference in the decoded data of `beautiful-galaxy`: no decoded value refers to any critter id, whereas duplicant ids are referenced 5,244 times. Undecoded raw bytes were not checked, so confirm in game.
- Next: parser acceptance (bench, fuzz, differential).

## Stories page — 2026-11-05

- New read-only Stories page lists the six story traits (Mega Brain Tank, Critter Manipulator, Lonely Minion, Fossil Hunt, Morb Rover Maker, Hijacked Headquarters) with state, asteroid and the cycle each state was reached.
- Source: `StoryManager._stories` (`StoryInstance`: story ID, world ID, state, `StoryTelemetry` cycle stamps), decoded template data on the `SaveGame` object, and `QuestManager` for the Lonely Minion and Fossil Hunt quests. Quest hashes and the story table are transcribed from `Database.Stories` and `Database.Quests` into `packages/game-data/src/stories.ts`.
- Machine progress that lives in state machine bytes (for example the species the Critter Manipulator has scanned) is not read; the page shows the `Activatable` flag of the Mega Brain Tank, Critter Manipulator and Hijacked Headquarters instead.
- Only the Lonely Minion quests appear in the test saves. The Fossil Hunt quest is read the same way but is untested against a save that has its quest instance.
- The machine flag is read only from copies standing inside the story's own asteroid. Quests are shown only when exactly one quest owner holds them; a state value the editor does not know shows as unknown.
- Editing is not offered; open question 17 records what it would take.

## Parser benchmark and regression gate — 2026-11-05

- `vp run bench` times read + inflate, parse body, write body and deflate for the 40 MB and 13 MB saves (one warm-up, median of five, each save in its own process) and prints a table with peak RSS. It skips with a message when the saves are not downloaded.
- The gate compares each phase's time divided by a memory-bound calibration workload (256 MB buffer stream plus many small allocations, sampled after every pass) against `test-data/bench-baseline.json`, keyed per `<platform>-<arch>`, and fails above +30%. A phase that looks regressed is measured again and fails only if it regresses twice. Stale sizes, zero or non-finite baseline times, a worker timeout or kill, and a missing platform baseline under `--require` are errors. `vp run bench --update` rewrites the baseline for the current platform.
- CI runs `vp run bench --require` on pushes to `main`, nightly, on manifest changes, and on PRs touching the parser or the bench (about 2.7 minutes, fetching just the two saves). Dispatching the CI workflow with `bench_baseline` records a baseline on the runner and uploads it as an artifact; the `linux-x64` baseline was recorded that way.
- Measured, 40 MB save, median: Apple M2 Max (12 cores, 32 GB, Node 26.13.0, quiet machine) read + inflate 1.6 s, parse 1.6 s, write 2.7 s, deflate 4.0 s, peak RSS 3.3 to 4.1 GB. GitHub runner (4-core AMD EPYC, 16 GB, Node 24.22.2): 1.7 s, 3.3 s, 6.6 s, 5.8 s, peak RSS 2.6 GB. The 13 MB save: Mac 0.44, 0.43, 0.59, 1.1 s; runner 0.49, 0.88, 1.5, 1.6 s.
- Spread of the normalized phase times across runs: at most ±5.7% over 5 local runs and ±5.3% over 3 CI runs on two CPU models (raw times: ±4.5% and ±3.5%). Both are far below 30%, so the gate uses the calibrated ratio, which also halved the noise on a loaded Mac (raw ±27 to 42%, normalized ±17 to 21%).
- Parse meets the 5 s target on both machines. **Saving does not:** write body plus deflate is about 6.7 s on the Mac and about 12 s on the runner with `fflate` at level 1. Whether the target covers compression is open question #15; the assumption is "not met".
- The older "28 s with `fflate`" figure above was measured in the browser and is not reproduced here; its settings are not recorded. In Node on the Mac, `fflate` takes 3.7 s at level 1 and 5.1 s at level 6 (the default) for the 40 MB body, so the level alone does not explain 28 s; the gap to the browser is unexplained.
- Next: decide how to meet the save target (see #15), and look at the 2.6 to 4.1 GB peak, since the browser tab limit is the real constraint.
- Risks: the calibration only partly tracks the parser, so a change that slows both is invisible. Runner hardware varies (two EPYC models in three runs, with little effect so far). The Linux baseline reflects 3 runs, so refresh it if the gate flaps. A noisy machine can still fail twice in a row.

## Differential test against oni-save-parser — 2026-11-05

- `vp run differential` compares every fixture with konove's oni-save-parser (`3bb6076`, built from source into `.cache/oracle`, not a dependency) on Node 24: 0 real disagreements across all 10 fixtures (7.33–7.38). Differences and the oracle's `Klei.AI.Modifiers` `DiseaseInstance` defect are in [save-format.md](save-format.md); open question 1 is resolved.
- Each fixture runs in its own child process (oracle peak memory up to 3.7 GB on the largest save; capped at 6 GB).
- Time on this machine, oracle / ours: apple-park 0.2 / 0.06 s; beautiful-galaxy ×2 1.1 / 0.2 s; konove-save-game 1.1 / 0.2 s; mithro-01 0.2 / 0.06 s; mithro-02 1.2 / 0.2 s; mithro-03 7.8 / 1.2 s; mithro-04 16.6 / 2.7 s; mithro-05 16.8 / 2.7 s; mithro-06 27.8 / 4.1 s.
- Whole run: small tier about 8 s warm and 12 s with a cold oracle build (about 4 s); all tiers 97 s.
- CI: the step runs after the tests, with the same tier as the fixtures, and caches `.cache/oracle` by the hash of `scripts/differential/oracle.ts`.
- Gaps: no fixture has a non-empty sickness list on `Klei.AI.Modifiers` (and only two on `MinionModifiers`); 7.28–7.32 are not covered; the oracle cannot confirm anything against the game.
- A unit test (`scripts/differential/compare.test.ts`) checks that normalized equal values pass and tampered values fail, using synthetic objects.

## Parser fuzz tests — 2026-11-05

- `packages/save-parser/tests/fuzz` mutates `apple-park.sav` with a seeded PRNG and requires every case to end in a `ParseError`, or in a parse that writes back, re-parses its own output and writes the same bytes again. A `ParseError` from the writer or from re-parsing our own output is a bug, as is anything else (`TypeError`, `RangeError`, a raw zlib error, a hang, out of memory) counts as a bug.
- Seven regions: whole-file truncation, header flips, template flips, compressed-body flips, and, on the decompressed body, truncation, flips in the world and settings data, and flips in the game objects and game data. Body flips mostly avoid opaque payloads such as sim data.
- Cases run in `node:worker_threads` workers with a 5 s deadline; a hung worker is terminated and the case is retried once in a fresh worker before it counts as a hang; a crash or out-of-memory (256 MB old-generation cap, which does not cover typed arrays) also counts as a failure. Failures are grouped by error and print the seed and mutation, and `FUZZ_ONLY` replays one case regardless of scale.
- The default run is about 500 cases in roughly 12 s. At `FUZZ_SCALE=20` (10,000 cases, 3 to 4.5 minutes) one case failed: a flipped type byte in the templates leaves a collection type without its element type, and `readCollection` throws a `TypeError` instead of a `ParseError` (`FUZZ_SEED=big2 FUZZ_ONLY=templates#105`). It is not fixed in this change.
- Fault injection: removing the bounds check in `Reader` produced grouped `RangeError` failures, an infinite loop in the header reader produced a `timeout` failure, and a body that stops re-parsing produced a `reparse` failure, so the harness does detect bugs. All changes were reverted.
- Gaps: one fixture, and no well-formed but hostile inputs such as huge valid counts or lengths.
- Next: the differential test against oni-save-parser.

## Test run — 2026-11-05

- Root `vp test` no longer collects tests under `.claude/`, so agent worktrees can't fail the run. The app and package configs don't set `test.exclude`, so they needed no change.

## Load/save polish — 2026-11-05

- Autosave: saves whose header says `isAutoSave` get an "Autosave" badge in the header and a note that the game's autosave rotation may overwrite an edited autosave. The note names `gameInfo.originalSaveName` (a field of `SaveGame.GameInfo` in the decompile, present in the fixtures) and `Summary` now carries it. The download name is unchanged.
- Load errors: a friendly title (not an ONI save, unsupported version, truncated or corrupted, or unknown) picked from the parser's message, plus a collapsible "Details" section with the message, byte offset and stack, and a copy button. Errors cross the worker as plain `Error`s, so the offset is read back from the message.
- "Download save" now opens a confirm dialog: distinct changed targets ("3 duplicants, 1 geyser, colony settings"), the edit labels, and a "Back up your original save first" warning. Each history entry in the worker carries a category and key (`editTarget` in `describe.ts`). The post-download toast no longer repeats the backup advice.
- The tab title starts with "• " while there are unsaved edits.
- Tests: unit tests for the grouping and error classification, and e2e for the dialog (cancel, confirm), grouping, the title, autosave, a truncated file and a non-save file. No fixture is an autosave, so the autosave e2e rewrites the header of `beautiful-galaxy` and loads that.
- Risk: the "not an ONI save" versus "truncated" split is a heuristic on the parser's message, since the worker boundary drops `ParseError`'s fields.
