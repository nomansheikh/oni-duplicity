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

## UI dialogs and load screen (design v2) — 2026-11-05

- `load-states.tsx`: the drop zone, loading and error states sit in a `Card` with a title bar ("Load game", "Loading", "Load failed" on a red bar), over an inset dashed drop area with a large icon, a `text-h2` title and a large button. Loading uses the `task` progress meter. The drag-over state turns the dashed border orange.
- `save-dialog.tsx`: the backup warning is a `well` block with the title in the warning colour, filenames in code chips, and the edit list in a sunken field. Cancel is the dark secondary button.
- `preferences-dialog.tsx`: the Theme setting is removed, because the app is dark only (design.md section 1). The shell's own theme toggle button is in `App.tsx`/`site-header` and is left to the shell session.
- `dlc-badge.tsx`: DLC badges use `Badge` variants (dlc, oxygen, power, plant, water) instead of hard-coded Tailwind palette colours.
- No other behaviour change; text, roles and names are unchanged. Before and after screenshots are in `docs/screenshots/ui-dialogs`.

## UI component library (design v2, phase 1) — 2026-11-05

- Rewrote the theme in `apps/web/src/index.css` from the sampled v2 palette: dark only, radius 0, shadcn variables mapped onto surface, title-bar, tab, button, text-tier, status, meter and category tokens. Added `panel`, `title-bar`, `well`, `inset-layer`, `tip-game`, `btn-game`, `tab`, `chip` and `field-game` utilities.
- Fonts are now Rajdhani (headings) and Noto Sans (body) through `@fontsource`; Barlow and Chakra Petch are removed. The `dark:` variant always applies, so the existing theme switch no longer changes anything.
- Restyled the primitives the app uses, keeping them shadcn and `cva`: button (new `accent` variant), card (`panel` and `well` variants, header is the mauve title bar), tabs, badge (status, resource and element colour variants, `stat`), input, select, checkbox, switch, slider, table, dialog, tooltip, dropdown, popover, sheet, separator, scroll area, kbd, empty and toggle group.
- `Progress` has `variant="blocks" | "xp" | "task" | "gauge"` and `tone="good" | "warn" | "bad"`, built to the meter spec (20 beveled cells, XP bar, in-world task bar with dormant and now marker, storage gauge with ticks and over-max cap). `meterTone(kind, pct)` returns the tone for amounts, health and stress. The slider matches the gauge. Also added `Item variant="need"` (vitals row) and `Badge variant="bare"` (colony stat), a bottom-shade bevel on tabs, buttons and toggles, and a flat `#272c3d` tooltip.
- Dev gallery at `/?gallery`. It is imported only when `import.meta.env.DEV` is true, so the production build contains no gallery code.
- No behaviour change. The e2e specs select by role, name, label and `data-sidebar`, none of which changed. Screenshots of the gallery, Overview and Geysers are in `docs/screenshots/ui-library/`.
- Known: `apps/web/tests/geysers.test.ts` (fixture geyser ranges) fails locally because the fetched fixtures are absent; it does not touch the UI.
- Next: the app shell and page layouts.

## UI pages, batch A: Overview, Research, Settings, Map (design v2, phase 3) — 2026-11-05

- Overview: the four stat cards are framed `Card`s with a title bar and an icon-plus-number `Badge variant="bare"`; average stress adds a `Progress variant="blocks"` meter. The achievements state uses `Badge` `good` and `warn`.
- Research: progress is a `Progress variant="task"` with a `64 / 112` readout; tech tiles sit on `well` colour in a 1px ink grid.
- Game settings: every setting is a `well` block; the locked state is a `stat` badge.
- World map: the element list and ramp legend use the grey `legend` colour with square swatches, the cell info is a `well` block and the map frame is square with an ink outline.
- Text uses the shared type scale (`type-h1` for the stat numbers, `type-label`, `type-small`, `type-caption`).
- Only the four page files changed. No behaviour change: every role, name, label and test id is kept. Before and after screenshots are in `docs/screenshots/ui-pages-a/`.
- Known: `apps/web/tests/geysers.test.ts` still fails locally without the fetched fixtures.
- Next: batch B pages once their feature PRs land.

## Stories page — 2026-11-05

