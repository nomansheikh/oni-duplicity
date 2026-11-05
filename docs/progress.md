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

## UI component library (design v2, phase 1) — 2026-11-05

- Rewrote the theme in `apps/web/src/index.css` from the sampled v2 palette: dark only, radius 0, shadcn variables mapped onto surface, title-bar, tab, button, text-tier, status, meter and category tokens. Added `panel`, `title-bar`, `well`, `inset-layer`, `tip-game`, `btn-game`, `tab`, `chip` and `field-game` utilities.
- Fonts are now Rajdhani (headings) and Noto Sans (body) through `@fontsource`; Barlow and Chakra Petch are removed. The `dark:` variant always applies, so the existing theme switch no longer changes anything.
- Restyled the primitives the app uses, keeping them shadcn and `cva`: button (new `accent` variant), card (`panel` and `well` variants, header is the mauve title bar), tabs, badge (status, resource and element colour variants, `stat`), input, select, checkbox, switch, slider, table, dialog, tooltip, dropdown, popover, sheet, separator, scroll area, kbd, empty and toggle group.
- `Progress` has `variant="blocks" | "xp" | "task" | "gauge"` and `tone="good" | "warn" | "bad"`, built to the meter spec (20 beveled cells, XP bar, in-world task bar with dormant and now marker, storage gauge with ticks and over-max cap). `meterTone(kind, pct)` returns the tone for amounts, health and stress. The slider matches the gauge. Also added `Item variant="need"` (vitals row) and `Badge variant="bare"` (colony stat), a bottom-shade bevel on tabs, buttons and toggles, and a flat `#272c3d` tooltip.
- Dev gallery at `/?gallery`. It is imported only when `import.meta.env.DEV` is true, so the production build contains no gallery code.
- No behaviour change. The e2e specs select by role, name, label and `data-sidebar`, none of which changed. Screenshots of the gallery, Overview and Geysers are in `docs/screenshots/ui-library/`.
- Known: `apps/web/tests/geysers.test.ts` (fixture geyser ranges) fails locally because the fetched fixtures are absent; it does not touch the UI.
- Next: the app shell and page layouts.

## UI app shell (design v2, phase 2) — 2026-11-05

- Replaced the sidebar layout with the game's shell: a header bar, a top tab strip and a framed content panel.
- Header: brand, a save menu (colony name, file name, cycle badge; open another or close), the DLC badges, changes popover, undo/redo, download and preferences. With no save open it shows Open a save.
- Tab strip: the restyled shadcn `Tabs`, one tab per page with an icon in the page's category colour and a count where the page has one. It scrolls sideways at narrow widths; at 390px the page does not overflow.
- The theme toggle is gone from the header (dark only). Routes, the undo/redo shortcuts and button names are unchanged.
- e2e: `goTo` now clicks `getByRole('tab', { name })`; no spec changed.
- Screenshots in `docs/screenshots/ui-app-shell/`. Page internals are untouched.
- Known: `components/ui/sidebar.tsx` is now unused and can be deleted once the page sessions land.
- Next: page layouts.