- New read-only Stories page lists the six story traits (Mega Brain Tank, Critter Manipulator, Lonely Minion, Fossil Hunt, Morb Rover Maker, Hijacked Headquarters) with state, asteroid and the cycle each state was reached.
- Source: `StoryManager._stories` (`StoryInstance`: story ID, world ID, state, `StoryTelemetry` cycle stamps), decoded template data on the `SaveGame` object, and `QuestManager` for the Lonely Minion and Fossil Hunt quests. Quest hashes and the story table are transcribed from `Database.Stories` and `Database.Quests` into `packages/game-data/src/stories.ts`.
- Machine progress that lives in state machine bytes (for example the species the Critter Manipulator has scanned) is not read; the page shows the `Activatable` flag of the Mega Brain Tank, Critter Manipulator and Hijacked Headquarters instead.
- Only the Lonely Minion quests appear in the test saves. The Fossil Hunt quest is read the same way but is untested against a save that has its quest instance.
- The machine flag is read only from copies standing inside the story's own asteroid. Quests are shown only when exactly one quest owner holds them; a state value the editor does not know shows as unknown.
- Editing is not offered; open question 17 records what it would take.

## Critter amounts from the DLCs — 2026-11-05

- The critter editor now bounds every amount by the game's own maximum, read from the decompile (`packages/game-data/src/critter-amounts.ts`), instead of a guessed 0 to 100:
  - **Constants** in `Database/Amounts.cs`: wildness, fertility, incubation, viability, scale growth, milk production, quill growth, beckoning (all 100), moisture (100), mucus (10) and temperature (10,000 K).
  - **Trait modifiers** in each prefab's config: age (the lifespan), calories (the stomach size) and hit points, for 58 critters; babies use their adult's. A robot's battery (sweep bot 9,000, scout 180,000, Morb 180,000, Fetch Drone 120,000) comes the same way.
- The Frosty Planet, Prehistoric Planet, Bionic Booster and Spaced Out critters now show scale growth, milk, beckoning, moisture, mucus and robot batteries with proper names. An amount is editable only when the save has the DLC its prefab needs.
- The worker refuses a value that is not finite, clamps to `0..max`, and refuses an amount whose maximum is not confirmed. Undo restores the same bytes.
- Unconfirmed amounts are shown read only with the reason. Hit points of six critter families are in that group (question 22).
- Tests: every critter in every fixture sits at or below its confirmed maximum, the DLC amounts of the colony and of `apple-park` show their maxima, clamping and non-finite values, and byte-exact undo. Beckoning and the robot batteries are checked against the full-tier fixture (`FIXTURE_TIER=all`). One end-to-end spec edits scale growth through the stats sheet.

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

## Raw editor search and add item — 2026-11-05

- Whole-tree search: the worker walks every value of the save in tree order (`worker/raw.ts`) and returns the first 200 matches with their paths.
  - Matches by key name; by path substring when the text contains `.`, `[` or `]` (a plain word as a path match would hit everything below a key of that name); optionally by primitive value. Byte arrays are leaves.
  - It runs in slices of about 20 ms and yields between them, so a newer query cancels the one in flight (the editor also debounces keystrokes by 350 ms).
  - Timing in Node on the 40 MB `mithro-06-maximum-cycle-4770` save (29 million values): key search 0.5 s, key plus value search 0.7 s, a value search that matches nothing 1.8 s (the worst case: every value visited). A numeric value query that matches nothing converts every number to text and is slower; the browser adds the slice yields on top.
  - Clicking a result opens every ancestor (each level loaded far enough to include the next step), scrolls to the row and highlights it.
- Paging: children still load 500 at a time, with an explicit "Load N more" and "Load all" row. The loaded-rows filter is gone, replaced by the search.
- Add item: appends a zeroed element built from the save's own template definitions (`rawDefaultItem`), offered on the array row and on its items ("Add item to this array").
  - Only for arrays reached through a template: the world, settings and game data roots and each behavior's template data. The header JSON and hand-decoded extra data have no declared element type, so a guess could write a save the game cannot read; those rows show a disabled "Add item".
  - Byte arrays and dictionaries are not offered: bytes stay read-only (now shown with a "read-only" badge), and a dictionary entry needs an unused key.
- Tests:
  - unit: key, path and value matches, the limit and truncation, cancellation, reveal, add item and undo;
  - fixture: adding an item to an addable array changes only that array after write and re-parse, for every fixture of the tier;
  - e2e: search for a deep key, jump to it and edit it; add item to an array of objects and of strings with `expectOnlyChanged`; the disabled state on the header.
- Review fix: "add item" is now offered only when every template reachable from the element type exists in the save. Types the parser writes by hand (`System.Guid`, `CellEventInstance`, `Spacecraft`, `GameplayEventInstance`, `Ref`1[[...]]`, `UnityEngine.Color32`) have no template, so the first version offered arrays whose new item made `writeSave` throw. A test now adds an item to every distinct addable array shape (world, settings, game data and every behavior's template data) in each fixture, writes and re-parses the body, and checks that undo restores identical bytes. Search ids no longer repeat across page remounts, and a cancel only reaches a running search.
- Risks:
  - Arrays that the game keeps in step with another array (parallel arrays such as the conduit flow `serializedIdx` and `versionedSerializedContents`) get out of step when one is extended. The raw editor's warning covers this; nothing here checks it.
  - Not verified in game.

## Delete loose debris — 2026-11-05

- The Materials sheet could already delete one loose chunk with `deleteObject`. This adds the missing parts:
  - `deleteDebris { ids }`: one edit for any number of chunks, so one undo step. The ids are `KPrefabID` instance IDs, not `Element:index` positions, because positions shift after every delete and a second click on a list that had not refreshed yet could delete a different chunk. The worker throws if an ID is gone and changes nothing. The sheet also disables every delete control until the list for the latest revision has loaded. Undo restores every chunk at its original position in its group.
  - "Delete selected" and "Delete all loose" with a confirm dialog that shows the count and mass (and how many were skipped).
  - Checkboxes on loose rows; stored rows never get a delete control, and the worker refuses stored items, buildings and critters.
- Safety check (decompile and all ten fixtures): nothing that was checked saves a loose item's `KPrefabID` instance ID except the move-order list in `CancellableMove.movables`. Counts of decoded references to loose element chunks, not counting each chunk's own ID: 0 in `beautiful-galaxy`, `beautiful-galaxy-build-744825`, `apple-park`, `konove` and `mithro-01` to `mithro-04`; 2 (Oxylite) in `mithro-05`; 1 (Liquid Sulfur) in `mithro-06`. The game does not null-check those IDs when a move order is cancelled.
- So a chunk with `Movable.isMarkedForMove`, or whose ID is in any move-order list, cannot be deleted. The trash button is disabled with a hint, bulk delete skips it, and the worker throws. The same guard now covers `deleteObject`, which previously had none.
- Tests: model, undo and refusal tests in `tests/debris.test.ts`, run on every fixture (delete three chunks of the busiest element, write, re-read, compare with the raw save minus those objects; undo is byte exact); move-order refusal on `mithro-05` and `mithro-06`; five e2e tests (one, selected, all, cancel, undo, plus the move-order case on the 40 MB save).
- Risks:
  - Not tried in game. Undecoded raw bytes were not searched for references.
  - Deleting a chunk deletes its mass from the world; the world grid is untouched.

## Materials page on the v2 components — 2026-11-05

- The Materials table and the element sheet use the v2 components and type scale. State badges take the game's element colours (gas cyan, liquid blue, solid tan). Loose and stored amounts are `bare` badges with the unit and the place count in a caption, and the total is in the good green. The element name uses the label type.
- Deleting loose debris looks dangerous: a red "Loose debris" strip holds the destructive "Delete selected" and "Delete all loose" buttons, each row's trash button is destructive, and the confirm dialog has a warning icon with the mass in red. Behaviour, labels and roles are unchanged.
- The sheet was only about 280px wide because the sheet primitive's side width rule beat the page's width class, which pushed the mass and temperature columns off screen. The page now overrides it on the same variant.
- Not run: the Playwright e2e suite (CI runs it). `geysers.test.ts` fails on this branch (8 matches, 20 expected); it is untouched by this change.

## Raw data page on the v2 components — 2026-11-05

- `raw-page.tsx` restyled onto the game-native components and the type scale; no behaviour, test id, role or name changed.
- Tree: dark inset well, 44 px rows, indent guides, key column aligned so values line up, container keys bold white, leaf keys dimmed, values in monospace coloured by kind (string `good`, number `info`, boolean `gold`, bytes `warn`), selection highlight in the game's orange.
- Search: results panel with a field-coloured header, a `key` / `path` / `value` chip per hit, and the path split into a dimmed route and a bold final key.
- Warning banner and hints use the `warn` token and `type-small` / `type-caption`.
- Screenshots: `docs/screenshots/raw-page/before.jpg`, `after.jpg`.
- The highlighted row keeps the `ring-primary` class because the e2e tests select on it; `ring-warn!` overrides its colour.

## Change a geyser's type (experimental) — 2026-11-05

- Geysers can change to another type of the same footprint (gas 2×4, liquid 4×2, molten 3×3) when every DLC the type needs is active in the save. The worker refuses anything else, whatever the UI offers.
- The edit moves the object to the `GeyserGeneric_<type>` group (created beside the old one if the save has none; an emptied group is dropped, as the game does), sets the type hash, recomputes the five `scaled*` values from the unchanged rolls, sets the object's own temperature, and renames it when it still carries the old type's name. The emitter, element, germs and codex entry are rebuilt by the game from the type hash, so nothing is saved for them.
- Checked against the decompile: `SaveManager.Load` finds groups by name in the prefab map (order does not matter, an unknown prefab drops the group's objects), and no saved field outside the group name mentions the prefab. Checked against the fixtures: every one of the 156 geysers in the ten saves has the temperature and prefab name its type predicts, including the unmodded Mithro saves.
- The Geyser Control mod's `newconfig` copies are left alone; the sheet warns when a geyser carries them.
- Undo restores the group list and every object byte for byte.
- Risks: nothing is verified in game; the state machine keeps its saved phase, which may disagree with the new timings until the next transition; the deprecated `NiobiumGeyser` prefab is excluded.
- Next: the in-game check in `docs/verified-in-game.md`; retyping unspawned geysers (open question 15).

## Space points of interest and starmap edits — 2026-11-05

- The Space page lists every Spaced Out point of interest: type, starmap location, stock and capacity, time to refill, artifact state and whether the colony has found it.
- Four edits, each with undo and a line in the unsaved-changes list:
  - destination recoverable mass (base game), clamped to the destination type's range (`availableMass`, 0 to max minus min);
  - destination analysis: discovered writes a score of 50, analyzed writes 100 and clears `analyzeDestinationID` when that destination was the scan target;
  - reveal the known starmap: every existing `m_revealPointsByCell` value below 100 becomes 100. Cells missing from the dictionary stay hidden, because adding one would change the length;
  - POI stock refill, labelled experimental in the UI: the same float is written to the instance field and the `poiCapacity` parameter inside the state machine bytes.
- Where the data lives: a POI's location is plain template data (`m_location`); its type hash, two rolls, stock and artifact charge are inside the `StateMachineController` bytes, one serialized state machine instance each for `HarvestablePOIStates` and `ArtifactPOIStates`. Reveal state is `ClusterFogOfWarManager`'s `m_revealPointsByCell` in the save game object's state machine bytes. A spawned artifact waits in a `StarmapHexCellInventory` object on its tile (7.37 and later).
- Byte edits go through one function that works on a copy, throws if the length changed or any byte outside the expected floats differs, and reads the result back before swapping it in. Undo puts the old array back by reference (`snapshot.ts` now keeps `extraRaw`).
- Not done on purpose: artifact recharge, artifact string and harvest count, the POI state name, research opportunities, and revealing cells that are not in the dictionary (see open question 21).
- The type tables (`apps/web/src/lib/space-pois.ts`, `space-destinations.ts`) are transcribed from the decompile and live in `apps/web`, not `packages/game-data`. Every saved POI type hash matches a transcribed id.
- Tests: reader checks over every fixture; edit tests for each edit (value, clamping, only the intended fields or bytes change, undo restores the body byte for byte); Playwright specs for the table and each edit (run by CI).
- Risks:
  - Nothing here has been loaded in the game. The POI stock edit is the riskiest: the game may rebuild the state from the state machine parameter or the field, and both are written, but whether it moves between `idle` and `recharging` on load is unchecked.
  - The artifact fields moved between versions (see open question 20); the reader accepts both layouts, but only 7.33, 7.36, 7.37 and 7.38 saves were checked.
  - Stock is shown against a capacity worked out from the saved roll and the transcribed range. A wrong range would show a wrong capacity; the fixtures never exceed it.
  - The base-game destination edits use the `SpaceDestinationType` masses of this decompile; a type the table does not know cannot be edited.

## Duplicant traits and list — 2026-11-05

- `packages/game-data/src/trait-info.ts` holds the trait lists of `DUPLICANTSTATS` (rarity, DLC, excluded traits and interests, model) and the pure rules `traitConflicts` and `traitUnavailable`. Counts: positive 42, negative 28, congenital 6 (with `None`), genetic 4, bionic 17 (7 bugs, 10 booster traits), stress 6, joy 7, need 7, special 24.
- Traits tab: colour-coded category badges; the add-trait list leaves out traits the save's DLC or the duplicant's model rules out, and shows clashing traits blocked with the reason; conflicts already in a save are flagged and left alone.
- `RoboDancer` was `Robodancer` in the generated catalog, and the congenital and booster traits were missing; `game-data` now corrects and adds them.
- Duplicant list: search by name, trait or interest; sort by save order, name, arrival, experience, skills mastered, stress and model.
- Profile paste: a bionic profile onto a standard duplicant (or the reverse) is refused for traits, interests, skills and appearance, in the dialog and in the worker. Profiles now record their model.
- Tests: unit tests for the rules, a fixture test that adding an allowed trait changes only that duplicant's traits (standard and bionic), a test that every fixture trait is in the table, and Playwright tests for adding, blocked traits, the bionic list, paste, search and sort.
- Risks: no exclusion rule is verified in game; the model rules for stress, joy and special traits are inferred from the decompile and fixtures (see open questions).

## Bionic amount caps — 2026-11-05

- The sliders used guessed caps (gunk 200, tank 200, battery 1000 kJ). They now use the decompiled game's maximums, and the worker clamps `setAmount` on a bionic duplicant to `0..max`.
- Maximums (Kupie/ONI_Decomp, `Assembly-CSharp`):
  - `BionicOil`: 200 kg, fixed. `Database/Amounts.cs` (`CreateAmount("BionicOil", 0f, 200f, ...)`) and `BionicOilMonitor.OIL_CAPACITY`.
  - `BionicGunk`: 80 kg, fixed. `GunkMonitor.GUNK_CAPACITY`, used by `Amounts.BionicGunk`.
  - `BionicOxygenTank`: 240 kg, fixed. `BionicOxygenTankMonitor.OXYGEN_TANK_CAPACITY_KG` = 2400 s × `DUPLICANTSTATS.BIONICS.BaseStats.OXYGEN_USED_PER_SECOND` (0.1).
  - `BionicInternalBattery`: per duplicant, 480,000 J + 120,000 J per electrobank slot above 4 (`Amounts.cs`; `BionicBatteryMonitor.UpdateCapacityAmount`). The slot count is the `BionicBatteryCountCapacity` attribute (base 4), and the only source is the `ExtraBionicBatteries` perk (+2) of skill `BionicsC3` (`Database/Skills.cs`, `Database/SkillPerks.cs`). So the max is 480,000 J, or 720,000 J with `BionicsC3`.
- Correction to the audit: the battery max does not depend on the electrobanks installed in the duplicant's storage. It depends on the mastered `BionicsC3` skill. All three mithro-06 bionic duplicants have it, which is why the fixture value 569,163 J exceeds 480,000 J.
- Load behaviour: `Modifications.Deserialize` writes the saved `value` field directly, so an over-max value is not clamped on load. `AmountInstance.SetValue` clamps to `GetMax()` on the next update. The editor clamps itself; the slider still widens to a saved value that is over the max, for display only.
- Tests: unit tests for the caps, mithro-06 fixture tests (each amount at its max writes only that value, over-max and negative values clamp), and an e2e spec in the bionic block. That block only runs on full-tier CI.
- Review follow-ups: `setAmount` throws on NaN or Infinity and changes nothing; removing `BionicsC3` clamps the stored battery to 480,000 J in the same edit, so one undo restores both.
- Not verified in game.

## DLC page and the Demolior timer — 2026-11-05

- New DLC page (`dlc-page.tsx`, readers in `worker/dlc.ts`). It shows only sections the save has:
  - Demolior (`DLC4_ID` and an active `LargeImpactor` event): event start, difficulty, impact cycle, now and remaining cycles, impactor health (read only), and an experimental impact-cycle edit.
  - World mixing (`CurrentMixingLevelsBySetting`), read only. Absent in older saves, which then show nothing.
  - Geothermal (`DLC2_ID`): controller state and each vent's progress, recent mass and available material, read only.
- Cycles use `GameUtil.GetCurrentTimeInCycles()`: `GameClock.cycle + timeSinceStartOfCycle / 600 + 1`. The header's `numberOfCycles` is the integer cycle and is not used.
- The impact time is `eventStartTime × 600 + GetImpactTime()` seconds, but only vanilla reads it. Findings from the decompile (`LargeImpactorStatus`, `LargeImpactorEvent`, `ClusterMapLargeImpactor`, `ClusterTraveler`):
  - A Spaced Out impactor copies the arrival into the `ClusterMapLargeImpactor.Instance` state machine (`ArrivalTime`, `Speed`) when it is created, and then flies by `ClusterTraveler.TravelETA` (`Speed` and the move potential). Editing `eventStartTime` alone would not postpone it.
  - The edit therefore rewrites three values: `eventStartTime`, `ArrivalTime`, and `Speed`, which is scaled by old over new time left so the hexes left stay the same. The three values are the only bytes that change; a fixture test pins that.
  - The save keeps no other copy. `AgeInCycles()` is unused; `largeImpactorLandedCycle` is only written after landing.
  - The `DemoliorImminentImpact` tag (10 cycles) lives in the cluster layout's definition (`ClusterLayout.clusterTags`); the save keeps only the layout id, not its tags. So without the impactor's saved flight data the real impact time can't be known: the page shows the difficulty's time marked as assumed and the edit is read only with a reason. With flight data, a saved arrival that disagrees with the difficulty is shown as saved.
- The edit is only offered when a Spaced Out impactor has a `ClusterTraveler`, a readable `ClusterMapLargeImpactor` blob and time left; vanilla saves, missing objects and arrived impactors are read only with a reason.
- The state machine blob (`StateMachineController.extraRaw`) is read by anchoring on the type name and range-checking every length. If it does not read cleanly the edit is disabled. Undo snapshots now keep `extraRaw` too (one line in `snapshot.ts`).
- Impactor health is shown read only: `LargeImpactorStatus.sm.Health` is an int parameter, max 1000 (`LargeImpactorConfig.HEALTH`).
- World mixing names come from the ids; the game's string tables are not in the decompile. Level `GuranteeMixing` (sic) is shown as Guaranteed.
- The edit is clamped to at least one cycle from now.
- Tests: unit and fixture tests for each reader (Konove for Demolior, mithro-06 for geothermal, every fixture for mixing), the byte-level edit test, undo, a vanilla-shaped save, an unreadable blob; e2e in `dlc.e2e.ts` (Konove is small tier; the geothermal spec follows the bionic full-tier pattern).
- Synthetic in-memory saves cover the absent, destroyed, arrived, missing-traveler, vanilla and imminent-arrival layouts without any fixture (Konove is small tier, so CI also runs the fixture tests).
- Risks: the edit is unverified in game (see `verified-in-game.md`). Only one fixture (Konove) has an active impactor; the synthetic blobs are built from the same layout the reader assumes, so they check the logic, not the layout.

## Bionic boosters and power — 2026-11-05

- Bionic duplicants get a "Boosters & power" tab (read only): the installed boosters by slot, each electrobank with its charge in joules, and the colony's remote workers with their dock and charge.
- The worker reads all of it in `worker/bionic.ts`, behind a new `bionics()` call. Nothing in `model.ts` changed.
- Tests cover the slot parsing, an empty result on a save without bionics, and the `mithro-06` fixture (full tier only; on full-tier CI a missing fixture fails instead of skipping).
- Unlocked slots (base 2 plus skill perks) and bank places (4, or 6 with BionicsC3) are computed from the mastered skills, and the internal battery is shown against its maximum. Risks: the battery storage is taken to be the second `Storage` on the duplicant (shown as unrecognised if it holds anything but electrobanks); traits that change the slot or bank attributes are not seen; booster names show as ids. Writing is not attempted; what it would need is in [open-questions.md](open-questions.md).
